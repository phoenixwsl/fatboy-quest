// ============================================================
// R4.3.0: 我的卡片架（首页 streak 模块附近显示）
//
// 显示：
//   - 守护卡（来自 streak.guardCards 历史 + 新增 SkillCard guard）
//   - 豁免券（来自 streak.pardonCardsThisWeek 本周）
//   - 5 种新券（SkillCard 表 byType 计数）
//   - 求助券（无限）
//
// 点击：弹出明细 + 解锁条件说明（教孩子怎么再赚一张）
// ============================================================

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CARD_SPECS, groupByType } from '../lib/skillCards';
import type { SkillCardType } from '../types';

const HOW_TO_EARN: Record<SkillCardType, string> = {
  guard:   '连续 7 天达标自动赠 1 张',
  pardon:  '每周一自动 +2 张',
  extend:  '一周内完成 3 个金任务 → +1 张',
  replace: '每周一自动 +1 张',
  pause:   '终身积分每涨 200 → +1 张',
  help:    '永远可用，点首页"求助"按钮即可',
  skip:    '每月自动 +1 张',
  mystery: '本季度有评分任务 → +1 张',
};

export function SkillCardShelf() {
  const [open, setOpen] = useState(false);
  const cards = useLiveQuery(() => db.skillCards.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const inv = groupByType(cards ?? []);

  // 总计：legacy guard / pardon + 新增 + help 永远 1
  const guardLegacy = streak?.guardCards ?? 0;
  const pardonLegacy = streak?.pardonCardsThisWeek ?? 0;
  const guardTotal = guardLegacy + inv.byType.guard.length;
  const pardonTotal = pardonLegacy + inv.byType.pardon.length;
  const totalUsable = guardTotal + pardonTotal +
    inv.byType.extend.length + inv.byType.replace.length +
    inv.byType.pause.length + inv.byType.skip.length +
    inv.byType.mystery.length;

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
        {open && <ShelfDetailModal cards={cards ?? []} guardTotal={guardTotal} pardonTotal={pardonTotal} inv={inv} onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left mt-3 space-card p-3 flex items-center gap-2 active:scale-[0.99] transition-transform"
      >
        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>🃏 我的卡片</span>
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
          <CardChip emoji="🛡️" count={guardTotal} />
          <CardChip emoji="🌤️" count={pardonTotal} />
          {inv.byType.extend.length > 0 && <CardChip emoji="⏱️" count={inv.byType.extend.length} />}
          {inv.byType.replace.length > 0 && <CardChip emoji="🔄" count={inv.byType.replace.length} />}
          {inv.byType.pause.length > 0 && <CardChip emoji="⏸️" count={inv.byType.pause.length} />}
          {inv.byType.skip.length > 0 && <CardChip emoji="⏭️" count={inv.byType.skip.length} />}
          {inv.byType.mystery.length > 0 && <CardChip emoji="🎁" count={inv.byType.mystery.length} />}
          <CardChip emoji="🆘" count={Infinity} />
        </div>
        <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>›</span>
      </button>

      {open && <ShelfDetailModal cards={cards ?? []} guardTotal={guardTotal} pardonTotal={pardonTotal} inv={inv} onClose={() => setOpen(false)} />}
    </>
  );
}

// ============================================================
function ShelfDetailModal({
  guardTotal, pardonTotal, inv, onClose,
}: {
  cards: import('../types').SkillCard[];
  guardTotal: number;
  pardonTotal: number;
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
          <div className="text-lg font-bold flex-1">🃏 我的卡片</div>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--ink-faint)' }}>×</button>
        </div>
        <CardRow type="guard"   count={guardTotal}     howTo={HOW_TO_EARN.guard} />
        <CardRow type="pardon"  count={pardonTotal}    howTo={HOW_TO_EARN.pardon + '（断击当天可用）'} />
        <CardRow type="extend"  count={inv.byType.extend.length}  howTo={HOW_TO_EARN.extend} />
        <CardRow type="replace" count={inv.byType.replace.length} howTo={HOW_TO_EARN.replace} />
        <CardRow type="pause"   count={inv.byType.pause.length}   howTo={HOW_TO_EARN.pause} />
        <CardRow type="skip"    count={inv.byType.skip.length}    howTo={HOW_TO_EARN.skip} />
        <CardRow type="mystery" count={inv.byType.mystery.length} howTo={HOW_TO_EARN.mystery} />
        <CardRow type="help"    count={Infinity}                  howTo={HOW_TO_EARN.help} />
        <div className="text-[10px] mt-3 text-center" style={{ color: 'var(--ink-faint)' }}>
          卡片 30 天后过期，珍惜使用 🌟
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
