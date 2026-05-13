import { describe, it, expect } from 'vitest';
import { aggregateMonth, buildDayDetail } from '../src/lib/calendar';
import type { Task, Evaluation, PointsEntry } from '../src/types';

const t = (date: string, status: Task['status'], id = 't_' + Math.random()): Task => ({
  id, title: 'x', date, basePoints: 20, estimatedMinutes: 25,
  subject: 'math', status, createdAt: 0,
});

describe('aggregateMonth (R2.1.1: by-points levels)', () => {
  it('returns days in month', () => {
    expect(aggregateMonth([], [], [], 2026, 5)).toHaveLength(31);
  });

  it('level 0 when 0 points', () => {
    const tasks = [t('2026-05-12', 'pending')];
    const days = aggregateMonth(tasks, [], [], 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.level).toBe(0);
  });

  it('level 1 when 1-29 points', () => {
    const points: PointsEntry[] = [
      { id: 'p1', ts: new Date(2026, 4, 12, 10).getTime(), delta: 20, reason: 'task' },
    ];
    const days = aggregateMonth([], [], points, 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.level).toBe(1);
  });

  it('level 2 when 30-79 points', () => {
    const points: PointsEntry[] = [
      { id: 'p1', ts: new Date(2026, 4, 12, 10).getTime(), delta: 50, reason: 'task' },
    ];
    const days = aggregateMonth([], [], points, 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.level).toBe(2);
  });

  it('level 3 when 80+ points', () => {
    const points: PointsEntry[] = [
      { id: 'p1', ts: new Date(2026, 4, 12, 10).getTime(), delta: 100, reason: 'task' },
    ];
    const days = aggregateMonth([], [], points, 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.level).toBe(3);
  });

  it('level 4 gold for perfect day (regardless of points)', () => {
    const tasks = [t('2026-05-12', 'evaluated', 'a'), t('2026-05-12', 'evaluated', 'b')];
    const evals: Evaluation[] = [
      { id: 'e1', taskId: 'a', basePointsAtEval: 20, completion: 5, quality: 5, attitude: 5, evaluatedAt: 0, finalPoints: 24 },
      { id: 'e2', taskId: 'b', basePointsAtEval: 20, completion: 5, quality: 5, attitude: 5, evaluatedAt: 0, finalPoints: 24 },
    ];
    const days = aggregateMonth(tasks, evals, [], 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.level).toBe(4);
    expect(days.find(d => d.date === '2026-05-12')!.perfectDay).toBe(true);
  });

  it('NOT perfect when some 4 stars', () => {
    const tasks = [t('2026-05-12', 'evaluated', 'a')];
    const evals: Evaluation[] = [
      { id: 'e1', taskId: 'a', basePointsAtEval: 20, completion: 5, quality: 4, attitude: 5, evaluatedAt: 0, finalPoints: 22 },
    ];
    const days = aggregateMonth(tasks, evals, [], 2026, 5);
    expect(days.find(d => d.date === '2026-05-12')!.perfectDay).toBe(false);
  });
});

describe('buildDayDetail', () => {
  it('returns detail for a date', () => {
    const tasks = [t('2026-05-12', 'evaluated', 'a')];
    const evals: Evaluation[] = [
      { id: 'e1', taskId: 'a', basePointsAtEval: 20, completion: 5, quality: 5, attitude: 5, evaluatedAt: 0, finalPoints: 24 },
    ];
    const points: PointsEntry[] = [
      { id: 'p1', ts: new Date('2026-05-12T10:00').getTime(), delta: 24, reason: 'task_evaluated', refId: 'a' },
      { id: 'p2', ts: new Date('2026-05-12T10:01').getTime(), delta: 5, reason: 'early_bonus', refId: 'a' },
    ];
    const d = buildDayDetail('2026-05-12', tasks, evals, points);
    expect(d.tasks).toHaveLength(1);
    expect(d.tasks[0].evaluation?.finalPoints).toBe(24);
    expect(d.tasks[0].earlyBonus).toBe(5);
    expect(d.totalPoints).toBe(29);
  });

  it('includes combo bonus separately', () => {
    const points: PointsEntry[] = [
      { id: 'p1', ts: new Date('2026-05-12T10:00').getTime(), delta: 20, reason: 'task' },
      { id: 'p2', ts: new Date('2026-05-12T11:00').getTime(), delta: 10, reason: 'combo_bonus' },
    ];
    const d = buildDayDetail('2026-05-12', [], [], points);
    expect(d.comboBonus).toBe(10);
    expect(d.totalPoints).toBe(30);
  });
});
