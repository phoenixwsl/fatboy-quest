// R2.4.3 单元测试：未评分提醒纯函数
import { describe, it, expect } from 'vitest';
import { planUnevaluatedReminders } from '../src/lib/unevaluatedReminder';
import type { Task } from '../src/types';

const t = (over: Partial<Task>): Task => ({
  id: 'x' + Math.random(), title: 'x', date: '2026-05-13',
  basePoints: 10, estimatedMinutes: 10, subject: 'math',
  status: 'done', createdAt: 0,
  ...over,
} as Task);

describe('planUnevaluatedReminders', () => {
  const now = 1_700_000_000_000;

  it('threshold ≤ 0 → 关闭，永远返回空', () => {
    const tasks = [t({ id: 'a', status: 'done', completedAt: now - 100 * 60_000 })];
    expect(planUnevaluatedReminders(tasks, 0, now).taskIdsToNotify).toEqual([]);
  });

  it('未到阈值 → 不通知', () => {
    const tasks = [t({ id: 'a', status: 'done', completedAt: now - 10 * 60_000 })];
    expect(planUnevaluatedReminders(tasks, 30, now).taskIdsToNotify).toEqual([]);
  });

  it('刚到阈值 → 通知', () => {
    const tasks = [t({ id: 'a', status: 'done', completedAt: now - 45 * 60_000 })];
    expect(planUnevaluatedReminders(tasks, 45, now).taskIdsToNotify).toEqual(['a']);
  });

  it('已通知过（unevaluatedNotifySentAt 已设）→ 不再通知', () => {
    const tasks = [t({ id: 'a', status: 'done',
      completedAt: now - 60 * 60_000,
      unevaluatedNotifySentAt: now - 30 * 60_000,
    })];
    expect(planUnevaluatedReminders(tasks, 45, now).taskIdsToNotify).toEqual([]);
  });

  it('已 evaluated 的任务不在 done 列表里 (skip)', () => {
    const tasks = [
      t({ id: 'a', status: 'evaluated', completedAt: now - 60 * 60_000 } as any),
      t({ id: 'b', status: 'done', completedAt: now - 60 * 60_000 }),
    ];
    expect(planUnevaluatedReminders(tasks, 45, now).taskIdsToNotify).toEqual(['b']);
  });

  it('多个任务混合：返回所有符合条件的', () => {
    const tasks = [
      t({ id: 'recent', status: 'done', completedAt: now - 10 * 60_000 }),       // 没到
      t({ id: 'old1',   status: 'done', completedAt: now - 50 * 60_000 }),        // 到了
      t({ id: 'old2',   status: 'done', completedAt: now - 60 * 60_000 }),        // 到了
      t({ id: 'sent',   status: 'done', completedAt: now - 90 * 60_000,
         unevaluatedNotifySentAt: now - 10 * 60_000 }),                            // 已发过
    ];
    expect(planUnevaluatedReminders(tasks, 45, now).taskIdsToNotify.sort()).toEqual(['old1', 'old2']);
  });
});
