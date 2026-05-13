// ============================================================
// R3.2: 任务难度系统
// 1 星：默认（无奖）
// 2 星：评分时额外 +5 积分（reason='difficulty_bonus'）
// 3 星：评分时额外 +10 积分
// ============================================================
export type Difficulty = 1 | 2 | 3;

export function difficultyBonus(difficulty: Difficulty | undefined): number {
  switch (difficulty) {
    case 2: return 5;
    case 3: return 10;
    default: return 0;
  }
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '简单',
  2: '中等',
  3: '挑战',
};

/** 星星渲染辅助：返回填充 + 灰色组合（共 3 颗） */
export function difficultyStars(difficulty: Difficulty | undefined): { filled: number; empty: number } {
  const d = difficulty ?? 1;
  return { filled: d, empty: 3 - d };
}
