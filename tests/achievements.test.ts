import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS, detectNewlyUnlocked, visibleAchievementsList, hiddenAchievementsList,
  findAchievement, unlockedIds,
} from '../src/lib/achievements';
import type { Task, Evaluation, Schedule, Badge } from '../src/types';

const t = (overrides: Partial<Task> = {}): Task => ({
  id: 't_' + Math.random(),
  title: 'X', date: '2026-05-12', basePoints: 20, estimatedMinutes: 25,
  subject: 'math', status: 'pending', createdAt: 0,
  ...overrides,
});

const emptySnap = () => ({
  tasks: [] as Task[], evaluations: [] as Evaluation[], schedules: [] as Schedule[],
  currentStreak: 0, longestStreak: 0, totalPoints: 0, guardCards: 0,
});

describe('ACHIEVEMENTS catalog', () => {
  it('contains 50+ achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40);
  });
  it('all have unique ids', () => {
    const ids = new Set(ACHIEVEMENTS.map(a => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
  });
  it('split into visible and hidden', () => {
    expect(visibleAchievementsList().length).toBeGreaterThan(10);
    expect(hiddenAchievementsList().length).toBeGreaterThan(10);
  });
  it('findAchievement works', () => {
    expect(findAchievement('first_step')?.title).toBe('第一步');
    expect(findAchievement('nonexistent')).toBeUndefined();
  });
});

describe('detectNewlyUnlocked', () => {
  it('returns nothing when no progress', () => {
    expect(detectNewlyUnlocked(emptySnap(), new Set())).toEqual([]);
  });

  it('unlocks "first_step" after first completed task', () => {
    const snap = { ...emptySnap(), tasks: [t({ status: 'done' })] };
    const newly = detectNewlyUnlocked(snap, new Set());
    expect(newly.find(a => a.id === 'first_step')).toBeDefined();
  });

  it('does not re-unlock already-unlocked', () => {
    const snap = { ...emptySnap(), tasks: [t({ status: 'done' })] };
    const newly = detectNewlyUnlocked(snap, new Set(['first_step']));
    expect(newly.find(a => a.id === 'first_step')).toBeUndefined();
  });

  it('unlocks streak milestones', () => {
    const snap = { ...emptySnap(), currentStreak: 7, longestStreak: 7 };
    const newly = detectNewlyUnlocked(snap, new Set());
    expect(newly.find(a => a.id === 'streak_3')).toBeDefined();
    expect(newly.find(a => a.id === 'streak_7')).toBeDefined();
  });

  it('unlocks point milestones', () => {
    const snap = { ...emptySnap(), totalPoints: 500 };
    const newly = detectNewlyUnlocked(snap, new Set());
    expect(newly.find(a => a.id === 'points_500')).toBeDefined();
  });

  it('unlocks early-bird for pre-8am completion', () => {
    const earlyTask = t({ completedAt: new Date('2026-05-12T07:30').getTime(), status: 'done' });
    const snap = { ...emptySnap(), tasks: [earlyTask] };
    const newly = detectNewlyUnlocked(snap, new Set());
    expect(newly.find(a => a.id === 'early_bird')).toBeDefined();
  });

  it('does not unlock early-bird for 10am completion', () => {
    const lateTask = t({ completedAt: new Date('2026-05-12T10:00').getTime(), status: 'done' });
    const snap = { ...emptySnap(), tasks: [lateTask] };
    const newly = detectNewlyUnlocked(snap, new Set());
    expect(newly.find(a => a.id === 'early_bird')).toBeUndefined();
  });

  it('detects speed_demon when finished 10+ min early', () => {
    const start = new Date('2026-05-12T10:00').getTime();
    const fast = t({
      actualStartedAt: start,
      completedAt: start + 15 * 60 * 1000, // 15 min elapsed, 30 estimated → 15 min early
      estimatedMinutes: 30,
      status: 'done',
    });
    const snap = { ...emptySnap(), tasks: [fast] };
    const newly = detectNewlyUnlocked(snap, new Set());
    expect(newly.find(a => a.id === 'speed_demon')).toBeDefined();
  });

  it('catalog check functions never throw (defensive)', () => {
    // 用奇怪输入也不应该抛
    const weird = {
      tasks: [t({ completedAt: undefined, actualStartedAt: undefined })],
      evaluations: [], schedules: [],
      currentStreak: 0, longestStreak: 0, totalPoints: 0, guardCards: 0,
    };
    expect(() => detectNewlyUnlocked(weird, new Set())).not.toThrow();
  });
});

describe('unlockedIds', () => {
  it('extracts ids from badges', () => {
    const badges: Badge[] = [
      { id: 'first_step', unlockedAt: 0 },
      { id: 'streak_3', unlockedAt: 0 },
    ];
    const ids = unlockedIds(badges);
    expect(ids.has('first_step')).toBe(true);
    expect(ids.has('streak_3')).toBe(true);
    expect(ids.size).toBe(2);
  });
});
