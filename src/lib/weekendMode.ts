// 周末模式：周六周日切换 UI 主题 + 修改连击规则
import type { Task } from '../types';
import { isoWeekString } from './time';

export function isWeekend(date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0=Sunday, 6=Saturday
}

// 背景渐变 class（叠加在 body 上）
// 工作日：深空蓝紫（默认）
// 周末：暖橙紫
export const weekendBgClass = 'weekend-bg';

/**
 * 周末连击规则：只要今日完成 >= 1 项即保持
 * 工作日规则：必须今日全部完成才保持
 */
export function isDayCompleteForStreak(
  date: string,
  tasksForDate: Task[],
  weekend: boolean,
): boolean {
  if (tasksForDate.length === 0) return false;
  const completed = tasksForDate.filter(t => t.status === 'done' || t.status === 'evaluated').length;
  if (weekend) return completed >= 1;
  return completed === tasksForDate.length;
}

export function currentIsoWeek(): string {
  return isoWeekString(new Date());
}
