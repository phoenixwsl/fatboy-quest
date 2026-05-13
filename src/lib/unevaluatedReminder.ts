// ============================================================
// R2.4.3: 未评分提醒纯函数
// 给定 done 任务列表 + 阈值（分钟）+ 当前时间，返回需要推送的 task 列表
// （未评分超时 X 分钟 + 没发过提醒 = 应推送）
// ============================================================
import type { Task } from '../types';

export interface UnevalReminderPlan {
  taskIdsToNotify: string[];
}

export function planUnevaluatedReminders(
  doneTasks: Task[],
  thresholdMinutes: number,
  now: number = Date.now(),
): UnevalReminderPlan {
  if (thresholdMinutes <= 0) return { taskIdsToNotify: [] }; // 0 = 关闭
  const thresholdMs = thresholdMinutes * 60_000;
  const ids: string[] = [];
  for (const t of doneTasks) {
    if (t.status !== 'done') continue;
    if (!t.completedAt) continue;
    if (t.unevaluatedNotifySentAt) continue;
    const elapsed = now - t.completedAt;
    if (elapsed >= thresholdMs) ids.push(t.id);
  }
  return { taskIdsToNotify: ids };
}
