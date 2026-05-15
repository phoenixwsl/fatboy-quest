// ============================================================
// R5.1.0: 循环任务（TaskDefinition）生成与统计
// 任务类型简化为 3 种：
//   - once：单次任务（指定某一天，做完即终结）— 由家长 / 孩子直接 db.tasks.add
//   - daily：每天必做（每天自动生成实例）
//   - weekly：每周任务（孩子按需做，weeklyTimes 是周内目标次数，默认 1）
//
// 注：Task.taskType 可能保留老值（normal/weekly-min/weekly-once）以兼容老数据；
// 显示时统一用 normalizeTaskType() 映射回 3 种之一。
// ============================================================

import type { Task, TaskDefinition, TaskType } from '../types';
import { todayString, isoWeekString } from './time';
import { newId } from './ids';

/** R5.1.0: 老 Task.taskType 字符串归一化为新 3 种 */
export function normalizeTaskType(t: string | undefined): TaskType {
  if (t === 'once' || t === 'daily' || t === 'weekly') return t;
  if (t === 'normal') return 'once';
  if (t === 'daily-required') return 'daily';
  if (t === 'weekly-min' || t === 'weekly-once') return 'weekly';
  return 'once';
}

type SimpleStyle = Record<string, string>;

// R5.1.0: 全 7 个 key 都填（兼容老 type 字段值），但语义按 3 类映射
export const TASK_TYPE_BORDER_STYLE: Record<TaskType, SimpleStyle> = {
  'once':           {},
  'daily':          { borderLeft: '4px solid var(--state-danger)' },
  'weekly':         { borderLeft: '4px solid var(--accent)' },
  'normal':         {},
  'daily-required': { borderLeft: '4px solid var(--state-danger)' },
  'weekly-min':     { borderLeft: '4px solid var(--accent)' },
  'weekly-once':    { borderLeft: '4px solid var(--accent)' },
};

export const TASK_TYPE_BADGE_STYLE: Record<TaskType, { label: string; style: SimpleStyle } | null> = {
  'once':           null,
  'daily':          { label: '🔴 必做',     style: { background: 'var(--state-danger-soft)', color: 'var(--state-danger-strong)' } },
  'weekly':         { label: '🟣 每周任务', style: { background: 'var(--accent-soft)',        color: 'var(--accent-strong)' } },
  'normal':         null,
  'daily-required': { label: '🔴 必做',     style: { background: 'var(--state-danger-soft)', color: 'var(--state-danger-strong)' } },
  'weekly-min':     { label: '🟣 每周任务', style: { background: 'var(--accent-soft)',        color: 'var(--accent-strong)' } },
  'weekly-once':    { label: '🟣 每周任务', style: { background: 'var(--accent-soft)',        color: 'var(--accent-strong)' } },
};

/** @deprecated use TASK_TYPE_BORDER_STYLE */
export const TASK_TYPE_BORDER: Record<TaskType, string> = {
  'once':           '',
  'daily':          'border-l-4 border-l-rose-500',
  'weekly':         'border-l-4 border-l-fuchsia-500',
  'normal':         '',
  'daily-required': 'border-l-4 border-l-rose-500',
  'weekly-min':     'border-l-4 border-l-fuchsia-500',
  'weekly-once':    'border-l-4 border-l-fuchsia-500',
};

/** @deprecated use TASK_TYPE_BADGE_STYLE */
export const TASK_TYPE_BADGE: Record<TaskType, { label: string; class: string } | null> = {
  'once':           null,
  'daily':          { label: '🔴 必做',     class: 'bg-rose-500/40 text-rose-100' },
  'weekly':         { label: '🟣 每周任务', class: 'bg-fuchsia-500/40 text-fuchsia-100' },
  'normal':         null,
  'daily-required': { label: '🔴 必做',     class: 'bg-rose-500/40 text-rose-100' },
  'weekly-min':     { label: '🟣 每周任务', class: 'bg-fuchsia-500/40 text-fuchsia-100' },
  'weekly-once':    { label: '🟣 每周任务', class: 'bg-fuchsia-500/40 text-fuchsia-100' },
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  'once':           '单次任务',
  'daily':          '每天必做',
  'weekly':         '每周任务',
  'normal':         '单次任务',
  'daily-required': '每天必做',
  'weekly-min':     '每周任务',
  'weekly-once':    '每周任务',
};

