// ============================================================
// R4.2.0: 许愿池机制
//
// 流程：孩子在商店选一件 isWishable=true 的大件 → 写入 wishingPool。
// 该件 UI 上从积分商品列表移除，替换成首页的"心愿池进度条"。
//
// 心理学叠加：
//   - Endowed Progress：开局送 12% 起步
//   - Goal Gradient：进度条最后 20% 视觉冲刺（在组件层处理）
//   - Commitment Device：7 天 lock 不能改愿
//   - 安全阀：7 天后可花 30% 已积进度撤销
//
// 流入：每次得分（PointsEntry.delta > 0）按 autoStreamRatio (0.5) 流入。
// 这意味着：积分翻倍记账——一份给 spendable，一份给 lifetime（已是 R4.0.0
// 设计），现在再加一份给 wishingPool（如果开了）。
// 实际实现是在 streamPoints(positiveDelta) 中只动 wishingPool.currentProgress，
// spendable 已经由 db.points.add 自然反映。
// ============================================================

import type { FatboyDB } from '../db';
import type { ShopItem, WishingPool } from '../types';

export const ENDOWED_BONUS_RATIO = 0.12;
export const DEFAULT_AUTO_STREAM_RATIO = 0.5;
export const COMMITMENT_LOCK_DAYS = 7;
export const CANCEL_REFUND_RATIO = 0.7;   // 撤销时退 70%（30% 作为 commitment 成本）

const DAY_MS = 24 * 3600 * 1000;

// ------------------------------------------------------------
// 公开 API
// ------------------------------------------------------------

export interface OpenPoolResult {
  ok: boolean;
  reason?: 'item_not_found' | 'item_not_wishable' | 'pool_already_open';
  pool?: WishingPool;
}

export async function openPool(
  db: FatboyDB,
  shopItemId: string,
  now: number = Date.now(),
): Promise<OpenPoolResult> {
  const item = await db.shop.get(shopItemId);
  if (!item) return { ok: false, reason: 'item_not_found' };
  if (!item.isWishable) return { ok: false, reason: 'item_not_wishable' };

  const existing = await db.wishingPool.get('singleton');
  if (existing && !existing.fulfilledAt) return { ok: false, reason: 'pool_already_open' };

  const target = item.costPoints;
  const startBonus = Math.round(target * ENDOWED_BONUS_RATIO);
  const pool: WishingPool = {
    id: 'singleton',
    shopItemId,
    openedAt: now,
    startBonusPoints: startBonus,
    currentProgress: startBonus,
    targetPoints: target,
    autoStreamRatio: DEFAULT_AUTO_STREAM_RATIO,
    lockedUntil: now + COMMITMENT_LOCK_DAYS * DAY_MS,
  };
  await db.wishingPool.put(pool);
  return { ok: true, pool };
}

// ------------------------------------------------------------
// 流入：调用方在 db.points.add(delta>0) 之后调用一次
// 不在 db.points 的 hook 里实现，避免触发 R4.0.0 design note 提到的
// "接触 9 个 add 调用方"问题。R4.3.0 引入统一 addPoints helper 时再
// 把它整合进去。
// ------------------------------------------------------------

export async function streamPoints(db: FatboyDB, positiveDelta: number): Promise<void> {
  if (positiveDelta <= 0) return;
  const pool = await db.wishingPool.get('singleton');
  if (!pool || pool.fulfilledAt) return;
  if (pool.currentProgress >= pool.targetPoints) return;
  const inflow = Math.round(positiveDelta * pool.autoStreamRatio);
  if (inflow <= 0) return;
  const next = Math.min(pool.targetPoints, pool.currentProgress + inflow);
  await db.wishingPool.update('singleton', { currentProgress: next });
}

// ------------------------------------------------------------
// 撤销：返还 spendable，删除 pool。
// 撤销前必须过 lockedUntil；refund = currentProgress × CANCEL_REFUND_RATIO
// 但只退"超过 startBonus"的部分（孩子真的赚到的），endowed 起步不退。
// ------------------------------------------------------------

export interface CancelResult {
  ok: boolean;
  reason?: 'no_pool' | 'still_locked' | 'already_fulfilled';
  refundedPoints?: number;
}

export async function cancelPool(
  db: FatboyDB,
  now: number = Date.now(),
  newPointsEntry: (delta: number, reason: string, refId?: string) => Promise<void>,
): Promise<CancelResult> {
  const pool = await db.wishingPool.get('singleton');
  if (!pool) return { ok: false, reason: 'no_pool' };
  if (pool.fulfilledAt) return { ok: false, reason: 'already_fulfilled' };
  if (now < pool.lockedUntil) return { ok: false, reason: 'still_locked' };

  // 真实赚到的部分（不含起步红利）
  const earned = Math.max(0, pool.currentProgress - pool.startBonusPoints);
  const refund = Math.round(earned * CANCEL_REFUND_RATIO);

  await db.transaction('rw', db.wishingPool, db.points, async () => {
    if (refund > 0) {
      await newPointsEntry(refund, 'wishing_pool_cancel_refund', pool.shopItemId);
    }
    await db.wishingPool.delete('singleton');
  });
  return { ok: true, refundedPoints: refund };
}

// ------------------------------------------------------------
// 达成：把对应商品放进 redemptions 库存，删除 pool
// 不扣 spendable（积分早已"流入"过 wishingPool，spendable 也只有 50% 留着）
// 这意味着大件本质是"额外免费"——但这是设计：50% 流入是孩子的成本，
// 仪式上的"我用 X 分换的"是叙事，技术上 spendable 不双扣。
// ------------------------------------------------------------

export interface FulfillResult {
  ok: boolean;
  reason?: 'no_pool' | 'not_complete' | 'item_gone';
  redemptionId?: string;
}

export async function fulfillPool(
  db: FatboyDB,
  now: number = Date.now(),
  newId: (prefix: string) => string,
): Promise<FulfillResult> {
  const pool = await db.wishingPool.get('singleton');
  if (!pool) return { ok: false, reason: 'no_pool' };
  if (pool.currentProgress < pool.targetPoints) return { ok: false, reason: 'not_complete' };
  const item = await db.shop.get(pool.shopItemId);
  if (!item) return { ok: false, reason: 'item_gone' };

  let redemptionId = '';
  await db.transaction('rw', db.wishingPool, db.redemptions, async () => {
    redemptionId = newId('rd');
    await db.redemptions.add({
      id: redemptionId,
      shopItemId: item.id,
      shopItemName: item.name,
      shopItemEmoji: item.emoji,
      costPoints: pool.targetPoints,
      redeemedAt: now,
    });
    await db.wishingPool.update('singleton', { fulfilledAt: now });
  });
  return { ok: true, redemptionId };
}

// ------------------------------------------------------------
// 纯函数 helpers（UI / 测试用）
// ------------------------------------------------------------

export function progressPct(pool: WishingPool): number {
  if (pool.targetPoints <= 0) return 100;
  return Math.min(100, Math.round((pool.currentProgress / pool.targetPoints) * 100));
}

export function isUnlocked(pool: WishingPool, now: number = Date.now()): boolean {
  return now >= pool.lockedUntil;
}

export function inSprintZone(pool: WishingPool): boolean {
  // 最后 20% 进入 goal-gradient 冲刺区
  return progressPct(pool) >= 80 && pool.currentProgress < pool.targetPoints;
}
