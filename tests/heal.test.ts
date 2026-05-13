import { describe, it, expect } from 'vitest';
import { detectHealActions, isHealNeeded } from '../src/lib/heal';
import type { Task, Schedule } from '../src/types';

const t = (overrides: Partial<Task> = {}): Task => ({
  id: 'task_' + Math.random(),
  title: 'X', date: '2026-05-13', basePoints: 20, estimatedMinutes: 25,
  subject: 'math', status: 'pending', createdAt: 0,
  ...overrides,
});

const sch = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'sch_' + Math.random(),
  date: '2026-05-13',
  round: 1,
  items: [],
  ...overrides,
});

describe('detectHealActions', () => {
  it('returns nothing for clean state', () => {
    const plan = detectHealActions([], [], '2026-05-13');
    expect(plan.resetTaskIds).toHaveLength(0);
    expect(plan.uncompleteScheduleIds).toHaveLength(0);
  });

  it('does not touch active healthy state', () => {
    const task = t({ id: 't1', status: 'scheduled' });
    const schedule = sch({
      id: 's1', lockedAt: 100,
      items: [{ kind: 'task', taskId: 't1', startMinute: 600, durationMinutes: 25 }],
    });
    const plan = detectHealActions([task], [schedule], '2026-05-13');
    expect(plan.resetTaskIds).toHaveLength(0);
    expect(plan.uncompleteScheduleIds).toHaveLength(0);
  });

  it('detects schedule.completedAt with un-finished tasks → uncomplete', () => {
    const task = t({ id: 't1', status: 'scheduled' });
    const schedule = sch({
      id: 's1', lockedAt: 100, completedAt: 200,
      items: [{ kind: 'task', taskId: 't1', startMinute: 600, durationMinutes: 25 }],
    });
    const plan = detectHealActions([task], [schedule], '2026-05-13');
    expect(plan.uncompleteScheduleIds).toEqual(['s1']);
    expect(plan.resetTaskIds).toHaveLength(0); // 因为 schedule 修复后又有 active 的，task 不用重置
  });

  it('keeps schedule.completedAt when ALL tasks complete', () => {
    const task = t({ id: 't1', status: 'evaluated' });
    const schedule = sch({
      id: 's1', lockedAt: 100, completedAt: 200,
      items: [{ kind: 'task', taskId: 't1', startMinute: 600, durationMinutes: 25 }],
    });
    const plan = detectHealActions([task], [schedule], '2026-05-13');
    expect(plan.uncompleteScheduleIds).toHaveLength(0);
  });

  it('resets task that has no schedule', () => {
    const task = t({ id: 't1', status: 'scheduled' });
    const plan = detectHealActions([task], [], '2026-05-13');
    expect(plan.resetTaskIds).toEqual(['t1']);
  });

  it('resets task whose schedule is not locked', () => {
    const task = t({ id: 't1', status: 'inProgress' });
    const schedule = sch({
      id: 's1', // no lockedAt
      items: [{ kind: 'task', taskId: 't1', startMinute: 600, durationMinutes: 25 }],
    });
    const plan = detectHealActions([task], [schedule], '2026-05-13');
    expect(plan.resetTaskIds).toEqual(['t1']);
  });

  it('isHealNeeded reflects plan', () => {
    expect(isHealNeeded({ resetTaskIds: [], uncompleteScheduleIds: [] })).toBe(false);
    expect(isHealNeeded({ resetTaskIds: ['t1'], uncompleteScheduleIds: [] })).toBe(true);
    expect(isHealNeeded({ resetTaskIds: [], uncompleteScheduleIds: ['s1'] })).toBe(true);
  });

  it('ignores tasks for different date', () => {
    const task = t({ id: 't1', status: 'scheduled', date: '2026-05-12' });
    const plan = detectHealActions([task], [], '2026-05-13');
    expect(plan.resetTaskIds).toHaveLength(0);
  });
});
