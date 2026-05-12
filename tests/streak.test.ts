import { describe, it, expect } from 'vitest';
import { applyDayComplete, maybeGrantWeeklyGuardCard, MILESTONES, addDays } from '../src/lib/streak';
import type { StreakState } from '../src/types';

const baseState: StreakState = {
  id: 'singleton',
  currentStreak: 0,
  longestStreak: 0,
  lastFullDate: null,
  guardCards: 0,
  lastWeeklyGiftWeek: null,
};

describe('applyDayComplete', () => {
  it('starts streak from 0 on first complete day', () => {
    const r = applyDayComplete(baseState, '2026-05-12');
    expect(r.state.currentStreak).toBe(1);
    expect(r.state.longestStreak).toBe(1);
    expect(r.state.lastFullDate).toBe('2026-05-12');
  });

  it('increments streak on consecutive days', () => {
    const r1 = applyDayComplete(baseState, '2026-05-12');
    const r2 = applyDayComplete(r1.state, '2026-05-13');
    const r3 = applyDayComplete(r2.state, '2026-05-14');
    expect(r3.state.currentStreak).toBe(3);
  });

  it('is idempotent for same day', () => {
    const r1 = applyDayComplete(baseState, '2026-05-12');
    const r2 = applyDayComplete(r1.state, '2026-05-12');
    expect(r2.state.currentStreak).toBe(1);
    expect(r2.milestonesHit).toHaveLength(0);
  });

  it('resets streak when gap > 1 and no guard cards', () => {
    const day1 = applyDayComplete(baseState, '2026-05-12');
    const day3 = applyDayComplete(day1.state, '2026-05-14');
    expect(day3.state.currentStreak).toBe(1);
  });

  it('uses guard cards to survive a missed day', () => {
    const withGuard: StreakState = { ...baseState, currentStreak: 5, longestStreak: 5, lastFullDate: '2026-05-10', guardCards: 1 };
    const r = applyDayComplete(withGuard, '2026-05-12'); // 跳过 5-11
    expect(r.state.currentStreak).toBe(6);
    expect(r.state.guardCards).toBe(0);
  });

  it('resets streak when missing days exceed guard cards', () => {
    const withGuard: StreakState = { ...baseState, currentStreak: 5, longestStreak: 5, lastFullDate: '2026-05-10', guardCards: 1 };
    const r = applyDayComplete(withGuard, '2026-05-13'); // 跳过 11、12 = 2 天，只有 1 张卡
    expect(r.state.currentStreak).toBe(1);
    expect(r.state.guardCards).toBe(1); // 没消耗
  });

  it('triggers 7-day milestone exactly at day 7', () => {
    let s = baseState;
    let date = '2026-05-12';
    for (let i = 0; i < 6; i++) {
      const r = applyDayComplete(s, date);
      s = r.state;
      date = addDays(date, 1);
    }
    const r7 = applyDayComplete(s, date);
    expect(r7.state.currentStreak).toBe(7);
    expect(r7.milestonesHit.some(m => m.day === 7)).toBe(true);
  });

  it('triggers weekly gift at day 7 and gives a guard card', () => {
    let s = baseState;
    let date = '2026-05-12';
    let lastResult;
    for (let i = 0; i < 7; i++) {
      lastResult = applyDayComplete(s, date);
      s = lastResult.state;
      date = addDays(date, 1);
    }
    expect(lastResult!.weeklyGift).not.toBeNull();
    expect(lastResult!.weeklyGift!.points).toBe(100); // 第 1 周
    // 守护卡应该增加了 1
    expect(lastResult!.state.guardCards).toBe(1);
  });

  it('updates longestStreak', () => {
    let s: StreakState = { ...baseState, currentStreak: 10, longestStreak: 10, lastFullDate: '2026-05-01' };
    const r = applyDayComplete(s, '2026-05-15'); // 重置
    expect(r.state.currentStreak).toBe(1);
    expect(r.state.longestStreak).toBe(10); // 保留最高纪录
  });
});

describe('maybeGrantWeeklyGuardCard', () => {
  it('grants a card if no gift this week', () => {
    const s = maybeGrantWeeklyGuardCard(baseState, new Date('2026-05-12'));
    expect(s.guardCards).toBe(1);
    expect(s.lastWeeklyGiftWeek).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('does not double-grant in same week', () => {
    const s1 = maybeGrantWeeklyGuardCard(baseState, new Date('2026-05-12'));
    const s2 = maybeGrantWeeklyGuardCard(s1, new Date('2026-05-14'));
    expect(s2.guardCards).toBe(1);
  });

  it('grants again in next week', () => {
    const s1 = maybeGrantWeeklyGuardCard(baseState, new Date('2026-05-12'));
    const s2 = maybeGrantWeeklyGuardCard(s1, new Date('2026-05-19')); // next week
    expect(s2.guardCards).toBe(2);
  });
});

describe('MILESTONES sanity', () => {
  it('are sorted by day', () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].day).toBeGreaterThan(MILESTONES[i - 1].day);
    }
  });

  it('all have positive points', () => {
    for (const m of MILESTONES) expect(m.points).toBeGreaterThan(0);
  });
});
