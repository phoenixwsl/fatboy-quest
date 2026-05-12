// ============================================================
// 循环任务（TaskDefinition）生成与统计
// - daily-required：每天自动在今日池里生成一个 Task 实例
// - weekly-min / weekly-once：不预生成实例，按需"做一次"时创建
// ============================================================

import type { Task, TaskDefinition, TaskType } from '../types';
import { todayString, isoWeekString } from './time';
import { newId } from './ids';

// 任务类型 → 视觉边框 class
export const TASK_TYPE_BORDER: Record<TaskType, string> = {
  'normal': '',
  'daily-required': 'border-l-4 border-l-rose-500',
  'weekly-min': 'border-l-4 border-l-fuchsia-500',
  'weekly-once': 'border-l-4 border-l-sky-500',
};

export const TASK_TYPE_BADGE: Record<TaskType, { label: string; class: string } | null> = {
  'normal': null,
  'daily-required': { label: '🔴 必做', class: 'bg-rose-500/40 text-rose-100' },
  'weekly-min': { label: '🟣 每周 N 次', class: 'bg-fuchsia-500/40 text-fuchsia-100' },
  'weekly-once': { label: '🔵 每周一次', class: 'bg-sky-500/40 text-sky-100' },
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  'normal': '普通',
  'daily-required': '每日必做',
  'weekly-min': '每周 N 次',
  'weekly-once': '每周一次',
};

/**
 * 根据 daily-required 定义，生成今天还没有的实例
 * 返回新生成实例的数组（已经写入 DB 之前的对象，调用方做 bulkAdd）
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
    if (def.type !== 'daily-required') continue;
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
      taskType: 'daily-required',
      definitionId: def.id,
    });
  }
  return out;
}

/**
 * 创建一个 weekly 任务的实例（"今天做一次"）
 */
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
    taskType: def.type,
    definitionId: def.id,
  };
}

/**
 * 计算一个 weekly 定义本周已完成的次数
 */
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
  const target = def.type === 'weekly-min' ? (def.weeklyMinTimes ?? 1) : 1;
  return { done: completedThisWeek, target, achieved: completedThisWeek >= target };
}

/**
 * 获取所有当前可见的 weekly 定义（active 的 weekly-min / weekly-once）
 */
export function activeWeeklyDefinitions(definitions: TaskDefinition[]): TaskDefinition[] {
  return definitions.filter(d => d.active && (d.type === 'weekly-min' || d.type === 'weekly-once'));
}

/**
 * 启动时拉一次：补齐今日的 daily-required 实例
 * 调用方：在 App.tsx initializeDB 后调用
 */
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
