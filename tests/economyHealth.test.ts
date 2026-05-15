// R4.4.0: 经济健康度纯函数
import { describe, it, expect } from 'vitest';
import {
  computeEconomyHealth, STALE_DAYS, DOMINANCE_PCT,
} from '../src/lib/economyHealth';
import type { PointsEntry, Redemption, ShopItem } from '../src/types';

const DAY = 24 * 3600 * 1000;
const NOW = new Date('2026-05-15T12:00:00').getTime();

function p(over: Partial<PointsEntry> = {}): PointsEntry {
  return { id: 'p_' + Math.random(), ts: NOW, delta: 10, reason: 'task', ...over };
}
function r(over: Partial<Redemption> = {}): Redemption {
  return { id: 'r_' + Math.random(), shopItemId: 'x', shopItemName: 'X', costPoints: 50, redeemedAt: NOW, ...over };
}
function shop(over: Partial<ShopItem> = {}): ShopItem {
  return {
    id: 's', name: 'item', emoji: '🎁',
    costPoints: 100, stockPerWeek: 1,
    redeemedThisWeek: 0, weekKey: null, enabled: true,
    ...over,
  };
}

describe('computeEconomyHealth — basic metrics', () => {
  it('income / spend / net within 30d window', () => {
    const entries = [
      p({ ts: NOW - 10 * DAY, delta: 100 }),     // in
      p({ ts: NOW - 20 * DAY, delta: 50 }),
      p({ ts: NOW - 5  * DAY, delta: -30 }),     // out
      p({ ts: NOW - 40 * DAY, delta: 999 }),     // outside window
    ];
    const { metrics } = computeEconomyHealth(entries, [], [], NOW);
    expect(metrics.income30d).toBe(150);
    expect(metrics.spend30d).toBe(30);
    expect(metrics.net30d).toBe(120);
  });

  it('counts last-7-day redemptions', () => {
    const reds = [
      r({ redeemedAt: NOW - 1 * DAY }),
      r({ redeemedAt: NOW - 6 * DAY }),
      r({ redeemedAt: NOW - 8 * DAY }),     // outside
    ];
    const { metrics } = computeEconomyHealth([], reds, [], NOW);
    expect(metrics.redemptions7d).toBe(2);
  });
});

describe('computeEconomyHealth — alerts', () => {
  it('warns when net30d > 50% income30d', () => {
    const entries = [
      p({ ts: NOW - 1 * DAY, delta: 1000 }),
      p({ ts: NOW - 1 * DAY, delta: -200 }),
    ];
    const { alerts } = computeEconomyHealth(entries, [], [], NOW);
    const inflation = alerts.find(a => a.text.includes('通胀风险'));
    expect(inflation).toBeDefined();
    expect(inflation?.level).toBe('warn');
  });

  it('does not warn when net30d <= 50% income30d', () => {
    const entries = [
      p({ ts: NOW - 1 * DAY, delta: 1000 }),
      p({ ts: NOW - 1 * DAY, delta: -800 }),
    ];
    const { alerts } = computeEconomyHealth(entries, [], [], NOW);
    expect(alerts.find(a => a.text.includes('通胀风险'))).toBeUndefined();
  });

  it('infos when 0 redemptions in last 7 days but shop has items', () => {
    const items = [shop({ enabled: true })];
    const { alerts } = computeEconomyHealth([], [], items, NOW);
    expect(alerts.find(a => a.text.includes('冷清'))).toBeDefined();
  });

  it('infos for stale items (>= 60 days no redemption)', () => {
    const items = [shop({ id: 'a', name: '老货', enabled: true })];
    const reds = [r({ shopItemId: 'a', redeemedAt: NOW - (STALE_DAYS + 5) * DAY })];
    const { alerts, metrics } = computeEconomyHealth([], reds, items, NOW);
    expect(metrics.staleItems.length).toBe(1);
    expect(metrics.staleItems[0].id).toBe('a');
    expect(alerts.find(a => a.text.includes('老货'))).toBeDefined();
  });

  it('warns single-item dominance (>60% of recent 30 days)', () => {
    const items = [shop({ id: 'a', name: '蜜雪' }), shop({ id: 'b', name: '其他' })];
    // 6 笔 a + 1 笔 b = a 占 86%
    const reds = [
      ...Array.from({ length: 6 }, () => r({ shopItemId: 'a', redeemedAt: NOW - 5 * DAY })),
      r({ shopItemId: 'b', redeemedAt: NOW - 5 * DAY }),
    ];
    const { metrics, alerts } = computeEconomyHealth([], reds, items, NOW);
    expect(metrics.dominantItem?.id).toBe('a');
    expect(metrics.dominantItem?.pct).toBeGreaterThan(DOMINANCE_PCT);
    expect(alerts.find(a => a.text.includes('单一依赖'))).toBeDefined();
  });

  it('does not flag dominance when sample < 5', () => {
    const items = [shop({ id: 'a', name: '蜜雪' })];
    const reds = [r({ shopItemId: 'a' }), r({ shopItemId: 'a' })];
    const { metrics } = computeEconomyHealth([], reds, items, NOW);
    expect(metrics.dominantItem).toBeNull();
  });

  it('skips disabled items in stale check', () => {
    const items = [shop({ id: 'a', name: 'old', enabled: false })];
    const { metrics } = computeEconomyHealth([], [], items, NOW);
    expect(metrics.staleItems).toEqual([]);
  });
});
