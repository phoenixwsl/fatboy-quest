// ============================================================
// R4.2.0: 心愿池进度条（首页 / 商店常驻）
//
// 复用 ProgressBar；额外加：商品 emoji + 名称 + "我的心愿"标签 +
// 锁定状态提示 + 进店按钮
// ============================================================

import type { WishingPool, ShopItem } from '../types';
import { useNavigate } from 'react-router-dom';
import { ProgressBar } from './ProgressBar';
import { isUnlocked, progressPct } from '../lib/wishingPool';

interface Props {
  pool: WishingPool;
  item: ShopItem | undefined;
  showCancelHint?: boolean;
  onClick?: () => void;
}

export function WishingPoolBar({ pool, item, showCancelHint, onClick }: Props) {
  const nav = useNavigate();
  const handle = onClick ?? (() => nav('/shop'));
  const pct = progressPct(pool);
  const remaining = Math.max(0, pool.targetPoints - pool.currentProgress);
  const fulfilled = pool.currentProgress >= pool.targetPoints;
  const unlocked = isUnlocked(pool);

  return (
    <div
      className="space-card p-3 cursor-pointer"
      style={{ borderColor: fulfilled ? 'var(--state-warn)' : 'var(--surface-fog)' }}
      onClick={handle}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-3xl">{item?.emoji ?? '🎁'}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>💫 我的心愿</div>
          <div className="font-medium truncate">{item?.name ?? '???'}</div>
        </div>
        {fulfilled && (
          <div
            className="text-xs px-2 py-1 rounded font-bold"
            style={{ background: 'var(--state-warn-soft)', color: 'var(--state-warn-strong)' }}
          >
            达成 ✨
          </div>
        )}
      </div>
      <ProgressBar
        current={pool.currentProgress}
        target={pool.targetPoints}
        startBonus={pool.startBonusPoints}
        tone="points"
        size="md"
        rightHint={fulfilled ? `${pool.targetPoints} / ${pool.targetPoints}` : `${pct}% · 还差 ${remaining}`}
      />
      {showCancelHint && (
        <div className="text-[10px] mt-1.5" style={{ color: 'var(--ink-faint)' }}>
          {unlocked
            ? '7 天承诺期已过，可以撤销许愿（退 70% 已积进度）'
            : '许愿后 7 天内不能改愿，专心攒'}
        </div>
      )}
    </div>
  );
}
