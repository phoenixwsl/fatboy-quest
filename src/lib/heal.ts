// ============================================================
// 状态自愈：修复死锁
// 死锁条件：task.status = scheduled/inProgress，但所属 schedule 全部
//   - 已 completedAt（之前完成过然后撤回但没清理）
//   - 或 没 lockedAt（schedule 被异常重置）
// 这种情况 QuestPage 找不到活动 schedule，SchedulePage 又因为 inFlight
// 而拒绝再次进入，导致"既不能闯关也不能规划"的死循环。
// 修复策略：
//   1. 把"明明还有未完成 task 却被标记 completedAt 的 schedule" 取消 completedAt
//   2. 把"找不到 active schedule 的 inFlight task" 重置为 pending
// ============================================================

import type { Schedule, Task } from '../types';

export interface HealPlan {
  resetTaskIds: string[];            // 这些 task 应重置为 pending
  uncompleteScheduleIds: string[];   // 这些 schedule 应清除 completedAt
}

export function detectHealActions(
  tasks: Task[],
  schedules: Schedule[],
  date: string,
): HealPlan {
  const todayTasks = tasks.filter(t => t.date === date);
  const todaySchedules = schedules.filter(s => s.date === date);
  const resetTaskIds: string[] = [];
  const uncompleteScheduleIds: string[] = [];

  // Pass 1: schedule completedAt 但仍有未完成 task → 清除
  for (const sch of todaySchedules) {
    if (!sch.completedAt) continue;
    const itemTaskIds = sch.items.filter(i => i.kind === 'task' && i.taskId).map(i => i.taskId!);
    const allComplete = itemTaskIds.every(id => {
      const t = todayTasks.find(t => t.id === id);
      return t && (t.status === 'done' || t.status === 'evaluated');
    });
    if (!allComplete) {
      uncompleteScheduleIds.push(sch.id);
    }
  }

  // 模拟"修复后"的 schedule 状态
  const fixedSchedules = todaySchedules.map(s =>
    uncompleteScheduleIds.includes(s.id) ? { ...s, completedAt: undefined } : s,
  );

  // Pass 2: inFlight task 但找不到任何 active schedule（含修复后的）→ 重置
  for (const t of todayTasks) {
    if (t.status !== 'scheduled' && t.status !== 'inProgress') continue;
    const containing = fixedSchedules.filter(s => s.items.some(i => i.taskId === t.id));
    if (containing.length === 0) {
      resetTaskIds.push(t.id);
      continue;
    }
    const hasActive = containing.some(s => s.lockedAt && !s.completedAt);
    if (!hasActive) {
      resetTaskIds.push(t.id);
    }
  }

  return { resetTaskIds, uncompleteScheduleIds };
}

export function isHealNeeded(plan: HealPlan): boolean {
  return plan.resetTaskIds.length > 0 || plan.uncompleteScheduleIds.length > 0;
}
