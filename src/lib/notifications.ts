// ============================================================
// 本地通知（PWA Notification API）
// 用于：作业开始前 5 分钟 / 开始 / 过半 / 还剩 5 分钟 / 结束
//
// iPad 上 PWA 通知需要：
//   1. 必须已"添加到主屏幕"
//   2. 用户首次允许通知权限
//   3. 通知由 service worker 触发（前台用 Notification API，后台用 SW）
// ============================================================

import type { Schedule, Task } from '../types';
import { dateAtMinute } from './time';

export type ReminderKind = 'preStart' | 'start' | 'half' | 'nearEnd' | 'end';

export interface ScheduledReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  kind: ReminderKind;
  fireAt: number;       // 时间戳
}

export function buildReminders(
  schedule: Schedule,
  tasks: Map<string, Task>,
  now = Date.now(),
): ScheduledReminder[] {
  const out: ScheduledReminder[] = [];
  for (const item of schedule.items) {
    if (item.kind !== 'task' || !item.taskId) continue;
    const task = tasks.get(item.taskId);
    if (!task) continue;
    const startDate = dateAtMinute(schedule.date, item.startMinute);
    const endDate = dateAtMinute(schedule.date, item.startMinute + item.durationMinutes);
    const startTs = startDate.getTime();
    const endTs = endDate.getTime();
    const halfTs = startTs + (endTs - startTs) / 2;
    const nearEndTs = endTs - 5 * 60 * 1000;
    const preStartTs = startTs - 5 * 60 * 1000;

    const reminders: [ReminderKind, number][] = [
      ['preStart', preStartTs],
      ['start', startTs],
      ['half', halfTs],
      ['nearEnd', nearEndTs],
      ['end', endTs],
    ];

    for (const [kind, ts] of reminders) {
      if (ts <= now) continue; // 跳过已过期的
      out.push({
        id: `rem_${item.taskId}_${kind}`,
        taskId: item.taskId,
        taskTitle: task.title,
        kind,
        fireAt: ts,
      });
    }
  }
  return out.sort((a, b) => a.fireAt - b.fireAt);
}

export function reminderText(kind: ReminderKind, taskTitle: string): { title: string; body: string } {
  switch (kind) {
    case 'preStart':
      return { title: '🚀 准备出发！', body: `5 分钟后开始：${taskTitle}` };
    case 'start':
      return { title: '⚡ 开始闯关！', body: `现在开始：${taskTitle}` };
    case 'half':
      return { title: '⏳ 加油！', body: `${taskTitle} - 时间过半，保持专注` };
    case 'nearEnd':
      return { title: '🔔 快结束啦', body: `${taskTitle} - 还有 5 分钟` };
    case 'end':
      return { title: '🎯 时间到', body: `${taskTitle} - 完成了吗？可以休息一下` };
  }
}

/**
 * 请求通知权限。在 iPad PWA 上首次需要用户手动允许。
 */
export async function ensurePermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * 调度本地通知。
 * 简化版：用 setTimeout 在前台调度。
 * 真正需要后台触发的话需要 service worker + Push API。
 * 本轮先做前台版本，孩子用 App 时是开着的，足够用。
 */
export class LocalReminderScheduler {
  private timers = new Map<string, number>();

  schedule(reminder: ScheduledReminder) {
    if (this.timers.has(reminder.id)) return;
    const delay = reminder.fireAt - Date.now();
    if (delay < 0) return;
    const id = window.setTimeout(() => {
      this.fire(reminder);
      this.timers.delete(reminder.id);
    }, delay);
    this.timers.set(reminder.id, id);
  }

  scheduleAll(reminders: ScheduledReminder[]) {
    for (const r of reminders) this.schedule(r);
  }

  cancel(id: string) {
    const t = this.timers.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      this.timers.delete(id);
    }
  }

  cancelAll() {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }

  private fire(r: ScheduledReminder) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const { title, body } = reminderText(r.kind, r.taskTitle);
    try {
      new Notification(title, { body, tag: r.id, icon: '/fatboy-quest/icon-192.png' });
    } catch (e) {
      console.warn('Notification failed', e);
    }
  }
}
