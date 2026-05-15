// ============================================================
// R4.4.0: 孩子端贴纸墙
//
// 显示家长记录的"温柔时刻"——按月分组、emoji + 文字 + 妈妈/爸爸 chip。
// 不可编辑、不可删（家长端 Dashboard/ShopManager 才能管理）。
// 是孩子身份认同 ("我是温柔的孩子") 的可视化沉淀。
// ============================================================

import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { groupByMonth } from '../lib/witnessMoment';

export function StickerWall() {
  const nav = useNavigate();
  const moments = useLiveQuery(() => db.witnessMoments.toArray());

  if (!moments) {
    return (
      <div className="min-h-full p-4 flex items-center justify-center" style={{ color: 'var(--ink-faint)' }}>
        加载中...
      </div>
    );
  }

  const groups = groupByMonth(moments);

  return (
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 首页</button>
        <div className="text-xl font-bold">💛 我的贴纸墙</div>
      </div>

      {moments.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <section key={g.monthKey}>
              <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>
                {g.monthLabel} · {g.moments.length} 个时刻
              </div>
              <div className="space-y-2">
                {g.moments.map(m => {
                  const d = new Date(m.ts);
                  const date = `${d.getMonth() + 1}/${d.getDate()}`;
                  return (
                    <div key={m.id} className="space-card p-4 flex items-start gap-3">
                      <div className="text-3xl shrink-0">{m.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm" style={{ color: 'var(--ink-strong)', lineHeight: 1.5 }}>
                          {m.text}
                        </div>
                        <div className="text-[11px] mt-1.5 flex items-center gap-2" style={{ color: 'var(--ink-faint)' }}>
                          <span>{date}</span>
                          <span
                            className="px-1.5 py-0.5 rounded"
                            style={{
                              background: 'var(--accent-soft)',
                              color: 'var(--accent-strong)',
                            }}
                          >
                            {m.fromLabel}见证
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center mt-16" style={{ color: 'var(--ink-faint)' }}>
      <div className="text-5xl mb-3">🌱</div>
      <div className="text-sm">爸爸妈妈还没有写温柔时刻</div>
      <div className="text-xs mt-2" style={{ color: 'var(--ink-faint)' }}>
        他们看到你做了什么很棒的事，会写在这里 💛
      </div>
    </div>
  );
}
