// ============================================================
// R2.5.D: 豁免券（保护连击）
// 设计意图：ADHD 孩子断击带来的挫败感 >> 累积的成就感
//   → 每周自动发 2 张豁免券，断击当天可主动用券"保住"
//   → 教 self-advocacy：是孩子主动决定要不要用，不是自动续命
//
// 纯函数 + 1 个状态推导函数，UI 层只负责渲染 + 调 applyPardon。
// ============================================================
import type { StreakState } from '../types';
import { addDays, isoWeekString, todayString } from './time';

export const WEEKLY_PARDON_QUOTA = 2;

/** 推导出本周剩余豁免券数；同时副带是否要 reset */
export function effectivePardonCards(
  s: StreakState | undefined,
  today: string = todayString(),
): { remaining: number; needsReset: boolean; thisWeek: string } {
  const thisWeek = isoWeekString(new Date(today));
  if (!s) return { remaining: WEEKLY_PARDON_QUOTA, needsReset: true, thisWeek };
  if (s.lastPardonResetWeek !== thisWeek) {
    // 跨周 → 重置
    return { remaining: WEEKLY_PARDON_QUOTA, needsReset: true, thisWeek };
  }
  return {
    remaining: s.pardonCardsThisWeek ?? WEEKLY_PARDON_QUOTA,
    needsReset: false,
    thisWeek,
  };
}

/** 是否处于"断击"状态：曾经有连击但已过了 ≥ 2 天没完成 */
export function isStreakBroken(
  s: StreakState | undefined,
  today: string = todayString(),
): boolean {
  if (!s) return false;
  if (!s.currentStreak || s.currentStreak === 0) return false;
  if (!s.lastFullDate) return false;
  const yesterday = addDays(today, -1);
  // 昨天或今天还在 → 没断
  return s.lastFullDate < yesterday;
}

/** 计算"用券后"streak 应该的状态 */
export function applyPardonToStreak(
  s: StreakState,
  today: string = todayString(),
): Partial<StreakState> {
  const { remaining, thisWeek } = effectivePardonCards(s, today);
  if (remaining <= 0) throw new Error('no_cards');
  if (!isStreakBroken(s, today)) throw new Error('not_broken');
  return {
    pardonCardsThisWeek: remaining - 1,
    lastPardonResetWeek: thisWeek,
    // 把 lastFullDate 推到昨天，让今天完成时 applyDayComplete 顺利 +1
    lastFullDate: addDays(today, -1),
  };
}
