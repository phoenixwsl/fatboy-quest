// R4.1.0: 强制轮转算法（纯函数）
import { describe, it, expect } from 'vitest';
import { planRotation, shouldAutoRotate, MIN_DISPLAY_DAYS } from '../src/lib/rotation';
import type { ShopItem } from '../src/types';

const DAY = 24 * 3600 * 1000;

function shop(over: Partial<ShopItem> = {}): ShopItem {
  return {
    id: 's_' + Math.random().toString(36).slice(2, 6),
    name: 'item', emoji: '🎁',
    costPoints: 100, stockPerWeek: 1,
    redeemedThisWeek: 0, weekKey: null, enabled: true,
    rotationStatus: 'displayed',
    tier: 'mid',
    category: 'food',
    ...over,
  };
}

describe('planRotation', () => {
  it('does nothing when displayed items are too new', () => {
    const now = Date.now();
    const items = [
      shop({ id: 'a', lastDisplayedAt: now - 1 * DAY }),
      shop({ id: 'b', lastDisplayedAt: now - 1 * DAY }),
    ];
    const plan = planRotation({ items, now, fixedShelveRatio: 0.5 });
    expect(plan.toShelve).toEqual([]);
  });

  it('shelves some old items + protects three-tier distribution', () => {
    const now = Date.now();
    const old = (id: string, tier: 'instant' | 'mid' | 'long') =>
      shop({ id, tier, lastDisplayedAt: now - (MIN_DISPLAY_DAYS + 5) * DAY });
    const items = [
      old('i1', 'instant'),
      old('m1', 'mid'),
      old('m2', 'mid'),
      old('l1', 'long'),
    ];
    const plan = planRotation({ items, now, fixedShelveRatio: 0.5 });
    // 不能让任何档为 0：i1/l1 是各自档唯一的，必须保
    expect(plan.toShelve).not.toContain('i1');
    expect(plan.toShelve).not.toContain('l1');
  });

  it('refills displayed pool from shelved when below TARGET_MIN', () => {
    const now = Date.now();
    const items = [
      shop({ id: 'd1', tier: 'instant', rotationStatus: 'displayed', lastDisplayedAt: now }),
      shop({ id: 'd2', tier: 'mid',     rotationStatus: 'displayed', lastDisplayedAt: now }),
      // shelved pool（多种 tier）
      shop({ id: 's1', tier: 'instant', rotationStatus: 'shelved', lastDisplayedAt: now - 30 * DAY }),
      shop({ id: 's2', tier: 'mid',     rotationStatus: 'shelved', lastDisplayedAt: now - 25 * DAY }),
      shop({ id: 's3', tier: 'long',    rotationStatus: 'shelved', lastDisplayedAt: now - 20 * DAY }),
      shop({ id: 's4', tier: 'long',    rotationStatus: 'shelved', lastDisplayedAt: now - 15 * DAY }),
    ];
    const plan = planRotation({ items, now });
    // 当前 displayed 只有 2 件 → 应该补到至少 5 件
    expect(plan.toDisplay.length).toBeGreaterThanOrEqual(3);
    // long tier 当前为 0 → 至少补 1 件 long
    const longCandidates = ['s3', 's4'];
    expect(longCandidates.some(id => plan.toDisplay.includes(id))).toBe(true);
  });

  it('skips locked + wished items', () => {
    const now = Date.now();
    const items = [
      shop({ id: 'locked', isLocked: true, lastDisplayedAt: now - 100 * DAY }),
      shop({ id: 'wished', lastDisplayedAt: now - 100 * DAY }),
      shop({ id: 'normal', lastDisplayedAt: now - 100 * DAY }),
    ];
    const plan = planRotation({
      items, now, wishedItemId: 'wished',
      fixedShelveRatio: 1.0,    // 强制下架全部候选
    });
    expect(plan.toShelve).not.toContain('locked');
    expect(plan.toShelve).not.toContain('wished');
  });

  it('rationale describes the changes', () => {
    const now = Date.now();
    const items = [shop({ id: 'a' }), shop({ id: 'b' })];
    const plan = planRotation({ items, now });
    expect(typeof plan.rationale).toBe('string');
    expect(plan.rationale.length).toBeGreaterThan(0);
  });
});

describe('shouldAutoRotate', () => {
  // 用一个工作日来算"周一"
  const wednesday = new Date(2026, 4, 13);  // 周三
  const lastMonday = new Date(2026, 4, 11).setHours(0, 0, 0, 0);

  it('triggers when no last rotation', () => {
    expect(shouldAutoRotate(undefined, wednesday)).toBe(true);
  });
  it('triggers when last rotation was before this week monday', () => {
    expect(shouldAutoRotate(lastMonday - 1, wednesday)).toBe(true);
  });
  it('does not trigger when last rotation was already this week', () => {
    expect(shouldAutoRotate(lastMonday + 1, wednesday)).toBe(false);
  });
});
