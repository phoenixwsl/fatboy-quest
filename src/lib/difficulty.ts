// ============================================================
// R3.2 → R4.0.0 → R5.1.0: 任务难度系统（4 档）
// 0 星 (none)：默认 / 作业很差，无奖
// 1 星 (bronze)：评分时额外 +3 积分
// 2 星 (silver)：评分时额外 +5 积分
// 3 星 (gold)：评分时额外 +10 积分
//
// R5.1.0 改动：加 'none' = 0 星（孩子能感觉到"我没攒到星星"）
// ============================================================

import type { StarLevel } from './unlockCondition';
export type { StarLevel } from './unlockCondition';
/** @deprecated R4.0.0: 使用 StarLevel 替代 */
export type Difficulty = StarLevel;

const BONUS: Record<StarLevel, number> = {
  none:   0,
  bronze: 3,    // R5.1.0: 1 星调成 +3（之前 +5）
  silver: 5,
  gold:   10,
};

export function difficultyBonus(difficulty: StarLevel | undefined): number {
  if (!difficulty) return 0;
  return BONUS[difficulty] ?? 0;
}

export const DIFFICULTY_LABELS: Record<StarLevel, string> = {
  none:   '0 星（默认）',
  bronze: '1 星（铜）',
  silver: '2 星（银）',
  gold:   '3 星（金）',
};

/** R4.0.0 → R5.1.0: 金属色 token */
export const DIFFICULTY_COLORS: Record<StarLevel, { fill: string; soft: string; strong: string }> = {
  none:   { fill: '#A0A0A0', soft: '#E8E8E8', strong: '#5A5A5A' }, // 灰色
  bronze: { fill: '#B87333', soft: '#F1DDC9', strong: '#7A4D22' },
  silver: { fill: '#C0C0C0', soft: '#E8E8E8', strong: '#7A7A7A' },
  gold:   { fill: '#FFD23F', soft: '#FFF1B8', strong: '#A87C00' },
};

/**
 * 数字索引 → StarLevel；兼容老代码偶尔传 number 的入口。
 * 0 → none, 1 → bronze, 2 → silver, 3 → gold
 */
export function toStarLevel(v: number | string | undefined): StarLevel {
  if (v === 'none' || v === 'bronze' || v === 'silver' || v === 'gold') return v;
  if (typeof v === 'number') {
    if (v >= 3) return 'gold';
    if (v >= 2) return 'silver';
    if (v >= 1) return 'bronze';
    return 'none';
  }
  return 'none';
}

/** 星级在四档中的"星数"（0/1/2/3）— 用于渲染图标个数 */
export function starCount(d: StarLevel | undefined): 0 | 1 | 2 | 3 {
  if (d === 'gold')   return 3;
  if (d === 'silver') return 2;
  if (d === 'bronze') return 1;
  return 0;
}

/** 星星渲染辅助：返回填充 + 灰色组合（共 3 颗） */
export function difficultyStars(difficulty: StarLevel | undefined): { filled: number; empty: number } {
  const n = starCount(difficulty);
  return { filled: n, empty: 3 - n };
}
