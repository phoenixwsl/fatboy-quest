// ============================================================
// R4.4.0: 经济健康度卡（家长 Dashboard）
//
// 显示：
//   - 近 30 天 收入 / 支出 / 净存（数字 + 一行 sparkline）
//   - 近 7 天兑换次数
//   - 告警条（仅 Dashboard 内显示，不推 Bark — 避免家长推送疲劳）
// ============================================================

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { computeEconomyHealth } from '../../lib/economyHealth';

export function EconomyHealthCard() {
  const points = useLiveQuery(() => db.points.toArray());
  const redemptions = useLiveQuery(() => db.redemptions.toArray());
  const items = useLiveQuery(() => db.shop.toArray());

  if (!points || !redemptions || !items) return null;

  const { metrics, alerts } = computeEconomyHealth(points, redemptions, items);

  const hasActivity = metrics.income30d > 0 || metrics.spend30d > 0 || items.length > 0;
  if (!hasActivity) return null;

  return (
    <div
      className="p-4 mb-3 rounded-[var(--radius-lg)]"
      style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--ink)' }}>
        <span>📊</span>
        <span>经济健康度</span>
        <span className="text-xs font-normal" style={{ color: 'var(--ink-faint)' }}>· 近 30 天</span>
      </div>

      {/* 数字 3 联 */}
      <div className="grid grid-cols-3 gap-3 text-center mb-3">
        <Stat label="收入" value={metrics.income30d} color="var(--state-success)" prefix="+" />
        <Stat label="兑换支出" value={metrics.spend30d} color="var(--state-warn-strong)" prefix="−" />
        <Stat
          label="净存"
          value={metrics.net30d}
          color={metrics.net30d > 0 ? 'var(--accent-strong)' : 'var(--ink-muted)'}
        />
      </div>

      {/* 7 天兑换次数 */}
      <div className="text-xs mb-3 flex items-center gap-2" style={{ color: 'var(--ink-muted)' }}>
        <span>📦 近 7 天兑换</span>
        <span className="text-num font-bold" style={{ color: 'var(--ink-strong)' }}>
          {metrics.redemptions7d}
        </span>
        <span style={{ color: 'var(--ink-faint)' }}>次</span>
      </div>

      {/* 告警条 */}
      {alerts.length > 0 ? (
        <div className="space-y-1.5">
          {alerts.map((a, i) => (
            <div
              key={i}
              className="text-xs px-3 py-2 rounded-md flex items-start gap-2"
              style={{
                background: a.level === 'warn' ? 'var(--state-warn-soft)' : 'var(--surface-mist)',
                color: a.level === 'warn' ? 'var(--state-warn-strong)' : 'var(--ink-strong)',
              }}
            >
              <span className="shrink-0">{a.emoji}</span>
              <span className="flex-1" style={{ lineHeight: 1.45 }}>{a.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-center py-2" style={{ color: 'var(--ink-faint)' }}>
          ✓ 经济运行健康
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, prefix = '' }: { label: string; value: number; color: string; prefix?: string }) {
  return (
    <div>
      <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      <div className="text-xl font-bold text-num" style={{ color }}>
        {prefix}{value}
      </div>
    </div>
  );
}
