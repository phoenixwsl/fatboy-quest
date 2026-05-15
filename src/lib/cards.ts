// ============================================================
// R5.2.0: 卡牌引擎（收藏型）
//
// 三层架构：
//   - 券（tickets）：消费工具，db.skillCards
//   - 卡牌（cards）：纯收藏，永远累积，db.cards
//   - 里程碑（badges）：一次性成就，db.badges
//
// 卡牌 catalog（首批 3 种）：
//   focus            — 完成 1 个用时 ≥ 30 分钟的任务（每天最多 1）
//   perfect-day      — 当日所有评分都是三维全 5（每天最多 1）
//   weekend-warrior  — 周六或周日完成全部任务（每周末最多 1）
// ============================================================

import type { FatboyDB } from '../db';
import type { CollectibleCard, CollectibleCardType, Task, Evaluation } from '../types';
import { newId } from './ids';
import { todayString } from './time';
import { isLongTask, isPerfectEval, LONG_TASK_MIN_MS } from './unlockCondition';

export interface CardSpec {
  emoji: string;
  name: string;
  description: string;
  /** 同种是否可多次获得（false = 一次性，类似里程碑边缘）*/
  repeatable: boolean;
}

export const CARD_CATALOG: Record<CollectibleCardType, CardSpec> = {
  focus: {
    emoji: '🎯', name: '专注卡',
    description: '完成 1 个实际用时 ≥ 30 分钟的任务（每天最多 1）',
    repeatable: true,
  },
  'perfect-day': {
    emoji: '🌟', name: '完美一天',
    description: '当日所有评分任务三维全 5',
    repeatable: true,
  },
  'weekend-warrior': {
    emoji: '⚡', name: '周末战士',
    description: '周六或周日完成全部任务',
    repeatable: true,
  },
};

// ------------------------------------------------------------
// 通用：发一张卡 (返回 null 表示已发过 / 不满足约束)
// ------------------------------------------------------------

export interface IssueOptions {
  /** 关联对象（taskId / 日期串等） */
  context?: string;
  /** 当日是否已发过同类型 */
  oncePerDay?: boolean;
  /** 本周末是否已发过同类型 */
  oncePerWeekend?: boolean;
  now?: number;
}

export async function issueCard(
  db: FatboyDB,
  type: CollectibleCardType,
  options: IssueOptions = {},
): Promise<CollectibleCard | null> {
  const now = options.now ?? Date.now();

  if (options.oncePerDay) {
    const dayStart = startOfDay(now);
    const dayEnd = dayStart + 24 * 3600 * 1000;
    const same = await db.cards
      .where('type').equals(type)
      .filter(c => c.earnedAt >= dayStart && c.earnedAt < dayEnd)
      .first();
    if (same) return null;
  }

  if (options.oncePerWeekend) {
    const wkStart = startOfWeekend(now);
    const wkEnd = wkStart + 2 * 24 * 3600 * 1000;
    const same = await db.cards
      .where('type').equals(type)
      .filter(c => c.earnedAt >= wkStart && c.earnedAt < wkEnd)
      .first();
    if (same) return null;
  }

  const card: CollectibleCard = {
    id: newId('card'),
    type,
    earnedAt: now,
    context: options.context,
  };
  await db.cards.add(card);
  return card;
}

// ------------------------------------------------------------
// 触发器：在 evaluate.ts 评分完成后调用
// ------------------------------------------------------------

/**
 * 长任务（≥ 30 分钟实际用时）→ 专注卡（每天最多 1）
 * 注意：用 task.actualStartedAt → completedAt 的实际差，不是 estimatedMinutes
 */
export async function checkAndIssueFocus(
  db: FatboyDB,
  task: Task,
  now: number = Date.now(),
): Promise<CollectibleCard | null> {
  if (!isLongTask({ actualStartedAt: task.actualStartedAt, completedAt: task.completedAt })) {
    return null;
  }
  return issueCard(db, 'focus', { context: task.id, oncePerDay: true, now });
}

/**
 * 完美一天 → 当日所有 evaluated 任务都 isPerfectEval
 * 调用时机：每次任务评分后
 */
export async function checkAndIssuePerfectDay(
  db: FatboyDB,
  now: number = Date.now(),
): Promise<CollectibleCard | null> {
  const date = todayString(new Date(now));
  const todayTasks = await db.tasks.where({ date }).toArray();
  // 当日有 evaluated 任务，且所有 evaluated 都 perfect
  const evaluated = todayTasks.filter(t => t.status === 'evaluated' && t.evaluationId);
  if (evaluated.length === 0) return null;
  const evals = await db.evaluations.bulkGet(evaluated.map(t => t.evaluationId!));
  for (const ev of evals) {
    if (!ev || !isPerfectEval(ev)) return null;
  }
  return issueCard(db, 'perfect-day', { context: date, oncePerDay: true, now });
}

/**
 * 周末战士 → 周六或周日 + 当日所有任务（不限评分）已完成（done / evaluated）
 */
export async function checkAndIssueWeekendWarrior(
  db: FatboyDB,
  now: number = Date.now(),
): Promise<CollectibleCard | null> {
  const d = new Date(now);
  const day = d.getDay();
  if (day !== 0 && day !== 6) return null;     // 不是周六/周日
  const date = todayString(d);
  const todayTasks = await db.tasks.where({ date }).toArray();
  if (todayTasks.length === 0) return null;
  const allDone = todayTasks.every(t => t.status === 'done' || t.status === 'evaluated');
  if (!allDone) return null;
  return issueCard(db, 'weekend-warrior', { context: date, oncePerWeekend: true, now });
}

// ------------------------------------------------------------
// 时间辅助
// ------------------------------------------------------------

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 周末起点：周六 00:00。如果今天是周一-周五，返回上一个周六。*/
function startOfWeekend(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();        // 0 = Sunday, 6 = Saturday
  if (day === 6) return d.getTime();                       // Saturday
  if (day === 0) return d.getTime() - 24 * 3600 * 1000;    // Sunday → yesterday
  // weekday → past Saturday
  return d.getTime() - ((day + 1) % 7) * 24 * 3600 * 1000;
}

// ------------------------------------------------------------
// 库存查询（CardCabinet 用）
// ------------------------------------------------------------

export interface CardInventory {
  byType: Record<CollectibleCardType, CollectibleCard[]>;
  total: number;
}

export function groupCards(cards: CollectibleCard[]): CardInventory {
  const byType = {} as Record<CollectibleCardType, CollectibleCard[]>;
  for (const t of Object.keys(CARD_CATALOG) as CollectibleCardType[]) byType[t] = [];
  for (const c of cards) {
    if (byType[c.type]) byType[c.type].push(c);
  }
  return { byType, total: cards.length };
}

// 引入 LONG_TASK_MIN_MS 用于 catalog 文案统一（避免常量分散）
export { LONG_TASK_MIN_MS };
