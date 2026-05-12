// 时间驱动的几个仪式：晚安总结、周日仪式、断击预警
// 这里只放纯函数逻辑（"现在该不该触发某个仪式"），UI 由组件触发显示
import type { RitualLog, Settings } from '../types';
import { todayString } from './time';

export type RitualKind = 'evening-summary' | 'sunday-ritual' | 'streak-alert';

export function ritualLogId(kind: RitualKind, date: string): string {
  return `${date}-${kind}`;
}

/**
 * 判断"晚安总结"是否应该展示
 * - 时间 >= 设定的时:分
 * - 今日还没展示过
 * - 不是周日（周日由 sunday-ritual 替代）
 */
export function shouldShowEveningSummary(
  now: Date,
  settings: Settings,
  logs: RitualLog[],
): boolean {
  const hour = settings.eveningSummaryHour ?? 21;
  const minute = settings.eveningSummaryMinute ?? 30;
  if (now.getDay() === 0) return false;
  const targetMinutes = hour * 60 + minute;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < targetMinutes) return false;
  const today = todayString(now);
  return !logs.some(l => l.kind === 'evening-summary' && l.date === today);
}

/**
 * 判断"周日仪式"是否应该展示
 * - 周日且时间 >= 设定的时:分
 * - 本周日还没展示过
 */
export function shouldShowSundayRitual(
  now: Date,
  settings: Settings,
  logs: RitualLog[],
): boolean {
  if (now.getDay() !== 0) return false;
  const hour = settings.sundayRitualHour ?? 21;
  const minute = settings.sundayRitualMinute ?? 0;
  const targetMinutes = hour * 60 + minute;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < targetMinutes) return false;
  const today = todayString(now);
  return !logs.some(l => l.kind === 'sunday-ritual' && l.date === today);
}

/**
 * 判断"断击预警"是否应该展示
 * - 时间 >= 设定的时:分
 * - 当前连击 > 0
 * - 今日还没完成任何任务
 * - 今日还没提醒过
 */
export function shouldShowStreakAlert(
  now: Date,
  settings: Settings,
  logs: RitualLog[],
  currentStreak: number,
  completedToday: number,
): boolean {
  if (currentStreak <= 0) return false;
  if (completedToday > 0) return false;
  const hour = settings.streakAlertHour ?? 19;
  const minute = settings.streakAlertMinute ?? 30;
  const targetMinutes = hour * 60 + minute;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < targetMinutes) return false;
  const today = todayString(now);
  return !logs.some(l => l.kind === 'streak-alert' && l.date === today);
}
