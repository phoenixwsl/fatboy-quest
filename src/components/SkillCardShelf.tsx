// ============================================================
// R5.2.0: 我的卡片架（精简到 4 种券）
//
// 显示：
//   - 守护卡：连续 7 日达标自动 +1
//   - 延时券：本周完成 3 个金任务 +1
//   - 跳过券：每月自动 +1
//   - 神秘券：本季度有评分任务 +1
//
// 删了：豁免券 / 替换券 / 暂停券 / 求助券（机制全删）
// 点击：弹出明细 + 解锁条件
// ============================================================

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CARD_SPECS, groupByType } from '../lib/skillCards';
import type { SkillCardType } from '../types';

const HOW_TO_EARN: Record<string, string> = {
  guard:   '连续 7 天达标自动赠 1 张',
  extend:  '一周内完成 3 个 3 星任务 → +1 张',
  skip:    '每月自动 +1 张',
  mystery: '本季度有评分任务 → +1 张',
};

export function SkillCardShelf() {
  const [open, setOpen] = useState(false);
  const cards = useLiveQuery(() => db.skillCards.toArray());
  const inv = groupByType(cards ?? []);

  // R5.2.0: 只算 4 种活跃券
  const guardTotal   = inv.byType.guard.length;
  const extendTotal  = inv.byType.extend.length;
  const skipTotal    = inv.byType.skip.length;
  const mysteryTotal = inv.byType.mystery.length;
  const totalUsable  = guardTotal + extendTotal + skipTotal + mysteryTotal;
  // legacy 保留为 0（豁免券机制已删；老代码引用兜底）
  const pardonTotal = 0;

  // R5.0.0: 即使 0 卡（仅求助券），也显示醒目入口 — 让孩子知道有这个机制
  if (totalUsable === 0) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="w-full text-left mt-3 space-card p-3 flex items-center gap-2 active:scale-[0.99] transition-transform"
          style={{ borderStyle: 'dashed' }}
        >
          <span className="text-2xl">🃏</span>
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: 'var(--ink-strong)' }}>我的卡片</div>
            <div className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
              做任务能赚卡，点开看怎么解锁
            </div>
          </div>
          <span className="text-xs">›</span>
        </button>
        {open && <ShelfDetailModal cards={cards ?? []} guardTotal={guardTotal} inv={inv} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left mt-3 space-card p-3 flex items-center gap-2 active:scale-[0.99] transition-transform"
      >
        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>🃏 我的券</span>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
          {guardTotal   > 0 && <CardChip emoji="🛡️" count={guardTotal} />}
          {extendTotal  > 0 && <CardChip emoji="⏱️" count={extendTotal} />}
          {skipTotal    > 0 && <CardChip emoji="⏭️" count={skipTotal} />}
          {mysteryTotal > 0 && <CardChip emoji="🎁" count={mysteryTotal} />}
        </div>
        <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>›</span>
      </button>

      {open && <ShelfDetailModal cards={cards ?? []} guardTotal={guardTotal} inv={inv} onClose={() => setOpen(false)} />}
    </>
  );
}

// ============================================================
function ShelfDetailModal({
  guardTotal, inv, onClose,
}: {
  cards: import('../types').SkillCard[];
  guardTotal: number;
  inv: ReturnType<typeof groupByType>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4"
      onClick={onClose}
    >
      <div
        className="space-card w-full max-w-md p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <div className="flex items-center mb-3">
          <div className="text-lg font-bold flex-1">🃏 我的券</div>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--ink-faint)' }}>×</button>
        </div>
        <CardRow type="guard"   count={guardTotal}     howTo={HOW_TO_EARN.guard} />
        <CardRow type="extend"  count={inv.byType.extend.length}  howTo={HOW_TO_EARN.extend} />
        <CardRow type="skip"    count={inv.byType.skip.length}    howTo={HOW_TO_EARN.skip} />
        <CardRow type="mystery" count={inv.byType.mystery.length} howTo={HOW_TO_EARN.mystery} />
        <div className="text-[10px] mt-3 text-center" style={{ color: 'var(--ink-faint)' }}>
          券 30 天后过期，珍惜使用 🌟
        </div>
      </div>
    </div>
  );
}

function CardChip({ emoji, count }: { emoji: string; count: number }) {
  if (count === Infinity) {
    return (
      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
            style={{ background: 'var(--surface-mist)' }}>
        <span>{emoji}</span><span className="text-num">∞</span>
      </span>
    );
  }
  if (count === 0) return null;
  return (
    <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs"
          style={{ background: 'var(--surface-mist)' }}>
      <span>{emoji}</span><span className="text-num">{count}</span>
    </span>
  );
}

function CardRow({ type, count, howTo }: { type: SkillCardType; count: number; howTo: string }) {
  const spec = CARD_SPECS[type];
  return (
    <div className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'var(--surface-fog)' }}>
      <div className="text-2xl">{spec.emoji}</div>
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2">
          <span>{spec.label}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded text-num"
            style={{
              background: count > 0 ? 'var(--state-success-soft)' : 'var(--surface-mist)',
              color: count > 0 ? 'var(--state-success-strong)' : 'var(--ink-faint)',
            }}
          >
            {count === Infinity ? '∞' : count}
          </span>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>{spec.desc}</div>
        <div className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>📖 {howTo}</div>
      </div>
    </div>
  );
}
