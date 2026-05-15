import { describe, it, expect } from 'vitest';
import {
  ensureDailyTasksForDate, makeWeeklyInstance, weeklyProgress, activeWeeklyDefinitions,
} from '../src/lib/recurrence';
import type { Task, TaskDefinition } from '../src/types';

const def = (overrides: Partial<TaskDefinition> = {}): TaskDefinition => ({
  id: 'd_' + Math.random(),
  title: '数学口算',
  subject: 'math',
  basePoints: 20,
  estimatedMinutes: 25,
  type: 'daily-required',
  active: true,
  createdAt: 0,
  ...overrides,
});

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't_' + Math.random(),
  title: '数学口算',
  date: '2026-05-12',
  basePoints: 20,
  estimatedMinutes: 25,
  subject: 'math',
  status: 'pending',
  createdAt: 0,
  ...overrides,
});

describe('ensureDailyTasksForDate', () => {
  it('returns empty when no daily definitions', () => {
    expect(ensureDailyTasksForDate('2026-05-12', [], [])).toHaveLength(0);
  });

  it('generates a task for each active daily-required def', () => {
    const out = ensureDailyTasksForDate('2026-05-12', [
      def({ id: 'd1', title: 'A' }),
      def({ id: 'd2', title: 'B' }),
    ], []);
    expect(out).toHaveLength(2);
    expect(out[0].taskType).toBe('daily');     // R5.1.0: 重命名
    expect(out[0].definitionId).toBe('d1');
    expect(out[0].date).toBe('2026-05-12');
    expect(out[0].status).toBe('pending');
  });

  it('skips when instance already exists for that def on that date', () => {
    const out = ensureDailyTasksForDate('2026-05-12',
      [def({ id: 'd1' })],
      [task({ definitionId: 'd1', date: '2026-05-12' })],
    );
    expect(out).toHaveLength(0);
  });

  it('skips inactive defs', () => {
    const out = ensureDailyTasksForDate('2026-05-12', [
      def({ id: 'd1', active: false }),
      def({ id: 'd2', active: true }),
    ], []);
    expect(out).toHaveLength(1);
    expect(out[0].definitionId).toBe('d2');
  });

  it('skips weekly defs entirely', () => {
    const out = ensureDailyTasksForDate('2026-05-12', [
      def({ type: 'weekly-min' }),
      def({ type: 'weekly-once' }),
    ], []);
    expect(out).toHaveLength(0);
  });

  it('respects isRequired flag', () => {
    const out = ensureDailyTasksForDate('2026-05-12', [def({ isRequired: true })], []);
    expect(out[0].isRequired).toBe(true);
  });
});

describe('hasInstanceToday', () => {
  it('returns false when no tasks', async () => {
    const { hasInstanceToday } = await import('../src/lib/recurrence');
    expect(hasInstanceToday('d1', '2026-05-12', [])).toBe(false);
  });
  it('returns true when an instance exists for today (any status)', async () => {
    const { hasInstanceToday } = await import('../src/lib/recurrence');
    expect(hasInstanceToday('d1', '2026-05-12', [
      task({ definitionId: 'd1', date: '2026-05-12', status: 'pending' }),
    ])).toBe(true);
    expect(hasInstanceToday('d1', '2026-05-12', [
      task({ definitionId: 'd1', date: '2026-05-12', status: 'evaluated' }),
    ])).toBe(true);
  });
  it('returns false for different date or different def', async () => {
    const { hasInstanceToday } = await import('../src/lib/recurrence');
    expect(hasInstanceToday('d1', '2026-05-12', [
      task({ definitionId: 'd1', date: '2026-05-11' }),
    ])).toBe(false);
    expect(hasInstanceToday('d1', '2026-05-12', [
      task({ definitionId: 'd2', date: '2026-05-12' }),
    ])).toBe(false);
  });
});

describe('makeWeeklyInstance', () => {
  it('creates a task tied to the weekly def', () => {
    const t = makeWeeklyInstance(def({ id: 'w1', type: 'weekly-min', weeklyMinTimes: 3 }), '2026-05-12');
    expect(t.definitionId).toBe('w1');
    expect(t.taskType).toBe('weekly');         // R5.1.0: weekly-min → weekly
    expect(t.status).toBe('pending');
  });
});

describe('weeklyProgress', () => {
  it('counts done/evaluated tasks linked to a def this week', () => {
    const d = def({ id: 'w1', type: 'weekly-min', weeklyMinTimes: 3 });
    const tasks: Task[] = [
      task({ definitionId: 'w1', status: 'evaluated', completedAt: new Date('2026-05-12T10:00').getTime() }),
      task({ definitionId: 'w1', status: 'done', completedAt: new Date('2026-05-13T10:00').getTime() }),
      task({ definitionId: 'w1', status: 'pending' }), // not counted
      task({ definitionId: 'other', status: 'evaluated', completedAt: new Date('2026-05-12T10:00').getTime() }), // wrong def
    ];
    const p = weeklyProgress(d, tasks, new Date('2026-05-14T10:00'));
    expect(p.done).toBe(2);
    expect(p.target).toBe(3);
    expect(p.achieved).toBe(false);
  });

  it('weekly-once target is always 1', () => {
    const d = def({ type: 'weekly-once' });
    expect(weeklyProgress(d, [], new Date()).target).toBe(1);
  });

  it('detects achieved when done >= target', () => {
    const d = def({ id: 'w1', type: 'weekly-min', weeklyMinTimes: 2 });
    const tasks: Task[] = [
      task({ definitionId: 'w1', status: 'done', completedAt: new Date('2026-05-12T10:00').getTime() }),
      task({ definitionId: 'w1', status: 'evaluated', completedAt: new Date('2026-05-13T10:00').getTime() }),
    ];
    const p = weeklyProgress(d, tasks, new Date('2026-05-14T10:00'));
    expect(p.achieved).toBe(true);
  });
});

describe('activeWeeklyDefinitions', () => {
  it('filters to active weekly types', () => {
    const defs = [
      def({ id: '1', type: 'daily-required' }),
      def({ id: '2', type: 'weekly-min', active: true }),
      def({ id: '3', type: 'weekly-once', active: false }),
      def({ id: '4', type: 'weekly-once', active: true }),
    ];
    const out = activeWeeklyDefinitions(defs);
    expect(out.map(d => d.id).sort()).toEqual(['2', '4']);
  });
});
