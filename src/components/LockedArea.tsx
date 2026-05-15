// ============================================================
// R4.1.0: 商店底部锁定区"???"剪影
//
// 利用 Loewenstein curiosity gap：未知 > 已知够不到（动机高 40%+）
// 显示：剪影 emoji（去饱和）+ 模糊描述 + 解锁条件 + 进度条
// 不允许点击兑换；解锁后自动转 displayed
// ============================================================

import type { ShopItem } from '../types';
import type { UnlockContext } from '../lib/unlockCondition';
import { evaluateCondition, describeCondition } from '../lib/unlockCondition';
import { ProgressBar } from './ProgressBar';

interface Props {
  items: ShopItem[];
  context: UnlockContext;
}

export function LockedArea({ items, context }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="text-sm mb-2 flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
        🔒 <span>神秘奖励</span>
        <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>· 累计够了就揭晓</span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 2).map(item => (
          <LockedRow key={item.id} item={item} context={context} />
        ))}
      </div>
    </div>
  );
}

function LockedRow({ item, context }: { item: ShopItem; context: UnlockContext }) {
  const cond = item.unlockCondition
    ?? (item.unlockLifetimeThreshold !== undefined
        ? { kind: 'lifetimePoints' as const, threshold: item.unlockLifetimeThreshold }
        : null);
  if (!cond) return null;
  const progress = evaluateCondition(cond, context);
  const tone = cond.kind === 'taskCount'
    ? (cond.star === 'gold' ? 'gold' : cond.star === 'silver' ? 'silver' : 'bronze')
    : 'points';

  return (
    <div
      className="space-card p-3 flex items-center gap-3"
      style={{ opacity: 0.85 }}
    >
      <div className="text-3xl" style={{ filter: 'grayscale(0.7) blur(0.5px)', opacity: 0.6 }}>
        {item.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">??? · 神秘奖励</div>
        <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
          {describeCondition(cond)} 解锁 · {progress.progress}/{progress.target}
        </div>
        <div className="mt-1.5">
          <ProgressBar
            current={progress.progress}
            target={progress.target}
            tone={tone}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
