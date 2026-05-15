// ============================================================
// R4.4.0: 经济健康度监控（纯函数）
//
// 输入：PointsEntry[] / Redemption[] / ShopItem[]
// 输出：30 天 income/spend/net + 7 天 redemption count + 滞销品 + 单一依赖
//      + alert[] 告警列表
//
// 触发条件（kid-rewards skill templates.md #10）：
//  - 净存连续 3 周 > 周收入 50% → 通胀风险
//  - 兑换次数连续 2 周 < 1 → 商店冷清
//  - 某商品 60 天 0 兑换 → 滞销
//  - 某商品占兑换次数 > 60% → 单一依赖
// ============================================================

import type { PointsEntry, Redemption, ShopItem } from '../types';

const DAY = 24 * 3600 * 1000;

export interface EconomyMetrics {
  // 近 30 天
  income30d: number;
  spend30d: number;
  net30d: number;
  // 近 7 天
  redemptions7d: number;
  // 滞销（>= STALE_DAYS 没人换 + enabled）
  staleItems: { id: string; name: string; lastRedeemedAt: number | null }[];
  // 单一依赖（占总兑换 > DOMINANCE_PCT）
  dominantItem: { id: string; name: string; pct: number } | null;
}

export interface EconomyAlert {
  level: 'info' | 'warn';
  emoji: string;
  text: string;
}

export const STALE_DAYS = 60;
export const DOMINANCE_PCT = 60;

// ------------------------------------------------------------
// 主函数
// ------------------------------------------------------------
export function computeEconomyHealth(
  entries: PointsEntry[],
  redemptions: Redemption[],
  shopItems: ShopItem[],
  now: number = Date.now(),
): { metrics: EconomyMetrics; alerts: EconomyAlert[] } {
  const since30 = now - 30 * DAY;
  const since7  = now - 7 * DAY;

  // 近 30 天 income / spend
  let income30d = 0;
  let spend30d = 0;
  for (const e of entries) {
    if (e.ts < since30) continue;
    if (e.delta > 0) income30d += e.delta;
    else if (e.delta < 0) spend30d += -e.delta;
  }
  const net30d = income30d - spend30d;

  // 近 7 天 redemption count（不含 wishingPool 自动 fulfill — 那种没花 spendable）
  const redemptions7d = redemptions.filter(r => r.redeemedAt >= since7).length;

  // 滞销品 + 单一依赖（基于全部 redemption 历史）
  const lastByItem = new Map<string, number>();
  for (const r of redemptions) {
    const prev = lastByItem.get(r.shopItemId) ?? 0;
    if (r.redeemedAt > prev) lastByItem.set(r.shopItemId, r.redeemedAt);
  }
  const staleItems: EconomyMetrics['staleItems'] = [];
  for (const item of shopItems) {
    if (!item.enabled) continue;
    const last = lastByItem.get(item.id) ?? null;
    const isStale = last === null
      ? Date.now() - 0 > STALE_DAYS * DAY   // 从来没人换 = 滞销
      : now - last > STALE_DAYS * DAY;
    if (isStale) staleItems.push({ id: item.id, name: item.name, lastRedeemedAt: last });
  }

  // 近 30 天兑换里某商品占比
  const recent30 = redemptions.filter(r => r.redeemedAt >= since30);
  const countByItem = new Map<string, number>();
  for (const r of recent30) {
    countByItem.set(r.shopItemId, (countByItem.get(r.shopItemId) ?? 0) + 1);
  }
  let dominantItem: EconomyMetrics['dominantItem'] = null;
  if (recent30.length >= 5) {  // 5 笔以下不算单一依赖（样本太小）
    for (const [id, count] of countByItem) {
      const pct = (count / recent30.length) * 100;
      if (pct > DOMINANCE_PCT) {
        const name = shopItems.find(i => i.id === id)?.name ?? id;
        dominantItem = { id, name, pct: Math.round(pct) };
        break;
      }
    }
  }

  // 告警
  const alerts: EconomyAlert[] = [];

  // 1) 净存 > 50% income (通胀风险)
  if (income30d > 0 && net30d > income30d * 0.5) {
    alerts.push({
      level: 'warn',
      emoji: '💰',
      text: `通胀风险：近 30 天净存 ${net30d}（占收入 ${Math.round((net30d / income30d) * 100)}%），考虑上架新货 / 加大件`,
    });
  }

  // 2) 7 天兑换次数 < 1 + 商店有商品
  if (redemptions7d < 1 && shopItems.filter(i => i.enabled).length > 0) {
    alerts.push({
      level: 'info',
      emoji: '🛒',
      text: '近 7 天没有兑换。商店有点冷清，要不要换换货？',
    });
  }

  // 3) 滞销品（最多列 2 个，避免噪音）
  for (const s of staleItems.slice(0, 2)) {
    alerts.push({
      level: 'info',
      emoji: '📦',
      text: `「${s.name}」${STALE_DAYS} 天没人换，考虑下架 / 降价 / 换包装`,
    });
  }

  // 4) 单一依赖
  if (dominantItem) {
    alerts.push({
      level: 'warn',
      emoji: '🎯',
      text: `单一依赖：「${dominantItem.name}」占近 30 天兑换的 ${dominantItem.pct}%，建议引入替代品`,
    });
  }

  return {
    metrics: { income30d, spend30d, net30d, redemptions7d, staleItems, dominantItem },
    alerts,
  };
}
