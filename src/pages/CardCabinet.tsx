// ============================================================
// R5.4.0: 卡牌展示柜 (/collection) 重写
//
// 改动：
//   - 删 EmptyState 大问号占位
//   - 标题不带 🃏 emoji
//   - 始终展示全 catalog（已解锁 / 未解锁分组）
//   - 未解锁也显示真实 emoji（仅灰化），不用 "?" 隐藏
//   - 显示 0/N 进度（计 issuance 次数）
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CARD_CATALOG, groupCards } from '../lib/cards';
import type { CollectibleCardType } from '../types';

export function CardCabinet() {
  const nav = useNavigate();
  const cards = useLiveQuery(() => db.cards.toArray());

  if (!cards) {
    return (
      <div className="min-h-full p-4 flex items-center justify-center" style={{ color: 'var(--ink-faint)' }}>
        加载中...
      </div>
    );
  }

  const inv = groupCards(cards);
  const allTypes = Object.keys(CARD_CATALOG) as CollectibleCardType[];
  const unlockedTypes = allTypes.filter(t => inv.byType[t].length > 0);
  const lockedTypes = allTypes.filter(t => inv.byType[t].length === 0);

  return (
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 首页</button>
        <div className="text-xl font-bold flex-1">我的卡牌</div>
        <span className="text-xs text-num" style={{ color: 'var(--ink-faint)' }}>
          {unlockedTypes.length}/{allTypes.length} 种 · 共 {inv.total} 张
        </span>
      </div>

      {/* 已解锁的 */}
      {unlockedTypes.length > 0 && (
        <>
          <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>
            ✨ 已收藏 · {unlockedTypes.length} 种
          </div>
          <div className="space-y-2 mb-5">
            {unlockedTypes.map(type => (
              <CardRow
                key={type}
                type={type}
                spec={CARD_CATALOG[type]}
                count={inv.byType[type].length}
                latestAt={inv.byType[type][inv.byType[type].length - 1]?.earnedAt}
                unlocked
              />
            ))}
          </div>
        </>
      )}

      {/* 未解锁的 */}
      {lockedTypes.length > 0 && (
        <>
          <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>
            🌱 未解锁 · {lockedTypes.length} 种
          </div>
          <div className="space-y-2">
            {lockedTypes.map(type => (
              <CardRow
                key={type}
                type={type}
                spec={CARD_CATALOG[type]}
                count={0}
                latestAt={undefined}
                unlocked={false}
              />
            ))}
          </div>
        </>
      )}

      <div className="text-[10px] mt-6 text-center" style={{ color: 'var(--ink-faint)' }}>
        卡牌永远不会消失，越攒越多 ✨
      </div>
    </div>
  );
}

// ============================================================
function CardRow({
  type, spec, count, latestAt, unlocked,
}: {
  type: CollectibleCardType;
  spec: typeof CARD_CATALOG[CollectibleCardType];
  count: number;
  latestAt: number | undefined;
  unlocked: boolean;
}) {
  return (
    <div
      className="space-card p-4"
      style={{
        opacity: unlocked ? 1 : 0.55,
        borderLeft: `4px solid ${unlocked ? 'var(--accent)' : 'var(--surface-fog)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
          <div
            className="absolute inset-0 flex items-center justify-center text-4xl"
            style={{
              background: unlocked ? 'var(--accent-soft)' : 'var(--surface-mist)',
              borderRadius: 'var(--radius-md)',
              filter: unlocked ? 'none' : 'grayscale(0.85)',
            }}
            aria-label={spec.name}
          >
            {spec.emoji}
          </div>
          {count > 1 && (
            <div
              className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-xs font-bold text-num"
              style={{ background: 'var(--state-warn)', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
            >
              ×{count}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-medium" style={{ color: unlocked ? 'var(--ink-strong)' : 'var(--ink-muted)' }}>
            {spec.name}
            {unlocked && count > 0 && (
              <span className="text-xs ml-2 text-num" style={{ color: 'var(--accent-strong)' }}>
                你有 {count} 张
              </span>
            )}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
            {spec.description}
          </div>
          {unlocked && latestAt ? (
            <div className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>
              最近一张：{new Date(latestAt).toLocaleDateString()}
            </div>
          ) : (
            <div className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>
              当前 0/1 — 触发条件后立即获得
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
