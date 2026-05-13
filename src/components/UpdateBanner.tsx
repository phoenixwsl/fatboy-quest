// ============================================================
// R2.3.1: PWA 新版本检测 banner
// VitePWA 用 prompt 模式 → 检测到新 SW → 显示顶部 banner → 用户点 → 激活 + reload
// 解决 iPad PWA 强缓存导致用户卡在旧版本的问题（之前要"删 App + 重新添加到主屏"）
// ============================================================
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // 每 60s 主动检查一次（默认仅 navigation 时检查）
      if (r) {
        setInterval(() => { r.update().catch(() => {}); }, 60_000);
      }
    },
    onRegisterError() {},
  });

  // 防御：用户手动 dismiss 后下次启动还要再检测
  useEffect(() => { /* no-op */ }, [needRefresh]);

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-md mx-auto flex items-center gap-3">
        <div className="text-2xl">🚀</div>
        <div className="flex-1 text-sm">
          <div className="font-bold">有新版本</div>
          <div className="text-white/80 text-xs">点更新立即生效</div>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-4 py-2 rounded-xl bg-white text-emerald-700 font-bold text-sm active:scale-95"
        >
          更新
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-white/70 text-xs"
          aria-label="稍后再说"
        >
          稍后
        </button>
      </div>
    </div>
  );
}
