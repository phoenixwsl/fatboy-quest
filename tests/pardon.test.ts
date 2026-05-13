// R2.5.D 单测：豁免券推导 / 断击检测 / 应用补丁
import { describe, it, expect } from 'vitest';
import {
  effectivePardonCards, isStreakBroken, applyPardonToStreak, WEEKLY_PARDON_QUOTA,
} from '../src/lib/pardon';
import { addDays, isoWeekString } from '../src/lib/time';
import type { StreakState } from '../src/types';

const today = '2026-05-13';
const thisWeek = isoWeekString(new Date(today));

const s = (over: Partial<StreakState> = {}): StreakState => ({
  id: 'singleton',
  currentStreak: 5,
  longestStreak: 10,
  lastFullDate: addDays(today, -1),
  guardCards: 0,
  lastWeeklyGiftWeek: null,
  ...over,
});

describe('effectivePardonCards', () => {
  it('undefined streak → 默认配额 + 需要 reset', () => {
    const r = effectivePardonCards(undefined, today);
    expect(r.remaining).toBe(WEEKLY_PARDON_QUOTA);
    expect(r.needsReset).toBe(true);
  });
  it('跨周 → 重置', () => {
    const r = effectivePardonCards(s({
      lastPardonResetWeek: 'OLD-WEEK',
      pardonCardsThisWeek: 0,
    }), today);
    expect(r.remaining).toBe(WEEKLY_PARDON_QUOTA);
    expect(r.needsReset).toBe(true);
  });
  it('同周 → 保持当前剩余', () => {
    const r = effectivePardonCards(s({
      lastPardonResetWeek: thisWeek,
      pardonCardsThisWeek: 1,
    }), today);
    expect(r.remaining).toBe(1);
    expect(r.needsReset).toBe(false);
  });
});

describe('isStreakBroken', () => {
  it('无 streak → false', () => {
    expect(isStreakBroken(undefined, today)).toBe(false);
  });
  it('currentStreak=0 → false', () => {
    expect(isStreakBroken(s({ currentStreak: 0 }), today)).toBe(false);
  });
  it('lastFullDate 是昨天 → 未断', () => {
    expect(isStreakBroken(s({ lastFullDate: addDays(today, -1) }), today)).toBe(false);
  });
  it('lastFullDate 是今天 → 未断', () => {
    expect(isStreakBroken(s({ lastFullDate: today }), today)).toBe(false);
  });
  it('lastFullDate 距今 ≥ 2 天 → 已断', () => {
    expect(isStreakBroken(s({ lastFullDate: addDays(today, -2) }), today)).toBe(true);
    expect(isStreakBroken(s({ lastFullDate: addDays(today, -7) }), today)).toBe(true);
  });
});

describe('applyPardonToStreak', () => {
  it('正常用券 → -1 张 + lastFullDate 推到昨天', () => {
    const broken = s({
      lastFullDate: addDays(today, -3),
      lastPardonResetWeek: thisWeek,
      pardonCardsThisWeek: 2,
    });
    const patch = applyPardonToStreak(broken, today);
    expect(patch.pardonCardsThisWeek).toBe(1);
    expect(patch.lastFullDate).toBe(addDays(today, -1));
    expect(patch.lastPardonResetWeek).toBe(thisWeek);
  });
  it('没卡了 → 抛 no_cards', () => {
    const broken = s({
      lastFullDate: addDays(today, -3),
      lastPardonResetWeek: thisWeek,
      pardonCardsThisWeek: 0,
    });
    expect(() => applyPardonToStreak(broken, today)).toThrow(/no_cards/);
  });
  it('没断击就调用 → 抛 not_broken', () => {
    const notBroken = s({
      lastFullDate: addDays(today, -1),
      lastPardonResetWeek: thisWeek,
      pardonCardsThisWeek: 2,
    });
    expect(() => applyPardonToStreak(notBroken, today)).toThrow(/not_broken/);
  });
  it('跨周自动重置后才用券', () => {
    const broken = s({
      lastFullDate: addDays(today, -3),
      lastPardonResetWeek: 'OLD-WEEK',  // 上周
      pardonCardsThisWeek: 0,            // 上周用光了
    });
    const patch = applyPardonToStreak(broken, today);
    // 应当用今周的新配额 → 用掉 1 → 剩 1
    expect(patch.pardonCardsThisWeek).toBe(1);
    expect(patch.lastPardonResetWeek).toBe(thisWeek);
  });
});