/**
 * 根据 daily 定义，生成今天还没有的实例
 */
export function ensureDailyTasksForDate(
  date: string,
  definitions: TaskDefinition[],
  existingTasksForDate: Task[],
): Task[] {
  const out: Task[] = [];
  const existingDefIds = new Set(existingTasksForDate.map(t => t.definitionId).filter(Boolean));
  for (const def of definitions) {
    if (!def.active) continue;
    // R5.1.0: 老 'daily-required' 也接受（向后兼容；migration 已转换 DB 数据）
    if (def.type !== 'daily' && def.type !== 'daily-required') continue;
    if (existingDefIds.has(def.id)) continue;
    out.push({
      id: newId('task'),
      title: def.title,
      description: def.description,
      date,
      basePoints: def.basePoints,
      estimatedMinutes: def.estimatedMinutes,
      subject: def.subject,
      status: 'pending',
      createdAt: Date.now(),
      createdBy: 'parent',
      isRequired: def.isRequired,
      taskType: 'daily',
      definitionId: def.id,
      difficulty: def.difficulty,
    });
  }
  return out;
}

/** 判断同一个 definition 今天是否已经有过实例（任意状态） */
export function hasInstanceToday(definitionId: string, date: string, tasks: Task[]): boolean {
  return tasks.some(t => t.definitionId === definitionId && t.date === date);
}

/** 创建一个 weekly 任务的实例（"今天做一次"） */
export function makeWeeklyInstance(def: TaskDefinition, date: string): Task {
  return {
    id: newId('task'),
    title: def.title,
    description: def.description,
    date,
    basePoints: def.basePoints,
    estimatedMinutes: def.estimatedMinutes,
    subject: def.subject,
    status: 'pending',
    createdAt: Date.now(),
    createdBy: 'parent',
    taskType: 'weekly',
    definitionId: def.id,
    difficulty: def.difficulty,
  };
}

/** 计算一个 weekly 定义本周已完成的次数 */
export function weeklyProgress(
  def: TaskDefinition,
  allTasks: Task[],
  now = new Date(),
): { done: number; target: number; achieved: boolean } {
  const wk = isoWeekString(now);
  const completedThisWeek = allTasks.filter(t => {
    if (t.definitionId !== def.id) return false;
    if (t.status !== 'done' && t.status !== 'evaluated') return false;
    const ts = t.completedAt ?? t.createdAt;
    return isoWeekString(new Date(ts)) === wk;
  }).length;
  // R5.1.0: 兼容老数据 weeklyMinTimes，新代码用 weeklyTimes
  const target = def.weeklyTimes ?? def.weeklyMinTimes ?? 1;
  return { done: completedThisWeek, target, achieved: completedThisWeek >= target };
}

/** 获取所有当前可见的 weekly 定义（active 的 weekly / weekly-min / weekly-once） */
export function activeWeeklyDefinitions(definitions: TaskDefinition[]): TaskDefinition[] {
  return definitions.filter(d => d.active && (d.type === 'weekly' || d.type === 'weekly-min' || d.type === 'weekly-once'));
}

/** 启动时拉一次：补齐今日的 daily 实例 */
export async function generateTodayDailyTasks(
  db: {
    taskDefinitions: { toArray(): Promise<TaskDefinition[]> };
    tasks: {
      where(c: any): { toArray(): Promise<Task[]> };
      bulkAdd(t: Task[]): Promise<any>;
    };
  },
  date = todayString(),
): Promise<number> {
  const defs = await db.taskDefinitions.toArray();
  const existing = await db.tasks.where({ date }).toArray();
  const news = ensureDailyTasksForDate(date, defs, existing);
  if (news.length > 0) await db.tasks.bulkAdd(news);
  return news.length;
}
