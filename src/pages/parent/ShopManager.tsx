// ============================================================
// R4.1.0: ShopManager 扩展
//   - 必选 category
//   - 自动推断 tier，可手动改
//   - tags chip 多选
//   - isWishable / isLocked / unlockLifetimeThreshold（简化版条件解锁）
//   - 顶部"轮转一下"按钮
//   - 列表显示 category + tier + 标签
//
// 注：完整 UnlockConditionEditor（任务里程碑解锁等）放 R4.3.0
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { useAppStore } from '../../store/useAppStore';
import {
  ALL_CATEGORIES, SHOP_CATEGORIES, type ShopCategory,
} from '../../lib/categories';
import { planRotation, applyRotation } from '../../lib/rotation';
import { WitnessButton } from '../../components/WitnessButton';
import type { ShopItem } from '../../types';

const EMOJIS = ['🍦', '🥤', '🍕', '🍩', '🍪', '🎮', '📺', '🎁', '⚽', '🧸', '📚', '🌱', '🪴', '🧱', '🎨', '✨', '🏆', '💡'];

function inferTier(cost: number): 'instant' | 'mid' | 'long' {
  if (cost >= 1000) return 'long';
  if (cost >= 200)  return 'mid';
  return 'instant';
}

export function ShopManager() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const items = useLiveQuery(() => db.shop.toArray());
  const wishingPool = useLiveQuery(() => db.wishingPool.get('singleton'));

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [cost, setCost] = useState(100);
  const [stockPerWeek, setStockPerWeek] = useState(1);
  const [category, setCategory] = useState<ShopCategory>('food');
  const [tierOverride, setTierOverride] = useState<'auto' | 'instant' | 'mid' | 'long'>('auto');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isWishable, setIsWishable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockThreshold, setLockThreshold] = useState(3000);

  const inferredTier = inferTier(cost);
  const finalTier = tierOverride === 'auto' ? inferredTier : tierOverride;
  const availableChips = SHOP_CATEGORIES[category].chips;

  function toggleTag(t: string) {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function addItem() {
    if (!name.trim()) { toast('名称不能为空', 'warn'); return; }

    const newItem: ShopItem = {
      id: newId('shop'),
      name: name.trim(),
      emoji,
      costPoints: Math.max(1, cost),
      stockPerWeek: Math.max(1, stockPerWeek),
      redeemedThisWeek: 0,
      weekKey: null,
      enabled: true,
      category,
      tier: finalTier,
      rotationStatus: 'displayed',
      lastDisplayedAt: Date.now(),
      tags: selectedTags,
      isWishable: isWishable && finalTier === 'long' ? true : undefined,
      isLocked: isLocked || undefined,
      unlockLifetimeThreshold: isLocked ? Math.max(0, lockThreshold) : undefined,
    };

    await db.shop.add(newItem);
    setName(''); setCost(100); setStockPerWeek(1);
    setSelectedTags([]); setIsWishable(false); setIsLocked(false);
    toast('已添加', 'success');
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await db.shop.update(id, { enabled });
  }

  async function delItem(id: string) {
    const ok = await confirmModal({
      title: '删除这个奖励？',
      body: '历史兑换记录会保留，孩子那边不再能选这个奖励。',
      emoji: '🗑',
      tone: 'danger',
      confirmLabel: '删除',
    });
    if (!ok) return;
    await db.shop.delete(id);
  }

  async function editCost(id: string, newCost: number) {
    await db.shop.update(id, { costPoints: Math.max(1, newCost) });
  }

  async function rotateNow() {
    if (!items) return;
    const plan = planRotation({
      items,
      now: Date.now(),
      wishedItemId: wishingPool?.shopItemId,
    });
    await applyRotation(plan, Date.now(), {
      shopUpdate: async (id, patch) => { await db.shop.update(id, patch); },
    });
    toast(`✓ ${plan.rationale}`, 'success');
  }

  // 列表分组：上架中 / 已下架 / 锁定区 / 心愿池中
  const grouped = (() => {
    const all = items ?? [];
    const inWishing = all.filter(i => i.id === wishingPool?.shopItemId);
    const locked = all.filter(i => i.isLocked && i.id !== wishingPool?.shopItemId);
    const displayed = all.filter(i =>
      i.enabled && !i.isLocked &&
      (i.rotationStatus ?? 'displayed') === 'displayed' &&
      i.id !== wishingPool?.shopItemId);
    const shelved = all.filter(i =>
      i.enabled && !i.isLocked && i.rotationStatus === 'shelved' &&
      i.id !== wishingPool?.shopItemId);
    const disabled = all.filter(i => !i.enabled);
    return { inWishing, locked, displayed, shelved, disabled };
  })();

  return (
    <div className="min-h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold flex-1">🎁 奖励商店管理</div>
        <WitnessButton compact />
        <button onClick={rotateNow} className="space-btn-ghost text-sm">🔄 轮转一下</button>
      </div>

      {/* 添加表单 */}
      <div className="space-card p-4 mb-3">
        <div className="text-sm mb-2 font-semibold" style={{ color: 'var(--ink-muted)' }}>添加奖励</div>

        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="名称（例如：DQ 雪糕券 / 大乐高套装）"
          className="w-full px-3 py-2 rounded-xl outline-none mb-2"
          style={{ background: 'var(--surface-mist)' }} />

        {/* emoji 选择 */}
        <div className="flex flex-wrap gap-1 mb-3">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="text-2xl w-9 h-9 rounded-lg"
              style={{ background: emoji === e ? 'var(--surface-fog)' : 'var(--surface-mist)' }}
            >{e}</button>
          ))}
        </div>

        {/* 分类 */}
        <div className="mb-3">
          <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>分类（必选）</div>
          <div className="flex gap-2">
            {ALL_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => { setCategory(c); setSelectedTags([]); }}
                aria-pressed={category === c}
                className={`tag-btn flex-1 ${category === c ? 'active' : ''}`}
              >
                {SHOP_CATEGORIES[c].emoji} {SHOP_CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </div>

        {/* 标签 chip 多选 */}
        <div className="mb-3">
          <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>标签（可多选）</div>
          <div className="flex flex-wrap gap-1.5">
            {availableChips.map(c => (
              <button
                key={c}
                onClick={() => toggleTag(c)}
                aria-pressed={selectedTags.includes(c)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  background: selectedTags.includes(c) ? 'var(--primary-soft)' : 'transparent',
                  color: selectedTags.includes(c) ? 'var(--primary-strong)' : 'var(--ink-muted)',
                  border: `1px solid ${selectedTags.includes(c) ? 'var(--primary)' : 'var(--surface-fog)'}`,
                  fontSize: 12,
                }}
              >
                #{c}
              </button>
            ))}
          </div>
        </div>

        {/* 价格 + 库存 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>所需积分</div>
            <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }} />
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>
              推断时间档：{finalTier === 'long' ? '🎯 长期' : finalTier === 'mid' ? '📅 中期' : '⚡ 即时'}
            </div>
          </label>
          <label>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>每周库存</div>
            <input type="number" value={stockPerWeek} onChange={e => setStockPerWeek(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }} />
          </label>
        </div>

        {/* 时间档手动覆盖 */}
        <div className="mb-3">
          <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>时间档（默认按价格推断）</div>
          <div className="flex gap-1.5">
            {(['auto', 'instant', 'mid', 'long'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTierOverride(t)}
                aria-pressed={tierOverride === t}
                className={`tag-btn flex-1 text-xs ${tierOverride === t ? 'active' : ''}`}
              >
                {t === 'auto' ? `自动(${inferredTier})` : t === 'instant' ? '⚡ 即时' : t === 'mid' ? '📅 中期' : '🎯 长期'}
              </button>
            ))}
          </div>
        </div>

        {/* 大件许愿池 / 锁定区 — 互斥 */}
        <div className="space-y-2 mb-3">
          {finalTier === 'long' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isWishable}
                onChange={e => { setIsWishable(e.target.checked); if (e.target.checked) setIsLocked(false); }}
              />
              <span className="text-sm">💫 做成"许愿池"大件</span>
              <span className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                孩子许愿后，每次得分 50% 自动流入；开局送 12% 起步
              </span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isLocked}
              onChange={e => { setIsLocked(e.target.checked); if (e.target.checked) setIsWishable(false); }}
            />
            <span className="text-sm">🔒 进锁定区"???"（神秘奖励）</span>
          </label>
          {isLocked && (
            <label className="block ml-6">
              <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>累计积分阈值（解锁后自动揭晓）</div>
              <input
                type="number"
                value={lockThreshold}
                onChange={e => setLockThreshold(Number(e.target.value))}
                className="w-32 px-3 py-1.5 rounded-xl outline-none text-sm"
                style={{ background: 'var(--surface-mist)' }}
              />
            </label>
          )}
        </div>

        <button onClick={addItem} className="space-btn w-full">+ 添加</button>
      </div>

      {/* 商品分组列表 */}
      <ItemSection title="🪟 当前展示中" hint="孩子打开商店就看到" items={grouped.displayed} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      <ItemSection title="📦 暂存（轮转中）" hint="本周不展示，会随轮转回归" items={grouped.shelved} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      <ItemSection title="🔒 锁定区" hint='以"???"形式挂底部，达成阈值才揭晓' items={grouped.locked} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      {grouped.inWishing.length > 0 && (
        <ItemSection title="💫 心愿池中" hint="孩子正在攒这一件" items={grouped.inWishing} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      )}
      {grouped.disabled.length > 0 && (
        <ItemSection title="🚫 已下架" hint="孩子看不到" items={grouped.disabled} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      )}
    </div>
  );
}

