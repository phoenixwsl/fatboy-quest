// ============================================================
// R2.3.3: schedule 自动 GC
// 应用启动时清理无意义的 schedule 残留：
//   - 没 lockedAt 的（用户进 SchedulePage 但没点"锁定"就退出）
//   - items 为空 + 没 lockedAt 的（更严格）
// 注意：保留 lockedAt && !completedAt（活动中）
//      保留 lockedAt && completedAt（历史）
// ============================================================
import type { Schedule } from '../types';

export interface GCPlan {
  scheduleIdsToDelete: string[];
}

/**
 * 给定所有 schedule，找出可以安全删除的（纯函数，便于单测）。
 */
export function planScheduleGC(schedules: Schedule[]): GCPlan {
  const scheduleIdsToDelete: string[] = [];
  for (const s of schedules) {
    // 没 lockedAt → 半路废弃，可以删
    if (!s.lockedAt) {
      scheduleIdsToDelete.push(s.id);
      continue;
    }
    // lockedAt 有但 items 完全空 → 几乎不可能进入，删
    if (!s.items || s.items.length === 0) {
      scheduleIdsToDelete.push(s.id);
      continue;
    }
  }
  return { scheduleIdsToDelete };
}
