// ============================================================
// 连击 / 守护卡 / 周奖励 / 里程碑
// ============================================================

import type { StreakState } from '../types';
import { addDays, isoWeekString } from './time';

export interface MilestoneReward {
  day: number;
  points: number;
  badgeId?: string;
  unlocksSkin?: string;
  petEvolution?: 1 | 2 | 3 | 4;
  description: string;
}

export const MILESTONES: MilestoneReward[] = [
  { day: 3,   points: 50,   badgeId: 'badge_3d',     description: '初心者徽章' },
  { day: 7,   points: 100,  badgeId: 'badge_7d',     unlocksSkin: 'skin_explorer', description: '一周勇者 + 新皮肤' },
  { day: 14,  points: 200,  badgeId: 'badge_14d',    description: '坚毅者银徽章' },
  { day: 30,  points: 500,  badgeId: 'badge_30d',    petEvolution: 2, description: '蛋仔进化阶段 2 + 月度王者' },
  { day: 60,  points: 1000, badgeId: 'badge_60d',    description: '百炼成钢铂金徽章' },
  { day: 100, points: 2000, badgeId: 'badge_100d',   petEvolution: 3, description: '蛋仔进化阶段 3 + 传奇' },
  { day: 200, points: 5000, badgeId: 'badge_200d',   petEvolution: 4, description: '蛋仔终极形态 + 神话' },
];

export interface WeeklyGift {
  weekNumber: number;          // 第几周
  points: number;
  guardCards: number;
  description: string;
}

/**
 * 每周日完成后给的保底奖励（不是里程碑）
 */
export function calcWeeklyGift(weekNumber: number): WeeklyGift {
  if (weekNumber === 1) return { weekNumber, points: 100, guardCards: 1, description: '第 1 周保底 + 表情贴纸' };
  if (weekNumber === 2) return { weekNumber, points: 150, guardCards: 1, description: '第 2 周 + 随机蛋仔配饰' };
  if (weekNumber === 3) return { weekNumber, points: 200, guardCards: 1, description: '第 3 周 + 专属 BGM' };
  if (weekNumber === 4) return { weekNumber, points: 500, guardCards: 1, description: '月度奖励 + 新蛋仔皮肤' };
  return { weekNumber, points: 200, guardCards: 1, description: `第 ${weekNumber} 周保底` };
}

/**
 * 核心：当孩子完成"当日所有作业"时调用，更新连击状态
 * 返回更新后的 state + 触发的里程碑数组（一次可能跨多个）
 */
export interface ApplyResult {
  state: StreakState;
  milestonesHit: MilestoneReward[];
  weeklyGift: WeeklyGift | null;
}

export function applyDayComplete(
  state: StreakState,
  today: string,
): ApplyResult {
  const milestones: MilestoneReward[] = [];
  let weekly: WeeklyGift | null = null;
  let { currentStreak, longestStreak, lastFullDate, guardCards, lastWeeklyGiftWeek } = state;

  if (lastFullDate === today) {
    // 同一天重复触发，幂等
    return { state, milestonesHit: [], weeklyGift: null };
  }

  if (lastFullDate === null) {
    currentStreak = 1;
  } else {
    // 一次性处理"昨天没完成"的情况：用守护卡补，最多一张/天
    const gap = daysSince(lastFullDate, today);
    if (gap === 1) {
      currentStreak += 1;
    } else if (gap >= 2 && guardCards >= gap - 1) {
      // 用 gap-1 张守护卡覆盖空缺
      guardCards -= (gap - 1);
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
  }

  if (currentStreak > longestStreak) longestStreak = currentStreak;
  lastFullDate = today;

  // 检查里程碑
  for (const m of MILESTONES) {
    if (currentStreak === m.day) milestones.push(m);
  }

  // 周保底：每完成 7 的整数倍发一次
  if (currentStreak > 0 && currentStreak % 7 === 0) {
    const weekKey = isoWeekString(new Date());
    if (weekKey !== lastWeeklyGiftWeek) {
      const weekNum = currentStreak / 7;
      weekly = calcWeeklyGift(weekNum);
      lastWeeklyGiftWeek = weekKey;
      guardCards += weekly.guardCards;
    }
  }

  return {
    state: { ...state, currentStreak, longestStreak, lastFullDate, guardCards, lastWeeklyGiftWeek },
    milestonesHit: milestones,
    weeklyGift: weekly,
  };
}

function daysSince(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86400000);
}

/**
 * 每周一自动赠送守护卡（如果本周还没送过）
 */
export function maybeGrantWeeklyGuardCard(state: StreakState, now = new Date()): StreakState {
  const wk = isoWeekString(now);
  if (state.lastWeeklyGiftWeek === wk) return state;
  return {
    ...state,
    guardCards: state.guardCards + 1,
    lastWeeklyGiftWeek: wk,
  };
}

// 重新导出 addDays 方便测试用
export { addDays };
