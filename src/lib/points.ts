// ============================================================
// 积分计算
// 最终积分 = 基础积分 × 综合系数
// 综合系数 = (完成度+质量)/10 × 态度倍率(0.8 ~ 1.2)
// 例：基础 20，完成 5、质量 4、态度 5 → 20 × 0.9 × 1.2 = 21.6 → 22
// ============================================================

import type { Evaluation, PointsEntry, Task } from '../types';

export interface EvalInput {
  completion: number;  // 1-5
  quality: number;     // 1-5
  attitude: number;    // 1-5
}

/**
 * 态度评分 → 倍率
 * 1星 0.8, 2星 0.9, 3星 1.0, 4星 1.1, 5星 1.2
 */
export function attitudeMultiplier(attitude: number): number {
  const clamped = Math.max(1, Math.min(5, attitude));
  return 0.8 + (clamped - 1) * 0.1;
}

/**
 * 计算最终积分（确定性公式，被测试覆盖）
 */
export function calcFinalPoints(basePoints: number, eval_: EvalInput): number {
  const c = Math.max(1, Math.min(5, eval_.completion));
  const q = Math.max(1, Math.min(5, eval_.quality));
  const baseFactor = (c + q) / 10;            // 0.2 ~ 1.0
  const attFactor = attitudeMultiplier(eval_.attitude);
  return Math.round(basePoints * baseFactor * attFactor);
}

/**
 * 总积分 = 流水所有 delta 之和
 */
export function totalPoints(entries: PointsEntry[]): number {
  return entries.reduce((sum, e) => sum + e.delta, 0);
}

/**
 * 段位（等级）系统：根据总积分阶梯
 */
export interface Rank {
  id: string;
  name: string;
  minPoints: number;
  color: string;     // tailwind class
  emoji: string;
}

export const RANKS: Rank[] = [
  { id: 'rookie',    name: '新兵',     minPoints: 0,     color: 'text-zinc-300',  emoji: '🌑' },
  { id: 'bronze',    name: '青铜',     minPoints: 200,   color: 'text-amber-600', emoji: '🥉' },
  { id: 'silver',    name: '白银',     minPoints: 600,   color: 'text-slate-300', emoji: '🥈' },
  { id: 'gold',      name: '黄金',     minPoints: 1500,  color: 'text-yellow-400',emoji: '🥇' },
  { id: 'platinum',  name: '铂金',     minPoints: 3500,  color: 'text-cyan-300',  emoji: '💎' },
  { id: 'diamond',   name: '钻石',     minPoints: 7000,  color: 'text-sky-300',   emoji: '💠' },
  { id: 'master',    name: '王者',     minPoints: 14000, color: 'text-fuchsia-300', emoji: '👑' },
];

export function getRank(totalPoints: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (totalPoints >= r.minPoints) current = r;
  }
  return current;
}

export function getNextRank(totalPoints: number): Rank | null {
  const idx = RANKS.findIndex(r => r.id === getRank(totalPoints).id);
  return RANKS[idx + 1] ?? null;
}

/**
 * 守护卡价格 = 最近 7 天日均积分 × 3
 * 没有历史时给个保底价 100
 */
export function calcGuardCardPrice(recentDailyAverages: number[]): number {
  if (recentDailyAverages.length === 0) return 100;
  const avg = recentDailyAverages.reduce((a, b) => a + b, 0) / recentDailyAverages.length;
  return Math.max(100, Math.round(avg * 3));
}

/**
 * 创建积分流水条目
 */
export function makePointsEntry(
  delta: number,
  reason: string,
  refId?: string,
): PointsEntry {
  return {
    id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    delta,
    reason,
    refId,
  };
}

/**
 * 给任务生成评分对象
 * @param basePointsAtEval 家长在评分时确认或修改的基础积分（v3）
 */
export function makeEvaluation(task: Task, input: EvalInput, basePointsAtEval: number, note?: string): Evaluation {
  return {
    id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    taskId: task.id,
    basePointsAtEval,
    completion: input.completion,
    quality: input.quality,
    attitude: input.attitude,
    note,
    evaluatedAt: Date.now(),
    finalPoints: calcFinalPoints(basePointsAtEval, input),
  };
}
