// ============================================================
// 仅重置当前任务状态（保留所有历史）
//
// 用途：闯关流程卡住时一键恢复，**不影响**：
//   - 已完成或已评分的任务（status === 'done' | 'evaluated'）
//   - 评分记录 evaluations
//   - 积分流水 points
//   - 连击 streak / 徽章 badges / 蛋仔 pet
//   - 商店 shop / 兑换 redemptions
//   - Bark 接收人 recipients / 设置 settings
//   - 循环任务定义 taskDefinitions
//
// 只动这两件事：
//   1. 把所有 status='scheduled' | 'inProgress' 的任务改回 'pending'
//      并清掉 runtime 字段（actualStartedAt / pausedAt / firstEncounteredAt 等）
//   2. 清掉那些 "有 inFlight 任务却被标记完成" 的 schedule.completedAt
//      （已经全部完成的 schedule 保留 completedAt，因为这是真实历史）
// ============================================================

import type { Task, Schedule } from '../types';

export interface CurrentStateResetPlan {
  taskIdsToReset: string[];
  scheduleIdsToUncomplete: string[];
}

export function planCurrentStateReset(
  tasks: Task[],
  schedules: Schedule[],
): CurrentStateResetPlan {
  // 1. 所有 inFlight 任务
  const taskIdsToReset = tasks
    .filter(t => t.status === 'scheduled' || t.status === 'inProgress')
    .map(t => t.id);

  const inFlightSet = new Set(taskIdsToReset);

  // 2. 那些已被标记 completedAt 但内部还有 inFlight 任务的 schedule
  const scheduleIdsToUncomplete = schedules
    .filter(s => {
      if (!s.completedAt) return false;
      // 看 schedule 里有没有任何任务 id 在 inFlight 集合
      return s.items.some(i =>
        i.kind === 'task' && i.taskId && inFlightSet.has(i.taskId),
      );
    })
    .map(s => s.id);

  return { taskIdsToReset, scheduleIdsToUncomplete };
}

export function isResetNeeded(plan: CurrentStateResetPlan): boolean {
  return plan.taskIdsToReset.length > 0 || plan.scheduleIdsToUncomplete.length > 0;
}

/**
 * 给定一份任务，返回"应该重置后"的字段补丁
 * 这个不直接改 DB，方便单测
 */
export function taskResetPatch(): Partial<Task> {
  return {
    status: 'pending',
    actualStartedAt: undefined,
    pausedAt: undefined,
    pauseSecondsUsed: undefined,
    pauseCount: undefined,
    firstEncounteredAt: undefined,
    startNagSentAt: undefined,
    completedAt: undefined,
    // 注意：故意保留 extendCount / extendMinutesTotal / extendPointsSpent / undoCount
    // 这些是"历史使用过的"信息，重置后不该归零（否则连击 / 提前奖逻辑可能出问题）
    // 实际上重置回 pending 后这些字段也不会再影响什么
  };
}

/**
 * 给定一个 schedule，返回"应该重置后"的字段补丁
 */
export function scheduleResetPatch(): Partial<Schedule> {
  return {
    completedAt: undefined,
    comboPeakInRound: undefined,
    comboBonusPoints: undefined,
    reportShownAt: undefined,
  };
}
