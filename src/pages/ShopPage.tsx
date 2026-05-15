// ============================================================
// R4.1.0 + R4.2.0: 商店页（重构）
//
// 新形态：
//   - 4 分类 tab + chip 二级筛选
//   - 双通路渲染：积分商品（购买） + 条件商品（进度条解锁）
//   - 大件 isWishable → 进店 = 许愿池入口（不直接购买）
//   - 锁定区"???"商品固定挂底部
//   - 心愿池常驻顶部（如有）
//   - 我的库存 / 最近使用保留
//
// preset-guard 已在 v7 移除，旧代码移除
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { totalPoints } from '../lib/points';
import { useAppStore } from '../store/useAppStore';
import { newId } from '../lib/ids';
import { isoWeekString } from '../lib/time';
import { sounds } from '../lib/sounds';
import { pushToRecipients } from '../lib/bark';
import type { ShopItem, Redemption } from '../types';
import { CategoryTabs, type CategoryFilter } from '../components/CategoryTabs';
import { LockedArea } from '../components/LockedArea';
import { WishingPoolBar } from '../components/WishingPoolBar';
import { ProgressBar } from '../components/ProgressBar';
import { buildUnlockContext } from '../lib/petStats';
import { emptyContext, evaluateCondition, describeCondition, type UnlockContext } from '../lib/unlockCondition';
import { openPool, cancelPool, fulfillPool, isUnlocked, CANCEL_REFUND_RATIO } from '../lib/wishingPool';
import { SHOP_CATEGORIES } from '../lib/categories';
import { useMasteryToast } from '../components/MasteryToast';

