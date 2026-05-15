// ============================================================
// R4.1.0: derived 任务统计 helpers
//
// 设计：所有"积分 / 任务计数 / 长任务 / 完美任务"都从源数据 (Tasks +
// Evaluations + Points) 即时算出，不在 Pet 表存 cache 字段（详见 R4.0.0
// types/index.ts 注释）。R4.3.0 之后如性能不够再加 stored cache。
//
// 提供 buildUnlockContext(db, now) 一次性构造完整 UnlockContext，
// UI / wishingPool / skillCard 引擎共用。
// ============================================================

import type { FatboyDB } from '../db';
import type { Task, Evaluation } from '../types';
import {
  type UnlockContext,
  type Window,
  type WindowedCounts,
  type StarLevel,
  emptyContext,
  emptyWindowedCounts,
  isLongTask,
  isPerfectEval,
} from './unlockCondition';
import { isoWeekString, todayString } from './time';

// ------------------------------------------------------------
// 时间窗口判定
// ------------------------------------------------------------

function startOfWindow(window: Window, now: Date): number {
  if (window === 'lifetime') return 0;
  const y = now.getFullYear();
  const m = now.getMonth();
  if (window === 'week') {
    // ISO 周的周一 00:00（与 streak 系统口径一致）
    const day = now.getDay() || 7;            // 周日 0 → 7
    const monday = new Date(y, m, now.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  }
  if (window === 'month') {
    return new Date(y, m, 1).setHours(0, 0, 0, 0);
  }
  if (window === 'quarter') {
    const qStart = Math.floor(m / 3) * 3;
    return new Date(y, qStart, 1).setHours(0, 0, 0, 0);
  }
  return 0;
}

function inWindow(ts: number | undefined, window: Window, now: Date): boolean {
  if (!ts) return false;
  return ts >= startOfWindow(window, now);
}

// ------------------------------------------------------------
// 终身积分（derived）
// ------------------------------------------------------------

/**
 * 终身积分 = 所有正向 PointsEntry 的 delta 之和
 * 即使被兑换扣除（负 delta）也不算入 lifetime（仅 spendable 减少）
 */
export async function getLifetimePoints(db: FatboyDB): Promise<number> {
  const all = await db.points.toArray();
  let sum = 0;
  for (const p of all) {
    if (p.delta > 0) sum += p.delta;
  }
  return sum;
}

// ------------------------------------------------------------
// 任务窗口计数
// ------------------------------------------------------------

/**
 * 在 evaluatedTasks + 对应 evaluation 上做一遍单次扫描，
 * 按 window 切片汇总。比逐窗口分别扫高效。
 */
export function aggregateCounts(
  evaluatedTasks: Task[],
  evalByTaskId: Map<string, Evaluation>,
  now: Date,
): Record<Window, WindowedCounts> {
  const result: Record<Window, WindowedCounts> = {
    week:     emptyWindowedCounts(),
    month:    emptyWindowedCounts(),
    quarter:  emptyWindowedCounts(),
    lifetime: emptyWindowedCounts(),
  };
  const windows: Window[] = ['week', 'month', 'quarter', 'lifetime'];

  for (const t of evaluatedTasks) {
    const ev = t.evaluationId ? evalByTaskId.get(t.evaluationId) : undefined;
    const star = (t.difficulty as StarLevel | undefined) ?? 'bronze';
    const long = isLongTask({ actualStartedAt: t.actualStartedAt, completedAt: t.completedAt });
    const perfect = ev ? isPerfectEval(ev) : false;
    // completedAt 优先，没有就 fallback 到 evaluation.evaluatedAt
    const ts = t.completedAt ?? ev?.evaluatedAt;

    for (const w of windows) {
      if (!inWindow(ts, w, now)) continue;
      const bucket = result[w];
      // bronze/silver/gold counter
      if (star === 'gold') bucket.gold++;
      else if (star === 'silver') bucket.silver++;
      else bucket.bronze++;
      if (long) bucket.long++;
      if (perfect) bucket.perfect++;
    }
  }

  return result;
}

// ------------------------------------------------------------
// 一次性构造完整 UnlockContext
// ------------------------------------------------------------

export async function buildUnlockContext(db: FatboyDB, now: Date = new Date()): Promise<UnlockContext> {
  const ctx: UnlockContext = emptyContext();

  // 1) lifetime points
  ctx.lifetimePoints = await getLifetimePoints(db);

  // 2) streak
  const streak = await db.streak.get('singleton');
  ctx.currentStreak = streak?.currentStreak ?? 0;

  // 3) 任务计数（按窗口切片）
  const allEvalTasks = await db.tasks.where('status').equals('evaluated').toArray();
  const evals = await db.evaluations.toArray();
  const evalById = new Map(evals.map(e => [e.id, e]));
  ctx.byWindow = aggregateCounts(allEvalTasks, evalById, now);

  return ctx;
}

// ------------------------------------------------------------
// 单维度便捷 helper（UI 直接用）
// ------------------------------------------------------------

export async function getStarCount(db: FatboyDB, star: StarLevel, window: Window = 'lifetime'): Promise<number> {
  const ctx = await buildUnlockContext(db);
  return ctx.byWindow[window][star];
}

export async function getLongTaskCount(db: FatboyDB, window: Window = 'lifetime'): Promise<number> {
  const ctx = await buildUnlockContext(db);
  return ctx.byWindow[window].long;
}

export async function getPerfectCount(db: FatboyDB, window: Window = 'lifetime'): Promise<number> {
  const ctx = await buildUnlockContext(db);
  return ctx.byWindow[window].perfect;
}

// ------------------------------------------------------------
// 防止未使用 import 的占位（time helpers 暂未直接用）
// 留着 isoWeekString / todayString 是为未来扩展（按日期串过滤等）
// ------------------------------------------------------------
export const _internal = { isoWeekString, todayString };
