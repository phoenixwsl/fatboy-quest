// ============================================================
// 任务模板：从历史任务里提取唯一的标题，作为快速复用模板
// 同一个标题可能历史上有多个版本，取最近一次的参数作为模板
// 支持隐藏（通过 hiddenTitles 集合传入）
// 排序：useCount 倒序，相同 useCount 用 lastUsedAt 倒序
// ============================================================

import type { SubjectType, Task } from '../types';

export interface TaskTemplate {
  title: string;
  description?: string;
  subject: SubjectType;
  basePoints: number;
  estimatedMinutes: number;
  useCount: number;
  lastUsedAt: number;
  fromChild?: boolean;       // 来源是孩子加过吗（仅供 UI 标识）
}

export function extractTemplates(
  tasks: Task[],
  hiddenTitles: Set<string> = new Set(),
  limit = 20,
): TaskTemplate[] {
  const byTitle = new Map<string, TaskTemplate>();
  const sorted = [...tasks].sort((a, b) => a.createdAt - b.createdAt);

  for (const t of sorted) {
    const key = t.title.trim();
    if (!key) continue;
    if (hiddenTitles.has(key)) continue;

    const existing = byTitle.get(key);
    if (existing) {
      existing.useCount += 1;
      existing.lastUsedAt = t.createdAt;
      existing.description = t.description;
      existing.subject = t.subject;
      existing.basePoints = t.basePoints;
      existing.estimatedMinutes = t.estimatedMinutes;
      if (t.createdBy === 'child') existing.fromChild = true;
    } else {
      byTitle.set(key, {
        title: key,
        description: t.description,
        subject: t.subject,
        basePoints: t.basePoints,
        estimatedMinutes: t.estimatedMinutes,
        useCount: 1,
        lastUsedAt: t.createdAt,
        fromChild: t.createdBy === 'child' || undefined,
      });
    }
  }

  return Array.from(byTitle.values())
    .sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return b.lastUsedAt - a.lastUsedAt;
    })
    .slice(0, limit);
}

export function canUndoCompletion(task: Pick<Task, 'status'>): boolean {
  return task.status === 'done';
}

/**
 * 孩子能否删除自己加的任务：
 * - createdBy === 'child'
 * - 未评分（status !== 'evaluated'）
 * - 不是家长指定的"必做"任务（即便由孩子加，但被家长改为必做也不能删；
 *   实际上 isRequired 只能由家长设置，孩子加的任务不会有此字段）
 */
export function canChildDeleteTask(task: Pick<Task, 'status' | 'createdBy' | 'isRequired'>): boolean {
  if (task.isRequired) return false;
  return task.createdBy === 'child' && task.status !== 'evaluated';
}
