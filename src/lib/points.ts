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
  /** @deprecated R3.4.1: use colorVar (CSS color string) for theme-aware rendering */
  color: string;
  /** CSS color string (var() or hex) — set via style={{ color: rank.colorVar }} */
  colorVar: string;
  emoji: string;
}

// R3.4.1: rank colors 用 CSS color strings 而非 tailwind class，跨主题自动跟随
// 段位本身是品牌色彩（铜银金等"金属拟物"），用 hex / var() 直接传到 style
export const RANKS: Rank[] = [
  { id: 'rookie',   name: '新兵', minPoints: 0,     color: 'text-zinc-300',    colorVar: 'var(--ink-muted)',   emoji: '🌑' },
  { id: 'bronze',   name: '青铜', minPoints: 200,   color: 'text-amber-600',   colorVar: '#B08D57',            emoji: '🥉' },
  { id: 'silver',   name: '白银', minPoints: 600,   color: 'text-slate-300',   colorVar: '#C0C4CC',            emoji: '🥈' },
  { id: 'gold',     name: '黄金', minPoints: 1500,  color: 'text-yellow-400',  colorVar: '#FFD23F',            emoji: '🥇' },
  { id: 'platinum', name: '铂金', minPoints: 3500,  color: 'text-cyan-300',    colorVar: '#7FE6DA',            emoji: '💎' },
  { id: 'diamond',  name: '钻石', minPoints: 7000,  color: 'text-sky-300',     colorVar: '#5BC2FF',            emoji: '💠' },
  { id: 'master',   name: '王者', minPoints: 14000, color: 'text-fuchsia-300', colorVar: 'var(--accent)',      emoji: '👑' },
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
 * 计算评分比例（基于 basePointsAtEval 作为 100%）
 * - 满 5/5/5 = 120%（公式天花板）
 * - 加上提前奖 / combo 可超过 120%
 * - 低分态度差 = 较低百分比
 */
export function scoreRatio(basePointsAtEval: number, finalPoints: number, extraBonus = 0): number {
  if (basePointsAtEval <= 0) return 0;
  return Math.round(((finalPoints + extraBonus) / basePointsAtEval) * 100);
}

/**
 * 比例对应的颜色档位：
 *   <60%  : 红（不达标）
 *   60-89 : 黄（一般）
 *   90-109: 绿（达标）
 *   110-129: 蓝（优秀）
 *   >=130 : 金（超神）
 */
/** @deprecated R3.4.1: use ratioColorStyle */
export function ratioColorClass(ratio: number): string {
  if (ratio >= 130) return 'text-amber-300';
  if (ratio >= 110) return 'text-sky-300';
  if (ratio >= 90)  return 'text-emerald-300';
  if (ratio >= 60)  return 'text-yellow-300';
  return 'text-rose-300';
}

// R3.4.1: 跨主题跟随 token 的版本，返回 style 对象
export function ratioColorStyle(ratio: number): { color: string } {
  if (ratio >= 130) return { color: 'var(--state-warn)' };
  if (ratio >= 110) return { color: 'var(--state-info)' };
  if (ratio >= 90)  return { color: 'var(--state-success)' };
  if (ratio >= 60)  return { color: 'var(--state-warn)' };
  return { color: 'var(--state-danger)' };
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
