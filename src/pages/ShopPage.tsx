import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { totalPoints, calcGuardCardPrice } from '../lib/points';
import { useAppStore } from '../store/useAppStore';
import { newId } from '../lib/ids';
import { isoWeekString, addDays, todayString } from '../lib/time';
import { sounds } from '../lib/sounds';
import { pushToRecipients } from '../lib/bark';
import type { ShopItem, Redemption } from '../types';

export function ShopPage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const allItems = useLiveQuery(() => db.shop.toArray());
  const pointsEntries = useLiveQuery(() => db.points.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const myInventory = useLiveQuery(() => db.redemptions.filter(r => !r.usedAt && !r.fulfilledAt).toArray());
  const usedRecent = useLiveQuery(() => db.redemptions.filter(r => !!(r.usedAt || r.fulfilledAt)).reverse().sortBy('redeemedAt'));

  const total = pointsEntries ? totalPoints(pointsEntries) : 0;
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);

  const guardPrice = (() => {
    if (!pointsEntries) return 100;
    const today = todayString();
    const lastWeek = [...Array(7)].map((_, i) => addDays(today, -i));
    const dailyTotals = lastWeek.map(d => {
      const dayStart = new Date(d).setHours(0,0,0,0);
      const dayEnd = new Date(d).setHours(23,59,59,999);
      return pointsEntries.filter(p => p.delta > 0 && p.ts >= dayStart && p.ts <= dayEnd).reduce((s, p) => s + p.delta, 0);
    });
    return calcGuardCardPrice(dailyTotals);
  })();

  const items = (allItems ?? []).filter(s => s.enabled);

  async function redeem(item: ShopItem) {
    const cost = item.id === 'preset-guard' ? guardPrice : item.costPoints;
    if (total < cost) { toast(`积分不够（需要 ${cost}）`, 'warn'); sounds.play('error'); return; }
    const wk = isoWeekString(new Date());
    let redeemed = item.redeemedThisWeek;
    if (item.weekKey !== wk) redeemed = 0;
    if (redeemed >= item.stockPerWeek) { toast('本周库存已用完', 'warn'); sounds.play('error'); return; }

    let redemptionId = '';
    await db.transaction('rw', db.shop, db.redemptions, db.points, db.streak, async () => {
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
      // 守护卡是特殊：购买立即生效，不进库存
      if (item.id === 'preset-guard' && streak) {
        await db.streak.update('singleton', { guardCards: streak.guardCards + 1 });
        await db.redemptions.update(redemptionId, { usedAt: Date.now() });
      }
    });
    sounds.play('unlock');
    toast(`兑换成功 ✓ ${item.name}`, 'success');
    // 推送家长
    const recipients = await db.recipients.toArray();
    const childName = settings?.childName ?? '肥仔';
    pushToRecipients(recipients.filter(r => r.subShopPurchase !== false), 'taskDone' as any, {
      title: `💳 ${childName} 兑换了【${item.name}】`,
      body: `花了 ${cost} 积分。剩余 ${total - cost} 分`,
      group: 'fatboy-quest',
    }).catch(() => {});
    setConfirmItem(null);
  }

  async function useItem(red: Redemption) {
    if (!confirm(`确定使用「${red.shopItemName}」？使用后请家长兑现承诺。`)) return;
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
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 首页</button>
        <div className="text-xl font-bold">🎁 奖励商店</div>
      </div>

      <div className="space-card p-4 mb-4">
        <div className="text-sm text-white/60">当前积分</div>
        <div className="text-3xl font-bold glow-text">⭐ {total}</div>
        <div className="text-xs text-white/40 mt-1">连击 {streak?.currentStreak ?? 0} 天 · 守护卡 {streak?.guardCards ?? 0} 张</div>
      </div>

      {/* 我的库存（已购未用） */}
      {myInventory && myInventory.length > 0 && (
        <>
          <div className="text-sm text-white/70 mb-2">🎒 我的库存（已购买，未使用）</div>
          <div className="space-y-2 mb-4">
            {myInventory.map(r => (
              <div key={r.id} className="space-card p-3 flex items-center gap-3 ring-1 ring-emerald-300/40">
                <div className="text-3xl">{r.shopItemEmoji ?? '🎁'}</div>
                <div className="flex-1">
                  <div className="font-medium">{r.shopItemName}</div>
                  <div className="text-xs text-white/50">
                    购于 {new Date(r.redeemedAt).toLocaleDateString()} · 花了 {r.costPoints} 分
                  </div>
                </div>
                <button onClick={() => useItem(r)} className="space-btn text-sm">✅ 使用</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="text-sm text-white/70 mb-2">商店</div>
      <div className="space-y-3">
        {items.map(item => {
          const cost = item.id === 'preset-guard' ? guardPrice : item.costPoints;
          const wk = isoWeekString(new Date());
          const usedThisWeek = item.weekKey === wk ? item.redeemedThisWeek : 0;
          const stockLeft = item.stockPerWeek - usedThisWeek;
          const affordable = total >= cost;
          return (
            <div key={item.id} className="space-card p-4 flex items-center gap-3">
              <div className="text-4xl">{item.emoji}</div>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-white/50">
                  本周还剩 {stockLeft}/{item.stockPerWeek} · {cost} 积分
                </div>
              </div>
              <button
                onClick={() => setConfirmItem(item)}
                disabled={!affordable || stockLeft <= 0}
                className="space-btn"
              >
                兑换
              </button>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center text-white/40 mt-12">
          <div className="text-4xl">🌌</div>
          <div className="mt-2">家长还没设置奖励</div>
        </div>
      )}

      {usedRecent && usedRecent.length > 0 && (
        <>
          <div className="text-sm text-white/40 mt-6 mb-2">📜 最近使用</div>
          <div className="space-y-1">
            {usedRecent.slice(0, 5).map(r => (
              <div key={r.id} className="text-xs text-white/40 px-3 py-1.5 bg-white/5 rounded-lg flex justify-between">
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="space-card p-6 w-full max-w-sm text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-6xl mb-2">{confirmItem.emoji}</div>
              <div className="text-lg font-bold mb-2">确定兑换吗？</div>
              <div className="text-white/70 mb-4">
                花 <b className="text-amber-300">{confirmItem.id === 'preset-guard' ? guardPrice : confirmItem.costPoints}</b> 积分换<br/>
                <b>{confirmItem.name}</b>
              </div>
              <div className="text-xs text-white/40 mb-4">
                {confirmItem.id === 'preset-guard'
                  ? '守护卡会立即生效'
                  : '兑换后进入"我的库存"，使用时再点"使用"按钮'}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmItem(null)} className="space-btn-ghost flex-1">取消</button>
                <button onClick={() => redeem(confirmItem)} className="space-btn flex-1">确认兑换</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
