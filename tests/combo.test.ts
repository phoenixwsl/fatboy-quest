import { describe, it, expect } from 'vitest';
import { calcCombo, comboPctForLength, comboBonusPoints } from '../src/lib/combo';
import type { Schedule, Task } from '../src/types';

const t = (id: string, status: Task['status'] = 'evaluated', undoCount = 0): Task => ({
  id, title: id, date: '2026-05-12', basePoints: 20,
  estimatedMinutes: 30, subject: 'math', status, createdAt: 0, undoCount,
});

const sched = (taskIds: (string | 'rest')[]): Schedule => ({
  id: 's', date: '2026-05-12', round: 1,
  items: taskIds.map((id, i) => id === 'rest'
    ? { kind: 'rest' as const, startMinute: i * 30, durationMinutes: 10 }
    : { kind: 'task' as const, taskId: id, startMinute: i * 30, durationMinutes: 25 }),
});

describe('comboPctForLength', () => {
  it('maps lengths to bonus percentages', () => {
    expect(comboPctForLength(0)).toBe(0);
    expect(comboPctForLength(1)).toBe(0);
    expect(comboPctForLength(2)).toBe(0.05);
    expect(comboPctForLength(3)).toBe(0.1);
    expect(comboPctForLength(4)).toBe(0.2);
    expect(comboPctForLength(5)).toBe(0.5);
    expect(comboPctForLength(10)).toBe(0.5);
  });
});

describe('calcCombo', () => {
  it('returns 0 when round is empty', () => {
    const r = calcCombo({ id: 's', date: '', round: 1, items: [] }, new Map());
    expect(r.peak).toBe(0);
    expect(r.bonusPct).toBe(0);
  });

  it('counts consecutive completed tasks as combo', () => {
    const tasks = new Map([['a', t('a')], ['b', t('b')], ['c', t('c')]]);
    const r = calcCombo(sched(['a', 'b', 'c']), tasks);
    expect(r.peak).toBe(3);
    expect(r.bonusPct).toBe(0.1);
    expect(r.contributingTaskIds).toEqual(['a', 'b', 'c']);
  });

  it('rests do not break combo', () => {
    const tasks = new Map([['a', t('a')], ['b', t('b')]]);
    const r = calcCombo(sched(['a', 'rest', 'b']), tasks);
    expect(r.peak).toBe(2);
  });

  it('undone task breaks combo', () => {
    const tasks = new Map([['a', t('a')], ['b', t('b', 'evaluated', 1)], ['c', t('c')]]);
    const r = calcCombo(sched(['a', 'b', 'c']), tasks);
    // a alone = 1, c alone = 1, peak = 1
    expect(r.peak).toBe(1);
  });

  it('uncompleted task breaks combo', () => {
    const tasks = new Map([['a', t('a')], ['b', t('b', 'scheduled')], ['c', t('c')]]);
    const r = calcCombo(sched(['a', 'b', 'c']), tasks);
    expect(r.peak).toBe(1);
  });

  it('5+ consecutive triggers max bonus', () => {
    const tasks = new Map(['a','b','c','d','e','f'].map(id => [id, t(id)]));
    const r = calcCombo(sched(['a','b','c','d','e','f']), tasks);
    expect(r.peak).toBe(6);
    expect(r.bonusPct).toBe(0.5);
  });

  it('done (not yet evaluated) tasks still count for combo', () => {
    const tasks = new Map([['a', t('a', 'done')], ['b', t('b', 'done')]]);
    const r = calcCombo(sched(['a', 'b']), tasks);
    expect(r.peak).toBe(2);
  });

  it('peak comes from longest streak, not last streak', () => {
    const tasks = new Map([
      ['a', t('a')], ['b', t('b')], ['c', t('c')],   // streak 3
      ['d', t('d', 'scheduled')],                       // break
      ['e', t('e')],                                    // streak 1
    ]);
    const r = calcCombo(sched(['a','b','c','d','e']), tasks);
    expect(r.peak).toBe(3);
    expect(r.contributingTaskIds).toEqual(['a', 'b', 'c']);
  });
});

describe('comboBonusPoints', () => {
  it('rounds the bonus', () => {
    expect(comboBonusPoints(100, 0.1)).toBe(10);
    expect(comboBonusPoints(33, 0.5)).toBe(17);   // 16.5 → 17
  });
  it('returns 0 for no bonus', () => {
    expect(comboBonusPoints(100, 0)).toBe(0);
  });
});
