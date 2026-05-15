// ============================================================
// R5.3.0: 卡牌展示柜 (/collection)
//
// 显示孩子收藏的卡牌：按 type 分组，已解锁堆叠 + 未解锁剪影
// 与"成就馆"（里程碑）和"贴纸墙"（见证）正交
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

  return (
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 首页</button>
        <div className="text-xl font-bold flex-1">🃏 我的卡牌</div>
        <span className="text-xs text-num" style={{ color: 'var(--ink-faint)' }}>共 {inv.total} 张</span>
      </div>

      {inv.total === 0 && <EmptyState />}

      <div className="space-y-4">
        {(Object.keys(CARD_CATALOG) as CollectibleCardType[]).map(type => {
          const owned = inv.byType[type];
          const spec = CARD_CATALOG[type];
          return <CardTypeSection key={type} type={type} spec={spec} count={owned.length} latestAt={owned[owned.length - 1]?.earnedAt} />;
        })}
      </div>

      <div className="text-[10px] mt-6 text-center" style={{ color: 'var(--ink-faint)' }}>
        卡牌永远不会消失，越攒越多 ✨
      </div>
    </div>
  );
}

// ============================================================
function CardTypeSection({
  type, spec, count, latestAt,
}: {
  type: CollectibleCardType;
  spec: typeof CARD_CATALOG[CollectibleCardType];
  count: number;
  latestAt: number | undefined;
}) {
  const unlocked = count > 0;
  return (
    <div
      className="space-card p-4"
      style={{
        opacity: unlocked ? 1 : 0.6,
        borderLeft: `4px solid ${unlocked ? 'var(--accent)' : 'var(--surface-fog)'}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* 大 emoji + 堆叠效果 */}
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
          <div
            className="absolute inset-0 flex items-center justify-center text-4xl"
            style={{
              background: unlocked ? 'var(--accent-soft)' : 'var(--surface-mist)',
              borderRadius: 'var(--radius-md)',
              filter: unlocked ? 'none' : 'grayscale(0.7)',
            }}
          >
            {unlocked ? spec.emoji : '?'}
          </div>
          {/* 堆叠效果：count > 1 显示 */}
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
            {unlocked ? spec.name : '?? 还没解锁'}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
            {spec.description}
          </div>
          {unlocked && latestAt && (
            <div className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>
              最近一张：{new Date(latestAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center mt-12" style={{ color: 'var(--ink-faint)' }}>
      <div className="text-5xl mb-3">🃏</div>
      <div className="text-sm">还没有卡牌</div>
      <div className="text-xs mt-2">
        完成长任务（≥ 30 分钟）会得专注卡 🎯<br/>
        当日所有任务都完美会得"完美一天"卡 🌟<br/>
        周末完成全部任务会得"周末战士"卡 ⚡
      </div>
    </div>
  );
}
