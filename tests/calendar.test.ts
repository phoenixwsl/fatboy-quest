import { describe, it, expect } from 'vitest';
import { aggregateMonth } from '../src/lib/calendar';
import type { Task, Evaluation, PointsEntry } from '../src/types';

const t = (date: string, status: Task['status']): Task => ({
  id: Math.random().toString(),
  title: 'x', date, basePoints: 20, estimatedMinutes: 25,
  subject: 'math', status, createdAt: 0,
});

describe('aggregateMonth', () => {
  it('returns days in month', () => {
    const days = aggregateMonth([], [], [], 2026, 5);
    expect(days).toHaveLength(31);
  });

  it('zero level for empty day', () => {
    const days = aggregateMonth([], [], [], 2026, 5);
    expect(days.every(d => d.level === 0)).toBe(true);
  });

  it('level 3 when all tasks done', () => {
    const tasks = [t('2026-05-12', 'done'), t('2026-05-12', 'evaluated')];
    const days = aggregateMonth(tasks, [], [], 2026, 5);
    const day = days.find(d => d.date === '2026-05-12')!;
    expect(day.level).toBe(3);
    expect(day.completed).toBe(2);
    expect(day.total).toBe(2);
  });

  it('level 1 when partial', () => {
    const tasks = [t('2026-05-12', 'done'), t('2026-05-12', 'pending'), t('2026-05-12', 'pending')];
    const days = aggregateMonth(tasks, [], [], 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.level).toBe(1);
  });

  it('level 4 (gold) when all evaluated 5/5/5', () => {
    const tasks = [
      { ...t('2026-05-12', 'evaluated'), id: 'a' },
      { ...t('2026-05-12', 'evaluated'), id: 'b' },
    ];
    const evals: Evaluation[] = [
      { id: 'e1', taskId: 'a', basePointsAtEval: 20, completion: 5, quality: 5, attitude: 5, evaluatedAt: 0, finalPoints: 24 },
      { id: 'e2', taskId: 'b', basePointsAtEval: 20, completion: 5, quality: 5, attitude: 5, evaluatedAt: 0, finalPoints: 24 },
    ];
    const days = aggregateMonth(tasks, evals, [], 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.level).toBe(4);
  });

  it('sums points earned per day', () => {
    const points: PointsEntry[] = [
      { id: 'p1', ts: new Date(2026, 4, 12, 10, 0).getTime(), delta: 30, reason: 'a' },
      { id: 'p2', ts: new Date(2026, 4, 12, 11, 0).getTime(), delta: 20, reason: 'a' },
      { id: 'p3', ts: new Date(2026, 4, 12, 12, 0).getTime(), delta: -10, reason: 'spend' },  // 不算
    ];
    const days = aggregateMonth([], [], points, 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.pointsEarned).toBe(50);
  });
});
