// R4.2.0: 心愿池机制 — 集成测试（用 fake-indexeddb）
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import {
  openPool, streamPoints, cancelPool, fulfillPool,
  ENDOWED_BONUS_RATIO, COMMITMENT_LOCK_DAYS, CANCEL_REFUND_RATIO,
  progressPct, isUnlocked, inSprintZone,
} from '../src/lib/wishingPool';
import type { ShopItem, WishingPool } from '../src/types';

const DAY = 24 * 3600 * 1000;

async function reset() {
  await db.delete();
  await db.open();
}

async function seedWishableItem(over: Partial<ShopItem> = {}): Promise<ShopItem> {
  const item: ShopItem = {
    id: 'big-lego', name: '大乐高', emoji: '🧱',
    costPoints: 4500, stockPerWeek: 1,
    redeemedThisWeek: 0, weekKey: null, enabled: true,
    category: 'toy', tier: 'long', rotationStatus: 'displayed',
    isWishable: true,
    ...over,
  };
  await db.shop.put(item);
  return item;
}

beforeEach(async () => {
  await reset();
});

describe('openPool', () => {
  it('returns item_not_found when item missing', async () => {
    const r = await openPool(db, 'nope');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('item_not_found');
  });

  it('returns item_not_wishable for non-wishable items', async () => {
    await seedWishableItem({ id: 'small', costPoints: 100, isWishable: false, tier: 'instant' });
    const r = await openPool(db, 'small');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('item_not_wishable');
  });

  it('opens pool with 12% endowed bonus + 7-day lock', async () => {
    await seedWishableItem();
    const t0 = Date.now();
    const r = await openPool(db, 'big-lego', t0);
    expect(r.ok).toBe(true);
    const pool = await db.wishingPool.get('singleton');
    expect(pool).toBeDefined();
    expect(pool!.shopItemId).toBe('big-lego');
    expect(pool!.startBonusPoints).toBe(Math.round(4500 * ENDOWED_BONUS_RATIO));
    expect(pool!.currentProgress).toBe(pool!.startBonusPoints);   // 起步 = 进度
    expect(pool!.targetPoints).toBe(4500);
    expect(pool!.lockedUntil).toBe(t0 + COMMITMENT_LOCK_DAYS * DAY);
  });

  it('rejects when a pool already exists (not fulfilled)', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    const r = await openPool(db, 'big-lego');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('pool_already_open');
  });

  it('allows reopening after fulfillment', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    await db.wishingPool.update('singleton', { fulfilledAt: Date.now() });
    const r2 = await openPool(db, 'big-lego');
    expect(r2.ok).toBe(true);
  });
});

describe('streamPoints', () => {
  it('flows positive delta into pool by autoStreamRatio', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    const before = (await db.wishingPool.get('singleton'))!.currentProgress;
    await streamPoints(db, 100);
    const after = (await db.wishingPool.get('singleton'))!.currentProgress;
    expect(after - before).toBe(50);     // 50% of 100
  });

  it('caps at target', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    await streamPoints(db, 999_999);
    const pool = await db.wishingPool.get('singleton');
    expect(pool!.currentProgress).toBe(4500);
  });

  it('ignores when no pool', async () => {
    await streamPoints(db, 100);
    const pool = await db.wishingPool.get('singleton');
    expect(pool).toBeUndefined();
  });

  it('ignores when pool already fulfilled', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    await db.wishingPool.update('singleton', { fulfilledAt: Date.now(), currentProgress: 4500 });
    await streamPoints(db, 200);
    const pool = await db.wishingPool.get('singleton');
    expect(pool!.currentProgress).toBe(4500);
  });

  it('ignores zero / negative deltas', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    const before = (await db.wishingPool.get('singleton'))!.currentProgress;
    await streamPoints(db, 0);
    await streamPoints(db, -100);
    const after = (await db.wishingPool.get('singleton'))!.currentProgress;
    expect(after).toBe(before);
  });
});