// ============================================================
function ItemSection({
  title, hint, items, editCost, toggleEnabled, delItem,
}: {
  title: string;
  hint?: string;
  items: ShopItem[];
  editCost: (id: string, n: number) => void;
  toggleEnabled: (id: string, b: boolean) => void;
  delItem: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="text-sm mb-1.5" style={{ color: 'var(--ink-muted)' }}>
        {title} <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>· {items.length} 件{hint && <> · {hint}</>}</span>
      </div>
      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className={`space-card p-3 flex items-center gap-3 ${!it.enabled ? 'opacity-50' : ''}`}>
            <div className="text-3xl">{it.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2 flex-wrap">
                {it.name}
                {it.isWishable && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--state-info-soft)', color: 'var(--state-info-strong)' }}>💫 许愿池</span>}
                {it.isLocked && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-fog)', color: 'var(--ink-muted)' }}>🔒 锁定</span>}
              </div>
              <div className="flex items-center gap-2 text-xs mt-1 flex-wrap" style={{ color: 'var(--ink-faint)' }}>
                <span>价</span>
                <input type="number" value={it.costPoints}
                  onChange={e => editCost(it.id, Number(e.target.value))}
                  className="w-20 px-2 py-0.5 rounded outline-none"
                  style={{ background: 'var(--surface-mist)' }} />
                <span>· 周 {it.stockPerWeek}</span>
                {it.category && <span>· {SHOP_CATEGORIES[it.category].emoji}{SHOP_CATEGORIES[it.category].label}</span>}
                {it.tier && <span>· {it.tier === 'long' ? '🎯' : it.tier === 'mid' ? '📅' : '⚡'}</span>}
                {it.tags && it.tags.length > 0 && <span className="truncate">· {it.tags.map(t => `#${t}`).join(' ')}</span>}
              </div>
            </div>
            <button
              onClick={() => toggleEnabled(it.id, !it.enabled)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: it.enabled ? 'var(--state-success-soft)' : 'var(--surface-mist)' }}
            >
              {it.enabled ? '上架' : '下架'}
            </button>
            {!it.id.startsWith('preset-') && (
              <button onClick={() => delItem(it.id)} className="px-2" style={{ color: 'var(--state-danger)' }}>🗑</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
