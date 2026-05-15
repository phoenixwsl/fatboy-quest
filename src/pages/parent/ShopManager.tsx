// ============================================================
// R5.0.0: ShopManager — 通路二选一 + UnlockConditionEditor 嵌入
//   + 位置预览 + 章节副标 + 列表色条
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
import { UnlockConditionEditor } from '../../components/UnlockConditionEditor';
import type { ShopItem } from '../../types';
import type { UnlockCondition } from '../../lib/unlockCondition';

const EMOJIS = ['🍦', '🥤', '🍕', '🍩', '🍪', '🎮', '📺', '🎁', '⚽', '🧸', '📚', '🌱', '🪴', '🧱', '🎨', '✨', '🏆', '💡'];

function inferTier(cost: number): 'instant' | 'mid' | 'long' {
  if (cost >= 1000) return 'long';
  if (cost >= 200)  return 'mid';
  return 'instant';
}

type Channel = 'points' | 'condition';

export function ShopManager() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const items = useLiveQuery(() => db.shop.toArray());
  const wishingPool = useLiveQuery(() => db.wishingPool.get('singleton'));

  // 通用字段
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [category, setCategory] = useState<ShopCategory>('toy');
  const [tierOverride, setTierOverride] = useState<'auto' | 'instant' | 'mid' | 'long'>('auto');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 通路：积分 vs 条件
  const [channel, setChannel] = useState<Channel>('points');

  // 积分通路字段
  const [cost, setCost] = useState(100);
  const [stockPerWeek, setStockPerWeek] = useState(1);
  const [isWishable, setIsWishable] = useState(false);

  // 条件通路字段
  const [unlockCond, setUnlockCond] = useState<UnlockCondition | null>(
    { kind: 'lifetimePoints', threshold: 1000 },
  );
  const [isLocked, setIsLocked] = useState(false);

  const inferredTier = inferTier(cost);
  const finalTier = tierOverride === 'auto' ? inferredTier : tierOverride;
  const availableChips = SHOP_CATEGORIES[category].chips;

  function toggleTag(t: string) {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  // 位置预览
  const placementPreview = (() => {
    if (channel === 'condition' && isLocked) {
      return { color: '#9C8CD9', text: '锁定区"???"剪影 · 达成阈值后揭晓' };
    }
    if (channel === 'condition') {
      return { color: '#7FC8A9', text: `${SHOP_CATEGORIES[category].label} · 进度条形式（达成可领取）` };
    }
    if (channel === 'points' && isWishable && finalTier === 'long') {
      return { color: '#FFD66B', text: `${SHOP_CATEGORIES[category].label} · 显示"💫 许愿"按钮，许愿后进心愿池` };
    }
    return { color: '#F5A04A', text: `${SHOP_CATEGORIES[category].label} · 普通商品流` };
  })();

  async function addItem() {
    if (!name.trim()) { toast('名称不能为空', 'warn'); return; }

    const baseFields = {
      id: newId('shop'),
      name: name.trim(),
      emoji,
      stockPerWeek: channel === 'points' ? Math.max(1, stockPerWeek) : 0,
      redeemedThisWeek: 0,
      weekKey: null,
      enabled: true,
      category,
      tier: finalTier,
      rotationStatus: 'displayed' as const,
      lastDisplayedAt: Date.now(),
      tags: selectedTags,
    };

    let item: ShopItem;
    if (channel === 'condition') {
      if (!unlockCond) { toast('请配置解锁条件', 'warn'); return; }
      item = {
        ...baseFields,
        costPoints: 0,
        unlockCondition: unlockCond,
        ...(isLocked ? {
          isLocked: true,
          unlockLifetimeThreshold:
            unlockCond.kind === 'lifetimePoints' ? unlockCond.threshold : undefined,
        } : {}),
      };
    } else {
      item = {
        ...baseFields,
        costPoints: Math.max(1, cost),
        ...(isWishable && finalTier === 'long' ? { isWishable: true } : {}),
      };
    }

    await db.shop.add(item);
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

  // 列表分组
  const grouped = (() => {
    const all = items ?? [];
    const inWishing = all.filter(i => i.id === wishingPool?.shopItemId);
    const locked = all.filter(i => i.isLocked && i.id !== wishingPool?.shopItemId);
    const conditional = all.filter(i =>
      i.enabled && !i.isLocked && i.unlockCondition &&
      i.id !== wishingPool?.shopItemId);
    const displayed = all.filter(i =>
      i.enabled && !i.isLocked && !i.unlockCondition &&
      (i.rotationStatus ?? 'displayed') === 'displayed' &&
      i.id !== wishingPool?.shopItemId);
    const shelved = all.filter(i =>
      i.enabled && !i.isLocked && !i.unlockCondition &&
      i.rotationStatus === 'shelved' &&
      i.id !== wishingPool?.shopItemId);
    const disabled = all.filter(i => !i.enabled);
    return { inWishing, locked, conditional, displayed, shelved, disabled };
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
        <div className="text-sm mb-3 font-semibold" style={{ color: 'var(--ink-muted)' }}>添加奖励</div>

        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="名称（例如：DQ 雪糕券 / 大乐高套装）"
          className="w-full px-3 py-2 rounded-xl outline-none mb-3"
          style={{ background: 'var(--surface-mist)' }} />

        {/* emoji */}
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

        {/* 通路二选一 */}
        <div className="mb-3">
          <div className="text-xs mb-1.5" style={{ color: 'var(--ink-faint)' }}>获取通路（二选一）</div>
          <div className="flex gap-2">
            <button
              onClick={() => setChannel('points')}
              aria-pressed={channel === 'points'}
              className={`tag-btn flex-1 ${channel === 'points' ? 'active' : ''}`}
            >
              💰 积分换
            </button>
            <button
              onClick={() => setChannel('condition')}
              aria-pressed={channel === 'condition'}
              className={`tag-btn flex-1 ${channel === 'condition' ? 'active' : ''}`}
            >
              🎯 任务条件解锁
            </button>
          </div>
        </div>

        {/* 通路相关字段 */}
        {channel === 'points' && (
          <>
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

            {finalTier === 'long' && (
              <label className="flex items-start gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={isWishable}
                  onChange={e => setIsWishable(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm">💫 做成"许愿池"大件</div>
                  <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                    孩子许愿后，每次得分 50% 自动流入；开局送 12% 起步
                  </div>
                </div>
              </label>
            )}
          </>
        )}

        {channel === 'condition' && (
          <>
            <div className="mb-3 p-3 rounded" style={{ background: 'var(--surface-mist)' }}>
              <UnlockConditionEditor value={unlockCond} onChange={setUnlockCond} />
            </div>
            <label className="flex items-start gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={e => setIsLocked(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm">🔒 进锁定区"???"（神秘奖励）</div>
                <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>
                  孩子端只看到剪影 + 模糊线索；达成阈值后揭晓
                </div>
              </div>
            </label>
          </>
        )}

        {/* 位置预览 */}
        <div
          className="p-2.5 rounded text-xs mb-3"
          style={{
            background: placementPreview.color + '22',
            color: placementPreview.color,
            borderLeft: `3px solid ${placementPreview.color}`,
          }}
        >
          📍 位置预览：{placementPreview.text}
        </div>

        <button onClick={addItem} className="space-btn w-full">+ 添加</button>
      </div>

      {/* 商品分组列表 */}
      <ItemSection title="🪟 当前展示中" hint="孩子打开商店第一眼看到的" color="#7FC8A9" items={grouped.displayed} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      <ItemSection title="🎯 条件解锁" hint="进度条形式，达成自动揭晓" color="#FFD66B" items={grouped.conditional} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      <ItemSection title="🔒 锁定区" hint='以"???"形式挂底部' color="#9C8CD9" items={grouped.locked} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      <ItemSection title="📦 暂存（轮转中）" hint="本周不展示，会随轮转回归" color="#A0B8B0" items={grouped.shelved} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      {grouped.inWishing.length > 0 && (
        <ItemSection title="💫 心愿池中" hint="孩子正在攒这一件" color="#F5A04A" items={grouped.inWishing} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      )}
      {grouped.disabled.length > 0 && (
        <ItemSection title="🚫 已下架" hint="孩子看不到" color="#C0C0C0" items={grouped.disabled} editCost={editCost} toggleEnabled={toggleEnabled} delItem={delItem} />
      )}
    </div>
  );
}

// ============================================================
function ItemSection({
  title, hint, color, items, editCost, toggleEnabled, delItem,
}: {
  title: string;
  hint?: string;
  color: string;
  items: ShopItem[];
  editCost: (id: string, n: number) => void;
  toggleEnabled: (id: string, b: boolean) => void;
  delItem: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="text-sm mb-2 flex items-baseline gap-1.5" style={{ color: 'var(--ink-muted)' }}>
        <span style={{ display: 'inline-block', width: 4, height: 14, background: color, borderRadius: 2 }} />
        <span className="font-semibold">{title}</span>
        <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>· {items.length} 件{hint && ` · ${hint}`}</span>
      </div>
      <div className="space-y-2">
        {items.map(it => (
          <div
            key={it.id}
            className={`space-card p-3 flex items-center gap-3 ${!it.enabled ? 'opacity-50' : ''}`}
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="text-3xl">{it.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2 flex-wrap">
                {it.name}
                {it.isWishable && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--state-info-soft)', color: 'var(--state-info-strong)' }}>💫 许愿池</span>}
                {it.isLocked && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-fog)', color: 'var(--ink-muted)' }}>🔒 锁定</span>}
                {it.unlockCondition && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--state-warn-soft)', color: 'var(--state-warn-strong)' }}>🎯 条件</span>}
              </div>
              <div className="flex items-center gap-2 text-xs mt-1 flex-wrap" style={{ color: 'var(--ink-faint)' }}>
                {it.costPoints > 0 ? (
                  <>
                    <span>价</span>
                    <input type="number" value={it.costPoints}
                      onChange={e => editCost(it.id, Number(e.target.value))}
                      className="w-20 px-2 py-0.5 rounded outline-none"
                      style={{ background: 'var(--surface-mist)' }} />
                    <span>· 周 {it.stockPerWeek}</span>
                  </>
                ) : (
                  <span>· 不要积分</span>
                )}
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
            {it.id.startsWith('preset-') && (
              <button onClick={() => delItem(it.id)} className="px-2" style={{ color: 'var(--ink-faint)' }} title="预置项也可删除">🗑</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