describe('cancelPool', () => {
  it('rejects when locked (within 7 days)', async () => {
    await seedWishableItem();
    const t0 = Date.now();
    await openPool(db, 'big-lego', t0);
    const r = await cancelPool(db, t0 + 1 * DAY, async () => {});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('still_locked');
  });

  it('refunds 70% of earned (not endowed bonus)', async () => {
    await seedWishableItem();
    const t0 = Date.now();
    await openPool(db, 'big-lego', t0);   // start = 540
    // 模拟流入 1000 → currentProgress = 540 + 1000 = 1540
    await streamPoints(db, 2000);          // 50% → +1000
    let refundCalled = 0;
    const r = await cancelPool(db, t0 + 8 * DAY, async (delta, reason, refId) => {
      refundCalled = delta;
      expect(reason).toBe('wishing_pool_cancel_refund');
      expect(refId).toBe('big-lego');
    });
    expect(r.ok).toBe(true);
    // earned = 1540 - 540 = 1000；refund = 1000 × 0.7 = 700
    expect(r.refundedPoints).toBe(700);
    expect(refundCalled).toBe(700);
    const pool = await db.wishingPool.get('singleton');
    expect(pool).toBeUndefined();
  });

  it('does not refund anything if zero earned', async () => {
    await seedWishableItem();
    const t0 = Date.now();
    await openPool(db, 'big-lego', t0);
    let refundCalled = 0;
    const r = await cancelPool(db, t0 + 8 * DAY, async (d) => { refundCalled += d; });
    expect(r.ok).toBe(true);
    expect(r.refundedPoints).toBe(0);
    expect(refundCalled).toBe(0);
  });
});

describe('fulfillPool', () => {
  it('rejects when not yet complete', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    const r = await fulfillPool(db, Date.now(), p => p + '_test');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not_complete');
  });

  it('moves item to redemptions and marks pool fulfilled', async () => {
    await seedWishableItem();
    await openPool(db, 'big-lego');
    await streamPoints(db, 999_999);   // 满了
    const r = await fulfillPool(db, Date.now(), p => p + '_test');
    expect(r.ok).toBe(true);
    expect(r.redemptionId).toBeDefined();
    const reds = await db.redemptions.toArray();
    expect(reds).toHaveLength(1);
    expect(reds[0].shopItemId).toBe('big-lego');
    expect(reds[0].costPoints).toBe(4500);
    const pool = await db.wishingPool.get('singleton');
    expect(pool!.fulfilledAt).toBeDefined();
  });
});

describe('helper functions', () => {
  function pool(over: Partial<WishingPool> = {}): WishingPool {
    return {
      id: 'singleton', shopItemId: 'x',
      openedAt: 1000, startBonusPoints: 100,
      currentProgress: 100, targetPoints: 1000,
      autoStreamRatio: 0.5, lockedUntil: 1000 + 7 * DAY,
      ...over,
    };
  }
  it('progressPct caps at 100', () => {
    expect(progressPct(pool({ currentProgress: 500 }))).toBe(50);
    expect(progressPct(pool({ currentProgress: 1000 }))).toBe(100);
    expect(progressPct(pool({ currentProgress: 9999 }))).toBe(100);
  });
  it('isUnlocked respects lockedUntil', () => {
    expect(isUnlocked(pool(), 1000 + 1 * DAY)).toBe(false);
    expect(isUnlocked(pool(), 1000 + 8 * DAY)).toBe(true);
  });
  it('inSprintZone is true between 80% and 100%', () => {
    expect(inSprintZone(pool({ currentProgress: 700 }))).toBe(false);  // 70%
    expect(inSprintZone(pool({ currentProgress: 800 }))).toBe(true);   // 80%
    expect(inSprintZone(pool({ currentProgress: 999 }))).toBe(true);
    expect(inSprintZone(pool({ currentProgress: 1000 }))).toBe(false); // 满 → 不算冲刺
  });
});
