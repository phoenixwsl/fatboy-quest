// ============================================================
// R4.0.0: 统一的"解锁条件"抽象
//
// 用途：商品 / 技能券 / 等级 / 锁定区 都通过同一套条件描述何时被解锁。
// 不引入新的"可花货币"——是阈值触发，达成即解锁，不可消费、不归零。
//
// 设计：纯函数 evaluateCondition(condition, context) → { met, progress, target }
// 上下文 UnlockContext 由 buildUnlockContext(db, now) 异步构造，单元测试可
// 直接构造 context 不依赖 DB。
// ============================================================

import type { Evaluation, Task } from '../types';

export type StarLevel = 'bronze' | 'silver' | 'gold';

export type Window = 'week' | 'month' | 'quarter' | 'lifetime';

/**
 * 长任务门槛：30 分钟（actualStartedAt → completedAt）
 * 选 30 是 ADHD 孩子 stamina 的起步门槛，多数 silver/gold 任务可触发。
 */
export const LONG_TASK_MIN_MS = 30 * 60 * 1000;

/**
 * 完美任务定义：completion / quality / attitude 三维全 5
 */
export function isPerfectEval(e: Pick<Evaluation, 'completion' | 'quality' | 'attitude'>): boolean {
  return e.completion === 5 && e.quality === 5 && e.attitude === 5;
}

/**
 * 长任务判定：实际耗时 ≥ LONG_TASK_MIN_MS
 * 没有 actualStartedAt（老数据 / 未通过 quest 完成）一律不算。
 */
export function isLongTask(t: Pick<Task, 'actualStartedAt' | 'completedAt'>): boolean {
  if (!t.actualStartedAt || !t.completedAt) return false;
  return t.completedAt - t.actualStartedAt >= LONG_TASK_MIN_MS;
}

// ============================================================
// 条件类型
// ============================================================

export type UnlockCondition =
  | { kind: 'lifetimePoints'; threshold: number }
  | { kind: 'taskCount'; star: StarLevel; count: number; window: Window }
  | { kind: 'longTask'; count: number; window: Window }
  | { kind: 'perfectTask'; count: number; window: Window }
  | { kind: 'streak'; days: number }
  | { kind: 'composite'; all: UnlockCondition[] };

// ============================================================
// 上下文：包含评估条件所需的所有累计数据
// 按窗口拆开，evaluateCondition 自己挑对应窗口的值
// ============================================================

export interface WindowedCounts {
  bronze: number;
  silver: number;
  gold: number;
  long: number;
  perfect: number;
}

export interface UnlockContext {
  lifetimePoints: number;
  byWindow: Record<Window, WindowedCounts>;
  currentStreak: number;
}

export function emptyWindowedCounts(): WindowedCounts {
  return { bronze: 0, silver: 0, gold: 0, long: 0, perfect: 0 };
}

export function emptyContext(): UnlockContext {
  return {
    lifetimePoints: 0,
    byWindow: {
      week:     emptyWindowedCounts(),
      month:    emptyWindowedCounts(),
      quarter:  emptyWindowedCounts(),
      lifetime: emptyWindowedCounts(),
    },
    currentStreak: 0,
  };
}

// ============================================================
// 评估器：返回当前进度 + 目标 + 是否达成
// ============================================================

export interface UnlockProgress {
  met: boolean;
  /** 当前累计值（已达多少） */
  progress: number;
  /** 目标值 */
  target: number;
}

export function evaluateCondition(c: UnlockCondition, ctx: UnlockContext): UnlockProgress {
  switch (c.kind) {
    case 'lifetimePoints': {
      const progress = Math.max(0, ctx.lifetimePoints);
      return { met: progress >= c.threshold, progress, target: c.threshold };
    }
    case 'taskCount': {
      const w = ctx.byWindow[c.window];
      const progress = w[c.star];
      return { met: progress >= c.count, progress, target: c.count };
    }
    case 'longTask': {
      const w = ctx.byWindow[c.window];
      const progress = w.long;
      return { met: progress >= c.count, progress, target: c.count };
    }
    case 'perfectTask': {
      const w = ctx.byWindow[c.window];
      const progress = w.perfect;
      return { met: progress >= c.count, progress, target: c.count };
    }
    case 'streak': {
      return { met: ctx.currentStreak >= c.days, progress: ctx.currentStreak, target: c.days };
    }
    case 'composite': {
      // AND 复合：进度 = 已达成的子条件数 / 子条件总数
      const subs = c.all.map(sub => evaluateCondition(sub, ctx));
      const metCount = subs.filter(s => s.met).length;
      return { met: subs.every(s => s.met), progress: metCount, target: subs.length };
    }
  }
}

// ============================================================
// 中文描述：用于 UI 进度条旁边的提示
// ============================================================

const STAR_LABEL: Record<StarLevel, string> = {
  bronze: '铜任务',
  silver: '银任务',
  gold:   '金任务',
};

const WINDOW_LABEL: Record<Window, string> = {
  week:     '本周',
  month:    '本月',
  quarter:  '本季度',
  lifetime: '累计',
};

export function describeCondition(c: UnlockCondition): string {
  switch (c.kind) {
    case 'lifetimePoints':
      return `累计积分 ${c.threshold}`;
    case 'taskCount':
      return `${WINDOW_LABEL[c.window]}完成 ${c.count} 个${STAR_LABEL[c.star]}`;
    case 'longTask':
      return `${WINDOW_LABEL[c.window]}完成 ${c.count} 个长任务（≥30 分钟）`;
    case 'perfectTask':
      return `${WINDOW_LABEL[c.window]}完成 ${c.count} 个完美任务`;
    case 'streak':
      return `连击 ${c.days} 天`;
    case 'composite':
      return c.all.map(describeCondition).join(' + ');
  }
}
