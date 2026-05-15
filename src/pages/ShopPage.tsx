// ============================================================
// R5.1.0: 商店页（许愿池删除版）
//
// 新形态：
//   - 2 tab + chip 二级筛选
//   - 双通路渲染：积分商品（购买）+ 条件商品（进度条解锁）
//   - 大件用 composite 条件（积分 + 完美任务数门槛），统一进度条
//   - 锁定区"???"商品固定挂底部
//   - 我的库存 / 最近使用保留
// ============================================================
import { useEffect, useState } from 'react';
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
import { CategoryTabs } from '../components/CategoryTabs';
import { DEFAULT_CATEGORY, type ShopCategory } from '../lib/categories';
import { LockedArea } from '../components/LockedArea';
import { ProgressBar } from '../components/ProgressBar';
import { buildUnlockContext } from '../lib/petStats';
import { emptyContext, evaluateCondition, describeCondition, type UnlockContext } from '../lib/unlockCondition';
import { SHOP_CATEGORIES } from '../lib/categories';
import { useMasteryToast } from '../components/MasteryToast';
import { checkFirstRedemption } from '../lib/badges';

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

  const total = pointsEntries ? totalPoints(pointsEntries) : 0;
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [category, setCategory] = useState<ShopCategory>(DEFAULT_CATEGORY);
  const [chip, setChip] = useState<string | null>(null);
  const { showMasteryToast, MasteryToastUI } = useMasteryToast();

  // 解锁上下文（条件商品的进度判定）— 异步构建，每次 points/tasks 变化重算
  const [ctx, setCtx] = useState<UnlockContext>(emptyContext());
  useEffect(() => {
    let alive = true;
    buildUnlockContext(db).then(c => { if (alive) setCtx(c); });
    return () => { alive = false; };
  }, [pointsEntries?.length, allItems?.length]);

  // R5.1.0: wishingPool 已删

  // ---------- 商品分类 ----------
  const enabledItems = (allItems ?? []).filter(s => s.enabled);
  const lockedItems = enabledItems.filter(s => s.isLocked);
  const visibleItems = enabledItems.filter(s =>
    !s.isLocked &&
    (s.rotationStatus ?? 'displayed') === 'displayed'
  );

  const filteredItems = visibleItems.filter(s => {
    if (s.category !== category) return false;
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
    // R5.2.0: 第一次兑换里程碑
    checkFirstRedemption(db).catch(() => {});
    const recipients = await db.recipients.toArray();
    const childName = settings?.childName ?? '肥仔';
    pushToRecipients(recipients.filter(r => r.subShopPurchase !== false), 'taskDone' as any, {
      title: `💳 ${childName} 兑换了【${item.name}】`,
      body: `花了 ${cost} 积分。剩余 ${total - cost} 分`,
      group: 'fatboy-quest',
    }).catch(() => {});
    setConfirmItem(null);
  }

  // R5.1.0: startWish / cancelWish / fulfillWish 已删（许愿池机制移除）

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

      {/* R5.1.0: 心愿池机制已删 */}

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
      </AnimatePresence>

      {/* R4.3.0: 兑换仪式 mastery toast */}
      {MasteryToastUI}
    </div>
  );
}

// ============================================================
// R5.1.0: 单行商品（积分通路 / 条件通路）
// ============================================================
function ShopRow({
  item, ctx, total, onBuy,
}: {
  item: ShopItem;
  ctx: UnlockContext;
  total: number;
  onBuy: () => void;
}) {
  const isConditional = !!item.unlockCondition;

  if (isConditional) {
    const progress = evaluateCondition(item.unlockCondition!, ctx);
    const cond = item.unlockCondition!;
    const tone = cond.kind === 'taskCount'
      ? (cond.star === 'gold' ? 'gold' : cond.star === 'silver' ? 'silver' : 'bronze')
      : 'points';
    // 大件：积分够 + 完美数够 → 同时也要积分扣得起
    const affordable = item.costPoints <= 0 || total >= item.costPoints;
    const wk = isoWeekString(new Date());
    const usedThisWeek = item.weekKey === wk ? item.redeemedThisWeek : 0;
    const stockLeft = item.stockPerWeek > 0 ? item.stockPerWeek - usedThisWeek : Infinity;
    return (
      <div className="space-card p-3 flex items-center gap-3">
        <div className="text-3xl">{item.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.name}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
            {describeCondition(cond)} · {progress.progress}/{progress.target}
            {item.costPoints > 0 && <> · 兑换需 {item.costPoints} 分</>}
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
          <button className="space-btn text-sm" onClick={onBuy} disabled={!affordable || stockLeft <= 0}>
            {!affordable ? `差 ${item.costPoints - total}` : stockLeft <= 0 ? '本周满' : (item.costPoints > 0 ? '兑换' : '领取')}
          </button>
        ) : (
          <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-mist)', color: 'var(--ink-faint)' }}>
            进行中
          </span>
        )}
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

// R5.1.0: ConfirmWishModal 已删（许愿池机制移除）