export function ShopPage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const allItems = useLiveQuery(() => db.shop.toArray());
  const pointsEntries = useLiveQuery(() => db.points.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const myInventory = useLiveQuery(() => db.redemptions.filter(r => !r.usedAt && !r.fulfilledAt).toArray());
  const usedRecent = useLiveQuery(() => db.redemptions.filter(r => !!(r.usedAt || r.fulfilledAt)).reverse().sortBy('redeemedAt'));
  const wishingPool = useLiveQuery(() => db.wishingPool.get('singleton'));

  const total = pointsEntries ? totalPoints(pointsEntries) : 0;
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [wishItem, setWishItem] = useState<ShopItem | null>(null);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [chip, setChip] = useState<string | null>(null);
  const { showMasteryToast, MasteryToastUI } = useMasteryToast();

  // 解锁上下文（条件商品的进度判定）— 异步构建，每次 points/tasks 变化重算
  const [ctx, setCtx] = useState<UnlockContext>(emptyContext());
  useEffect(() => {
    let alive = true;
    buildUnlockContext(db).then(c => { if (alive) setCtx(c); });
    return () => { alive = false; };
  }, [pointsEntries?.length, allItems?.length]);

  const wishedItem = useMemo(() => {
    if (!wishingPool || !allItems) return undefined;
    return allItems.find(i => i.id === wishingPool.shopItemId);
  }, [wishingPool, allItems]);

  // ---------- 商品分类 ----------
  const enabledItems = (allItems ?? []).filter(s => s.enabled);
  const lockedItems = enabledItems.filter(s => s.isLocked);
  const visibleItems = enabledItems.filter(s =>
    !s.isLocked &&
    (s.rotationStatus ?? 'displayed') === 'displayed' &&
    s.id !== wishingPool?.shopItemId   // 心愿池中的商品不再列在普通商品流
  );

  const filteredItems = visibleItems.filter(s => {
    if (category !== 'all' && s.category !== category) return false;
    if (chip && !(s.tags ?? []).includes(chip)) return false;
    return true;
  });

  // 排序：可负担在前；条件商品按进度倒序
  const sortedItems = [...filteredItems].sort((a, b) => {
    const isCondA = !!a.unlockCondition;
    const isCondB = !!b.unlockCondition;
    if (isCondA && !isCondB) return 1;     // 条件商品排后
    if (!isCondA && isCondB) return -1;
    if (!isCondA && !isCondB) {
      const affA = total >= a.costPoints;
      const affB = total >= b.costPoints;
      if (affA && !affB) return -1;
      if (!affA && affB) return 1;
      return a.costPoints - b.costPoints;
    }
    return 0;
  });

  // ---------- 兑换 / 使用 / 许愿 ----------
  async function redeem(item: ShopItem) {
    const cost = item.costPoints;
    if (total < cost) { toast(`积分不够（需要 ${cost}）`, 'warn'); sounds.play('error'); return; }
    const wk = isoWeekString(new Date());
    let redeemed = item.redeemedThisWeek;
    if (item.weekKey !== wk) redeemed = 0;
    if (redeemed >= item.stockPerWeek) { toast('本周库存已用完', 'warn'); sounds.play('error'); return; }

    let redemptionId = '';
    await db.transaction('rw', db.shop, db.redemptions, db.points, async () => {
      await db.points.add({
        id: newId('pt'), ts: Date.now(), delta: -cost,
        reason: 'shop_redeem', refId: item.id,
      });
      redemptionId = newId('rd');
      await db.redemptions.add({
        id: redemptionId, shopItemId: item.id, shopItemName: item.name,
        shopItemEmoji: item.emoji,
        costPoints: cost, redeemedAt: Date.now(),
      });
      await db.shop.update(item.id, { redeemedThisWeek: redeemed + 1, weekKey: wk });
    });
    sounds.play('unlock');
    toast(`兑换成功 ✓ ${item.name}`, 'success');
    // R4.3.0: 兑换仪式 — mastery framing toast
    showMasteryToast(item).catch(() => {});
    const recipients = await db.recipients.toArray();
    const childName = settings?.childName ?? '肥仔';
    pushToRecipients(recipients.filter(r => r.subShopPurchase !== false), 'taskDone' as any, {
      title: `💳 ${childName} 兑换了【${item.name}】`,
      body: `花了 ${cost} 积分。剩余 ${total - cost} 分`,
      group: 'fatboy-quest',
    }).catch(() => {});
    setConfirmItem(null);
  }

  async function startWish(item: ShopItem) {
    const result = await openPool(db, item.id);
    if (!result.ok) {
      if (result.reason === 'pool_already_open') toast('已经有一个心愿在攒了', 'warn');
      else if (result.reason === 'item_not_wishable') toast('这件不能许愿', 'warn');
      else toast('许愿失败', 'warn');
      return;
    }
    sounds.play('unlock');
    toast(`💫 已许愿 ${item.name}！开局送 12% 起步`, 'success');
    setWishItem(null);
  }

  async function cancelWish() {
    if (!wishingPool) return;
    if (!isUnlocked(wishingPool)) {
      toast('许愿后 7 天内不能改愿', 'warn');
      return;
    }
    const ok = await confirmModal({
      title: '撤销心愿？',
      body: `已积进度会退 ${Math.round(CANCEL_REFUND_RATIO * 100)}%（起步红利不退）。确定要换个心愿吗？`,
      emoji: '💔',
      tone: 'warn',
      confirmLabel: '撤销',
    });
    if (!ok) return;
    const r = await cancelPool(db, Date.now(), async (delta, reason, refId) => {
      await db.points.add({ id: newId('pt'), ts: Date.now(), delta, reason, refId });
    });
    if (r.ok) {
      toast(`✓ 已撤销，退回 ${r.refundedPoints ?? 0} 积分`, 'success');
    } else {
      toast('撤销失败', 'warn');
    }
  }

  async function fulfillWish() {
    if (!wishingPool) return;
    const wishedItemNow = await db.shop.get(wishingPool.shopItemId);
    const r = await fulfillPool(db, Date.now(), newId);
    if (r.ok) {
      sounds.play('fanfare');
      toast('🎉 心愿达成！已进入"我的库存"', 'success');
      if (wishedItemNow) showMasteryToast(wishedItemNow).catch(() => {});
    } else if (r.reason === 'not_complete') {
      toast('还没攒够呢', 'warn');
    } else {
      toast('达成失败', 'warn');
    }
  }

  async function useItem(red: Redemption) {
    const ok = await confirmModal({
      title: `使用「${red.shopItemName}」？`,
      body: '使用后请家长兑现承诺 🎉',
      emoji: red.shopItemEmoji ?? '🎁',
      tone: 'info',
      confirmLabel: '使用',
    });
    if (!ok) return;
    await db.redemptions.update(red.id, { usedAt: Date.now() });
    sounds.play('fanfare');
    toast(`✓ 已使用 ${red.shopItemName}`, 'success');
    const recipients = await db.recipients.toArray();
    const childName = settings?.childName ?? '肥仔';
    pushToRecipients(recipients.filter(r => r.subShopPurchase !== false), 'taskDone' as any, {
      title: `✅ ${childName} 使用了【${red.shopItemName}】`,
      body: `请兑现承诺 😊`,
      group: 'fatboy-quest',
    }).catch(() => {});
  }

  return (
    <div className="min-h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 首页</button>
        <div className="text-xl font-bold">🎁 奖励商店</div>
      </div>

      {/* 积分卡 */}
      <div className="space-card p-4 mb-4">
        <div className="text-sm" style={{ color: 'var(--ink-faint)' }}>当前积分</div>
        <div className="text-3xl font-bold glow-text">⭐ {total}</div>
        <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>连击 {streak?.currentStreak ?? 0} 天</div>
      </div>

      {/* 心愿池常驻 */}
      {wishingPool && !wishingPool.fulfilledAt && (
        <div className="mb-4">
          <WishingPoolBar pool={wishingPool} item={wishedItem} showCancelHint />
          <div className="flex gap-2 mt-2">
            {wishingPool.currentProgress >= wishingPool.targetPoints ? (
              <button onClick={fulfillWish} className="space-btn flex-1">🎉 达成兑换</button>
            ) : (
              <button
                onClick={cancelWish}
                className="space-btn-ghost flex-1 text-sm"
                disabled={!isUnlocked(wishingPool)}
              >
                💔 撤销心愿
              </button>
            )}
          </div>
        </div>
      )}

      {/* 我的库存 */}
      {myInventory && myInventory.length > 0 && (
        <>
          <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>🎒 我的库存（已购买，未使用）</div>
          <div className="space-y-2 mb-4">
            {myInventory.map(r => (
              <div
                key={r.id}
                className="space-card p-3 flex items-center gap-3 ring-1"
                style={{ boxShadow: '0 0 0 1px var(--state-success)' }}
              >
                <div className="text-3xl">{r.shopItemEmoji ?? '🎁'}</div>
                <div className="flex-1">
                  <div className="font-medium">{r.shopItemName}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                    购于 {new Date(r.redeemedAt).toLocaleDateString()} · 花了 {r.costPoints} 分
                  </div>
                </div>
                <button onClick={() => useItem(r)} className="space-btn text-sm">✅ 使用</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 4 tab + chip */}
      <CategoryTabs
        category={category}
        chip={chip}
        onCategoryChange={setCategory}
        onChipChange={setChip}
      />

      {/* 商品列表 */}
      <div className="space-y-2.5">
        {sortedItems.map(item => (
          <ShopRow
            key={item.id}
            item={item}
            ctx={ctx}
            total={total}
            onBuy={() => setConfirmItem(item)}
            onWish={() => setWishItem(item)}
            wishingActive={!!wishingPool && !wishingPool.fulfilledAt}
          />
        ))}
      </div>

      {sortedItems.length === 0 && enabledItems.length === 0 && (
        <div className="text-center mt-12" style={{ color: 'var(--ink-faint)' }}>
          <div className="text-4xl">🌌</div>
          <div className="mt-2">家长还没设置奖励</div>
        </div>
      )}
      {sortedItems.length === 0 && enabledItems.length > 0 && (
        <div className="text-center mt-8" style={{ color: 'var(--ink-faint)' }}>
          <div className="text-3xl">📦</div>
          <div className="text-sm mt-2">这一格快上新啦，换个分类看看</div>
        </div>
      )}

      {/* 锁定区 */}
      <LockedArea items={lockedItems} context={ctx} />

      {/* 最近使用 */}
      {usedRecent && usedRecent.length > 0 && (
        <>
          <div className="text-sm mt-6 mb-2" style={{ color: 'var(--ink-faint)' }}>📜 最近使用</div>
          <div className="space-y-1">
            {usedRecent.slice(0, 5).map(r => (
              <div
                key={r.id}
                className="text-xs px-3 py-1.5 rounded-lg flex justify-between"
                style={{ color: 'var(--ink-faint)', background: 'var(--surface-mist)' }}
              >
                <span>{r.shopItemEmoji ?? '🎁'} {r.shopItemName}</span>
                <span>{new Date(r.usedAt ?? r.fulfilledAt ?? r.redeemedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 兑换确认弹窗 */}
      <AnimatePresence>
        {confirmItem && (
          <ConfirmRedeemModal item={confirmItem} onClose={() => setConfirmItem(null)} onConfirm={() => redeem(confirmItem)} />
        )}
        {wishItem && (
          <ConfirmWishModal item={wishItem} onClose={() => setWishItem(null)} onConfirm={() => startWish(wishItem)} />
        )}
      </AnimatePresence>

      {/* R4.3.0: 兑换仪式 mastery toast */}
      {MasteryToastUI}
    </div>
  );
}

// ============================================================
// 单行商品（积分通路 / 条件通路 / wishable 大件）
// ============================================================
function ShopRow({
  item, ctx, total, onBuy, onWish, wishingActive,
}: {
  item: ShopItem;
  ctx: UnlockContext;
  total: number;
  onBuy: () => void;
  onWish: () => void;
  wishingActive: boolean;
}) {
  const isConditional = !!item.unlockCondition;
  const isWishLargeItem = item.isWishable && !isConditional;

  if (isConditional) {
    const progress = evaluateCondition(item.unlockCondition!, ctx);
    const cond = item.unlockCondition!;
    const tone = cond.kind === 'taskCount'
      ? (cond.star === 'gold' ? 'gold' : cond.star === 'silver' ? 'silver' : 'bronze')
      : 'points';
    return (
      <div className="space-card p-3 flex items-center gap-3">
        <div className="text-3xl">{item.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.name}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
            {describeCondition(cond)} · {progress.progress}/{progress.target}
          </div>
          <div className="mt-1.5">
            <ProgressBar
              current={progress.progress}
              target={progress.target}
              tone={tone}
              size="sm"
            />
          </div>
        </div>
        {progress.met ? (
          <button className="space-btn text-sm" onClick={onBuy}>领取</button>
        ) : (
          <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-mist)', color: 'var(--ink-faint)' }}>
            进行中
          </span>
        )}
      </div>
    );
  }

  if (isWishLargeItem) {
    return (
      <div className="space-card p-3 flex items-center gap-3">
        <div className="text-3xl">{item.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.name}</div>
          <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
            🎯 大件 · 目标 {item.costPoints} 分 · 许愿后 50% 积分自动流入
          </div>
          {item.category && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              {SHOP_CATEGORIES[item.category].emoji} {SHOP_CATEGORIES[item.category].label}
            </div>
          )}
        </div>
        <button
          className="space-btn text-sm"
          onClick={onWish}
          disabled={wishingActive}
          title={wishingActive ? '已经有心愿在攒，先撤销或达成' : '许愿这一件'}
        >
          💫 许愿
        </button>
      </div>
    );
  }

  // 普通积分商品
  const wk = isoWeekString(new Date());
  const usedThisWeek = item.weekKey === wk ? item.redeemedThisWeek : 0;
  const stockLeft = item.stockPerWeek - usedThisWeek;
  const affordable = total >= item.costPoints;
  return (
    <div className="space-card p-3 flex items-center gap-3">
      <div className="text-3xl">{item.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{item.name}</div>
        <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
          本周还剩 {stockLeft}/{item.stockPerWeek} · {item.costPoints} 积分
        </div>
        {item.category && (
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
            {SHOP_CATEGORIES[item.category].emoji} {SHOP_CATEGORIES[item.category].label}
            {item.tags && item.tags.length > 0 && (
              <> · {item.tags.map(t => `#${t}`).join(' ')}</>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onBuy}
        disabled={!affordable || stockLeft <= 0}
        className="space-btn text-sm"
      >
        {affordable ? '兑换' : `差 ${item.costPoints - total}`}
      </button>
    </div>
  );
}

// ============================================================
// 兑换确认弹窗
// ============================================================
function ConfirmRedeemModal({ item, onClose, onConfirm }: { item: ShopItem; onClose: () => void; onConfirm: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="space-card p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-2">{item.emoji}</div>
        <div className="text-lg font-bold mb-2">确定兑换吗？</div>
        <div className="mb-4" style={{ color: 'var(--ink-muted)' }}>
          花 <b style={{ color: 'var(--state-warn)' }}>{item.costPoints}</b> 积分换<br/>
          <b>{item.name}</b>
        </div>
        <div className="text-xs mb-4" style={{ color: 'var(--ink-faint)' }}>
          兑换后进入"我的库存"，使用时再点"使用"按钮
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="space-btn-ghost flex-1">取消</button>
          <button onClick={onConfirm} className="space-btn flex-1">确认兑换</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConfirmWishModal({ item, onClose, onConfirm }: { item: ShopItem; onClose: () => void; onConfirm: () => void }) {
  const startBonus = Math.round(item.costPoints * 0.12);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="space-card p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-2">{item.emoji}</div>
        <div className="text-lg font-bold mb-2">许愿这一件？</div>
        <div className="mb-4 text-sm" style={{ color: 'var(--ink-muted)' }}>
          目标 <b style={{ color: 'var(--state-warn)' }}>{item.costPoints}</b> 积分<br/>
          <b>{item.name}</b>
        </div>
        <div className="text-xs mb-4 space-y-1" style={{ color: 'var(--ink-faint)' }}>
          <div>✨ 开局送 <b>{startBonus}</b> 分起步（{Math.round(0.12 * 100)}% endowed bonus）</div>
          <div>💧 之后每次得分 50% 自动流入心愿池</div>
          <div>🔒 7 天内不能改愿，专心攒</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="space-btn-ghost flex-1">再想想</button>
          <button onClick={onConfirm} className="space-btn flex-1">💫 许愿</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
