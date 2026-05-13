// ============================================================
// R2.5.A: 微奖励高频化（ADHD 友好）
// 1. 每完成 1/4 时长 → 冒 1 颗⭐（视觉奖励，不入账积分）
// 2. 4 颗集齐 → 蛋仔气泡"专注力满！"
// 3. 完成任务时 ~15-20% 概率彩蛋积分 +5（变量奖励比固定奖励对 ADHD 大脑更激励）
// 全是纯函数，便于单测。
// ============================================================

/**
 * 给定已用时长 / 总时长，返回当前应亮的⭐数（0-4）
 * 1/4 → 1 颗，2/4 → 2 颗，3/4 → 3 颗，4/4 → 4 颗
 * 超时也不超过 4 颗（避免无意义膨胀）
 */
export function focusStarsCount(usedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  const ratio = usedMs / totalMs;
  if (ratio < 0.25) return 0;
  if (ratio < 0.5)  return 1;
  if (ratio < 0.75) return 2;
  if (ratio < 1.0)  return 3;
  return 4;
}

/**
 * 决定本次完成是否触发彩蛋积分（lucky bonus）
 * 用户当天前 3 次完成：20%，之后 10%
 * @param taskCountSoFar 今天已经完成（done/evaluated）的任务数（含本次）
 * @param rand 注入随机源（测试用，默认 Math.random）
 */
export function shouldGrantLuckyBonus(
  taskCountSoFar: number,
  rand: () => number = Math.random,
): boolean {
  const pct = taskCountSoFar <= 3 ? 0.20 : 0.10;
  return rand() < pct;
}

/** 彩蛋积分点数 */
export const LUCKY_BONUS_POINTS = 5;
