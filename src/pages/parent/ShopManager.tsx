import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { useAppStore } from '../../store/useAppStore';

const EMOJIS = ['🍦', '🥤', '🍕', '🍔', '🍩', '🍪', '🎮', '📺', '🎁', '⚽', '🧸', '📚', '🛡️', '⭐'];

export function ShopManager() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const items = useLiveQuery(() => db.shop.toArray());

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [cost, setCost] = useState(100);
  const [stockPerWeek, setStockPerWeek] = useState(1);

  async function addItem() {
    if (!name.trim()) { toast('名称不能为空', 'warn'); return; }
    await db.shop.add({
      id: newId('shop'), name: name.trim(), emoji, costPoints: Math.max(1, cost),
      stockPerWeek: Math.max(1, stockPerWeek), redeemedThisWeek: 0,
      weekKey: null, enabled: true,
    });
    setName(''); setCost(100); setStockPerWeek(1);
    toast('已添加', 'success');
  }

  async function toggleItem(id: string, enabled: boolean) {
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

  return (
    <div className="min-h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">🎁 奖励商店管理</div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>添加奖励</div>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="名称（例如：DQ 雪糕券）"
          className="w-full px-3 py-2 rounded-xl outline-none mb-2"
          style={{ background: 'var(--surface-mist)' }} />
        <div className="flex flex-wrap gap-1 mb-2">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              className="text-2xl w-10 h-10 rounded-lg"
              style={{ background: emoji === e ? 'var(--surface-fog)' : 'var(--surface-mist)' }}
            >{e}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>所需积分</div>
            <input type="number" value={cost} onChange={e => setCost(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }} />
          </label>
          <label>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>每周库存</div>
            <input type="number" value={stockPerWeek} onChange={e => setStockPerWeek(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl outline-none"
              style={{ background: 'var(--surface-mist)' }} />
          </label>
        </div>
        <button onClick={addItem} className="space-btn w-full mt-3">+ 添加</button>
      </div>

      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>现有奖励 ({items?.length ?? 0})</div>
      <div className="space-y-2">
        {items?.map(it => (
          <div key={it.id} className={`space-card p-3 flex items-center gap-3 ${!it.enabled ? 'opacity-50' : ''}`}>
            <div className="text-3xl">{it.emoji}</div>
            <div className="flex-1">
              <div className="font-medium">{it.name}</div>
              <div className="flex items-center gap-2 text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
                <span>价格</span>
                <input type="number" value={it.costPoints}
                  onChange={e => editCost(it.id, Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded outline-none"
                  style={{ background: 'var(--surface-mist)' }}
                  disabled={it.id === 'preset-guard'} />
                <span>· 每周 {it.stockPerWeek} 个</span>
              </div>
              {it.id === 'preset-guard' && <div className="text-xs mt-0.5" style={{ color: 'var(--state-warn)' }}>守护卡价格自动 = 日均×3</div>}
            </div>
            <button
              onClick={() => toggleItem(it.id, !it.enabled)}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: it.enabled ? 'var(--state-success-soft)' : 'var(--surface-mist)' }}
            >
              {it.enabled ? '已上架' : '已下架'}
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
