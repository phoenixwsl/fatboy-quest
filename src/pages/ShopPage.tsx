import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { totalPoints, calcGuardCardPrice } from '../lib/points';
import { useAppStore } from '../store/useAppStore';
import { newId } from '../lib/ids';
import { isoWeekString, addDays, todayString } from '../lib/time';

export function ShopPage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const shopItems = useLiveQuery(() => db.shop.where({ enabled: 1 as any }).toArray().catch(async () => {
    const all = await db.shop.toArray(); return all.filter(s => s.enabled);
  }));
  const allItems = useLiveQuery(() => db.shop.toArray());
  const pointsEntries = useLiveQuery(() => db.points.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const total = pointsEntries ? totalPoints(pointsEntries) : 0;

  // 计算守护卡当前价格
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

  async function redeem(itemId: string) {
    const item = await db.shop.get(itemId);
    if (!item) return;

    // 守护卡价格动态
    const cost = item.id === 'preset-guard' ? guardPrice : item.costPoints;

    if (total < cost) { toast(`积分不够（需要 ${cost}）`, 'warn'); return; }

    // 周库存检查
    const wk = isoWeekString(new Date());
    let redeemed = item.redeemedThisWeek;
    if (item.weekKey !== wk) redeemed = 0;
    if (redeemed >= item.stockPerWeek) { toast('本周库存已用完', 'warn'); return; }

    await db.transaction('rw', db.shop, db.redemptions, db.points, db.streak, async () => {
      await db.points.add({
        id: newId('pt'), ts: Date.now(), delta: -cost,
        reason: 'shop_redeem', refId: itemId,
      });
      await db.redemptions.add({
        id: newId('rd'), shopItemId: itemId, shopItemName: item.name,
        costPoints: cost, redeemedAt: Date.now(),
      });
      await db.shop.update(itemId, { redeemedThisWeek: redeemed + 1, weekKey: wk });
      if (item.id === 'preset-guard' && streak) {
        await db.streak.update('singleton', { guardCards: streak.guardCards + 1 });
      }
    });
    toast(`兑换成功 ✓ ${item.name}`, 'success');
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
                onClick={() => redeem(item.id)}
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
    </div>
  );
}
