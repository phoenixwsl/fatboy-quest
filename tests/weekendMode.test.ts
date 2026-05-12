import { describe, it, expect } from 'vitest';
import { isWeekend, isDayCompleteForStreak } from '../src/lib/weekendMode';
import type { Task } from '../src/types';

const task = (status: Task['status']): Task => ({
  id: Math.random().toString(),
  title: 'X', date: '2026-05-12', basePoints: 20, estimatedMinutes: 25,
  subject: 'math', status, createdAt: 0,
});

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    expect(isWeekend(new Date('2026-05-09'))).toBe(true); // Sat
  });
  it('returns true for Sunday', () => {
    expect(isWeekend(new Date('2026-05-10'))).toBe(true); // Sun
  });
  it('returns false for weekdays', () => {
    for (let i = 11; i <= 15; i++) {
      expect(isWeekend(new Date(`2026-05-${String(i).padStart(2,'0')}`))).toBe(false);
    }
  });
});

describe('isDayCompleteForStreak', () => {
  it('returns false when no tasks', () => {
    expect(isDayCompleteForStreak('2026-05-12', [], false)).toBe(false);
    expect(isDayCompleteForStreak('2026-05-12', [], true)).toBe(false);
  });

  it('weekday: requires ALL tasks completed', () => {
    expect(isDayCompleteForStreak('2026-05-12', [task('done'), task('pending')], false)).toBe(false);
    expect(isDayCompleteForStreak('2026-05-12', [task('done'), task('evaluated')], false)).toBe(true);
  });

  it('weekend: requires only 1 task completed', () => {
    expect(isDayCompleteForStreak('2026-05-12', [task('pending'), task('pending')], true)).toBe(false);
    expect(isDayCompleteForStreak('2026-05-12', [task('done'), task('pending')], true)).toBe(true);
    expect(isDayCompleteForStreak('2026-05-12', [task('evaluated'), task('pending')], true)).toBe(true);
  });
});
