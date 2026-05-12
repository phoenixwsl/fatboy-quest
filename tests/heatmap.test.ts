import { describe, it, expect } from 'vitest';
import { compute7DayHeatmap } from '../src/lib/heatmap';
import type { Task } from '../src/types';

const t = (date: string, status: Task['status']): Task => ({
  id: Math.random().toString(),
  title: 'x', date, basePoints: 20, estimatedMinutes: 25,
  subject: 'math', status, createdAt: 0,
});

describe('compute7DayHeatmap', () => {
  it('returns 7 cells ending at today', () => {
    const cells = compute7DayHeatmap([], '2026-05-12');
    expect(cells).toHaveLength(7);
    expect(cells[6].date).toBe('2026-05-12');
    expect(cells[0].date).toBe('2026-05-06');
  });

  it('marks days with no tasks as none', () => {
    const cells = compute7DayHeatmap([], '2026-05-12');
    expect(cells.every(c => c.status === 'none')).toBe(true);
  });

  it('marks fully completed as full', () => {
    const tasks = [t('2026-05-12', 'evaluated'), t('2026-05-12', 'done')];
    const cells = compute7DayHeatmap(tasks, '2026-05-12');
    expect(cells[6].status).toBe('full');
    expect(cells[6].completed).toBe(2);
    expect(cells[6].total).toBe(2);
  });

  it('marks partial completion', () => {
    const tasks = [t('2026-05-12', 'evaluated'), t('2026-05-12', 'pending')];
    const cells = compute7DayHeatmap(tasks, '2026-05-12');
    expect(cells[6].status).toBe('partial');
  });

  it('marks tasks but none done as none', () => {
    const tasks = [t('2026-05-12', 'pending')];
    const cells = compute7DayHeatmap(tasks, '2026-05-12');
    expect(cells[6].status).toBe('none');
    expect(cells[6].total).toBe(1);
  });
});
