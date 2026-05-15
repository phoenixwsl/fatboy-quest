// R4.3.0: mastery framing 文案
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import { buildMasteryContext, pickMasteryFlavor, MASTERY_TEMPLATES } from '../src/lib/mastery';
import type { ShopItem, Task, Evaluation } from '../src/types';

async function reset() {
  await db.delete();
  await db.open();
}

const item: ShopItem = {
  id: 'test', name: 'DQ 雪糕券', emoji: '🍦',
  costPoints: 300, stockPerWeek: 1,
  redeemedThisWeek: 0, weekKey: null, enabled: true,
  category: 'food', tier: 'mid', rotationStatus: 'displayed',
};

beforeEach(async () => {
  await reset();
});

describe('buildMasteryContext', () => {
  it('counts weekly evaluated and finds hardest', async () => {
    const now = new Date('2026-05-15T12:00:00');
    const ts = now.getTime() - 1000;
    await db.tasks.bulkAdd([
      { id: 't1', title: '简单题', date: '2026-05-13', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 1, completedAt: ts, difficulty: 'bronze' },
      { id: 't2', title: '难题', date: '2026-05-14', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 2, completedAt: ts, difficulty: 'gold' },
      { id: 't3', title: '中题', date: '2026-05-13', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 3, completedAt: ts, difficulty: 'silver' },
    ] as Task[]);
    const ctx = await buildMasteryContext(db, now);
    expect(ctx.weeklyEvaluated).toBe(3);
    expect(ctx.hardestThisWeek?.title).toBe('难题');
    expect(ctx.hardestThisWeek?.difficulty).toBe('gold');
  });

  it('reads streak', async () => {
    await db.streak.put({
      id: 'singleton', currentStreak: 5, longestStreak: 8,
      lastFullDate: '2026-05-15', guardCards: 0, lastWeeklyGiftWeek: null,
    });
    const ctx = await buildMasteryContext(db);
    expect(ctx.currentStreak).toBe(5);
  });

  it('counts month gold tasks', async () => {
    const now = new Date('2026-05-15T12:00:00');
    const ts = now.getTime() - 1000;
    await db.tasks.bulkAdd([
      { id: 'g1', title: 'gold a', date: '2026-05-01', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 1, completedAt: ts, difficulty: 'gold' },
      { id: 'g2', title: 'gold b', date: '2026-05-10', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 2, completedAt: ts, difficulty: 'gold' },
      { id: 'b1', title: 'bronze', date: '2026-05-12', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 3, completedAt: ts, difficulty: 'bronze' },
    ] as Task[]);
    const ctx = await buildMasteryContext(db, now);
    expect(ctx.monthGold).toBe(2);
  });

  it('counts existing redemptions', async () => {
    await db.redemptions.bulkAdd([
      { id: 'r1', shopItemId: 'x', shopItemName: 'a', costPoints: 50, redeemedAt: 1 },
      { id: 'r2', shopItemId: 'x', shopItemName: 'b', costPoints: 50, redeemedAt: 2 },
    ] as any);
    const ctx = await buildMasteryContext(db);
    expect(ctx.totalRedemptionsBefore).toBe(2);
  });
});

describe('pickMasteryFlavor', () => {
  it('falls back when no template applicable', () => {
    const ctx = {
      weeklyEvaluated: 0,
      hardestThisWeek: undefined,
      currentStreak: 0,
      monthGold: 0,
      totalRedemptionsBefore: 0,
      daysSinceStart: 0,
    };
    const text = pickMasteryFlavor(ctx, item);
    expect(text).toContain(item.name);
    expect(text).toContain('赚来的');
  });

  it('uses streak-stable template for streak ≥ 3', () => {
    const ctx = {
      weeklyEvaluated: 0,
      hardestThisWeek: undefined,
      currentStreak: 5,
      monthGold: 0,
      totalRedemptionsBefore: 0,
      daysSinceStart: 1,
    };
    // Force pick streak-stable by rng
    const streakIdx = MASTERY_TEMPLATES.findIndex(t => t.id === 'streak-stable');
    const applicable = MASTERY_TEMPLATES.filter(t => t.applicable(ctx));
    const myIdx = applicable.findIndex(t => t.id === 'streak-stable');
    const rng = () => myIdx / applicable.length;
    const text = pickMasteryFlavor(ctx, item, rng);
    expect(text).toContain('5 天');
    expect(streakIdx).toBeGreaterThan(-1);
  });

  it('weekly-hardest template includes hardest task title', () => {
    const ctx = {
      weeklyEvaluated: 4,
      hardestThisWeek: { title: '应用题', difficulty: 'gold' as const },
      currentStreak: 0,
      monthGold: 0,
      totalRedemptionsBefore: 0,
      daysSinceStart: 5,
    };
    // Force pick weekly-hardest
    const applicable = MASTERY_TEMPLATES.filter(t => t.applicable(ctx));
    const myIdx = applicable.findIndex(t => t.id === 'weekly-hardest');
    const rng = () => myIdx / applicable.length;
    const text = pickMasteryFlavor(ctx, item, rng);
    expect(text).toContain('应用题');
    expect(text).toContain('4 个任务');
    expect(text).toContain('金');
  });
});

describe('MASTERY_TEMPLATES applicability', () => {
  it('streak-stable needs ≥ 3 streak', () => {
    const t = MASTERY_TEMPLATES.find(t => t.id === 'streak-stable')!;
    expect(t.applicable({ currentStreak: 2 } as any)).toBe(false);
    expect(t.applicable({ currentStreak: 3 } as any)).toBe(true);
  });
  it('weekly-hardest needs both weeklyEvaluated > 0 and hardestThisWeek', () => {
    const t = MASTERY_TEMPLATES.find(t => t.id === 'weekly-hardest')!;
    expect(t.applicable({ weeklyEvaluated: 0, hardestThisWeek: { title: 'x', difficulty: 'gold' } } as any)).toBe(false);
    expect(t.applicable({ weeklyEvaluated: 1, hardestThisWeek: undefined } as any)).toBe(false);
    expect(t.applicable({ weeklyEvaluated: 1, hardestThisWeek: { title: 'x', difficulty: 'gold' } } as any)).toBe(true);
  });
});
