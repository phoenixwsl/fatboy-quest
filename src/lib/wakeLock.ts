// ============================================================
// R3.3: Wake Lock — 任务执行中保持屏幕长亮
// 用 Screen Wake Lock API（iOS Safari 16.4+ / 大多数现代浏览器支持）
// 退化策略：浏览器不支持 → 静默忽略（不报错）
// ============================================================
import { useEffect, useRef } from 'react';

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

/**
 * 当 active=true 时申请屏幕常亮；active=false 或卸载时释放
 * 自动处理：tab 切到后台 → 系统释放；切回 → 重新申请
 */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;   // 不支持，静默

    let cancelled = false;

    async function acquire() {
      if (!active || cancelled) return;
      try {
        const lock = await nav.wakeLock!.request('screen');
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        sentinelRef.current = lock;
        lock.addEventListener('release', () => {
          sentinelRef.current = null;
        });
      } catch {
        // 用户没交互 / 电量低 → 静默
      }
    }

    function onVisibility() {
      // 切回前台 → 重新申请（系统在后台时会自动释放）
      if (document.visibilityState === 'visible' && active && !sentinelRef.current) {
        acquire();
      }
    }

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const cur = sentinelRef.current;
      sentinelRef.current = null;
      if (cur && !cur.released) {
        cur.release().catch(() => {});
      }
    };
  }, [active]);
}
