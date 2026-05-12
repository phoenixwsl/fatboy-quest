import { describe, it, expect } from 'vitest';
import { buildReminders, reminderText } from '../src/lib/notifications';
import type { Schedule, Task } from '../src/types';

const makeTask = (id: string, title: string): Task => ({
  id, title, date: '2026-05-12', basePoints: 20, estimatedMinutes: 30,
  subject: 'math', status: 'scheduled', createdAt: 0,
});

describe('buildReminders', () => {
  it('builds 5 reminders per task', () => {
    const schedule: Schedule = {
      id: 's1', date: '2026-05-12', round: 1,
      items: [{ kind: 'task', taskId: 't1', startMinute: 600, durationMinutes: 30 }],
    };
    const tasks = new Map([['t1', makeTask('t1', '数学')]]);
    const now = new Date(2026, 4, 12, 8, 0).getTime();
    const reminders = buildReminders(schedule, tasks, now);
    expect(reminders).toHaveLength(5);
    expect(reminders.map(r => r.kind)).toEqual(['preStart', 'start', 'half', 'nearEnd', 'end']);
  });

  it('skips past reminders', () => {
    const schedule: Schedule = {
      id: 's1', date: '2026-05-12', round: 1,
      items: [{ kind: 'task', taskId: 't1', startMinute: 600, durationMinutes: 30 }], // 10:00 - 10:30
    };
    const tasks = new Map([['t1', makeTask('t1', '数学')]]);
    const now = new Date(2026, 4, 12, 10, 20).getTime(); // 10:20，只有 nearEnd(10:25) 和 end(10:30) 还没到
    const reminders = buildReminders(schedule, tasks, now);
    expect(reminders.map(r => r.kind)).toEqual(['nearEnd', 'end']);
  });

  it('skips rest items', () => {
    const schedule: Schedule = {
      id: 's1', date: '2026-05-12', round: 1,
      items: [
        { kind: 'rest', startMinute: 600, durationMinutes: 10 },
        { kind: 'task', taskId: 't1', startMinute: 610, durationMinutes: 30 },
      ],
    };
    const tasks = new Map([['t1', makeTask('t1', '数学')]]);
    const now = new Date(2026, 4, 12, 5, 0).getTime();
    const reminders = buildReminders(schedule, tasks, now);
    expect(reminders).toHaveLength(5);
    expect(reminders.every(r => r.taskId === 't1')).toBe(true);
  });

  it('sorts reminders by fire time', () => {
    const schedule: Schedule = {
      id: 's1', date: '2026-05-12', round: 1,
      items: [
        { kind: 'task', taskId: 't1', startMinute: 1000, durationMinutes: 30 },
        { kind: 'task', taskId: 't2', startMinute: 600, durationMinutes: 30 },
      ],
    };
    const tasks = new Map([
      ['t1', makeTask('t1', '数学')],
      ['t2', makeTask('t2', '语文')],
    ]);
    const now = new Date(2026, 4, 12, 5, 0).getTime();
    const reminders = buildReminders(schedule, tasks, now);
    for (let i = 1; i < reminders.length; i++) {
      expect(reminders[i].fireAt).toBeGreaterThanOrEqual(reminders[i - 1].fireAt);
    }
  });
});

describe('reminderText', () => {
  it('returns user-facing text for each kind', () => {
    const kinds = ['preStart', 'start', 'half', 'nearEnd', 'end'] as const;
    for (const k of kinds) {
      const t = reminderText(k, '数学');
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(0);
      expect(t.body).toContain('数学');
    }
  });
});
