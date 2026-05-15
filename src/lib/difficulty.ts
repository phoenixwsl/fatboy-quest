// ============================================================
// R3.2 → R4.0.0: 任务难度系统（铜/银/金）
// 铜（bronze）：默认（无奖）
// 银（silver）：评分时额外 +5 积分（reason='difficulty_bonus'）
// 金（gold）：  评分时额外 +10 积分
//
// R4.0.0 重命名：1|2|3 → 'bronze'|'silver'|'gold'，老数据由 v7 migration 转换。
// 类型 StarLevel 在 lib/unlockCondition.ts 定义并 re-export。
// ============================================================

import type { StarLevel } from './unlockCondition';
export type { StarLevel } from './unlockCondition';
/** @deprecated R4.0.0: 使用 StarLevel 替代 */
export type Difficulty = StarLevel;

const BONUS: Record<StarLevel, number> = {
  bronze: 0,
  silver: 5,
  gold:   10,
};

export function difficultyBonus(difficulty: StarLevel | undefined): number {
  if (!difficulty) return 0;
  return BONUS[difficulty] ?? 0;
}

export const DIFFICULTY_LABELS: Record<StarLevel, string> = {
  bronze: '铜（简单）',
  silver: '银（中等）',
  gold:   '金（挑战）',
};

/** R4.0.0: 金属色 token，用 hex 直接传给 style（非主题跟随，是商品色） */
export const DIFFICULTY_COLORS: Record<StarLevel, { fill: string; soft: string; strong: string }> = {
  bronze: { fill: '#B87333', soft: '#F1DDC9', strong: '#7A4D22' }, // 铜
  silver: { fill: '#C0C0C0', soft: '#E8E8E8', strong: '#7A7A7A' }, // 银
  gold:   { fill: '#FFD23F', soft: '#FFF1B8', strong: '#A87C00' }, // 金
};

/**
 * 数字索引（1/2/3）→ StarLevel；兼容老代码偶尔传 number 的入口。
 * 优先用 StarLevel 直接传值。
 */
export function toStarLevel(v: number | string | undefined): StarLevel {
  if (v === 'bronze' || v === 'silver' || v === 'gold') return v;
  if (typeof v === 'number') {
    if (v >= 3) return 'gold';
    if (v >= 2) return 'silver';
    return 'bronze';
  }
  return 'bronze';
}

/** 星级在三档中的"星数"（1/2/3）— 用于和 base point 倍率计算 / 渲染图标个数 */
export function starCount(d: StarLevel | undefined): 1 | 2 | 3 {
  if (d === 'gold')   return 3;
  if (d === 'silver') return 2;
  return 1;
}

/** 星星渲染辅助：返回填充 + 灰色组合（共 3 颗）—— 兼容旧 DifficultyStars 调用方式 */
export function difficultyStars(difficulty: StarLevel | undefined): { filled: number; empty: number } {
  const n = starCount(difficulty);
  return { filled: n, empty: 3 - n };
}
