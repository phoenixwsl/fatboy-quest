// ============================================================
// 循环任务（TaskDefinition）生成与统计
// - daily-required：每天自动在今日池里生成一个 Task 实例
// - weekly-min / weekly-once：不预生成实例，按需"做一次"时创建
// ============================================================

import type { Task, TaskDefinition, TaskType } from '../types';
import { todayString, isoWeekString } from './time';
import { newId } from './ids';

// R3.4.1: 任务类型 → 视觉样式（用 style 对象 + token，跨主题跟随）
// 用 Record<string, string> 而不是 React.CSSProperties，避免 lib 文件依赖 React 类型
type SimpleStyle = Record<string, string>;

export const TASK_TYPE_BORDER_STYLE: Record<TaskType, SimpleStyle> = {
  'normal':           {},
  'daily-required':   { borderLeft: '4px solid var(--state-danger)' },
  'weekly-min':       { borderLeft: '4px solid var(--accent)' },
  'weekly-once':      { borderLeft: '4px solid var(--state-info)' },
};

export const TASK_TYPE_BADGE_STYLE: Record<TaskType, { label: string; style: SimpleStyle } | null> = {
  'normal':           null,
  'daily-required':   { label: '🔴 必做',      style: { background: 'var(--state-danger-soft)',  color: 'var(--state-danger-strong)' } },
  'weekly-min':       { label: '🟣 每周 N 次', style: { background: 'var(--accent-soft)',         color: 'var(--accent-strong)' } },
  'weekly-once':      { label: '🔵 每周一次',  style: { background: 'var(--state-info-soft)',     color: 'var(--state-info-strong)' } },
};

/** @deprecated use TASK_TYPE_BORDER_STYLE */
export const TASK_TYPE_BORDER: Record<TaskType, string> = {
  'normal': '',
  'daily-required': 'border-l-4 border-l-rose-500',
  'weekly-min': 'border-l-4 border-l-fuchsia-500',
  'weekly-once': 'border-l-4 border-l-sky-500',
};

/** @deprecated use TASK_TYPE_BADGE_STYLE */
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
 * 判断同一个 definition 今天是否已经有过实例（用于"一天只能做一次"限制）
 * 任意状态都算（pending / scheduled / inProgress / done / evaluated）
 */
export function hasInstanceToday(
  definitionId: string,
  date: string,
  tasks: Task[],
): boolean {
  return tasks.some(t => t.definitionId === definitionId && t.date === date);
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
