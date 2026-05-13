// ============================================================
// 全局自定义确认弹窗 — 替代原生 window.confirm
// 比原生 confirm 大得多、配色明显、动画、emoji 图标，孩子端用得着。
// 用法：const ok = await confirmModal({ title, body?, tone?, emoji? });
// ============================================================
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useAppStore, type ConfirmTone } from '../store/useAppStore';

const TONE_STYLES: Record<ConfirmTone, {
  ring: string; confirmBtn: string; titleColor: string; defaultEmoji: string;
}> = {
  info:   {
    ring: 'ring-2 ring-cyan-300/40',
    confirmBtn: 'bg-cyan-500 hover:bg-cyan-400 text-white',
    titleColor: 'text-cyan-100',
    defaultEmoji: 'ℹ️',
  },
  warn:   {
    ring: 'ring-2 ring-amber-300/60',
    confirmBtn: 'bg-amber-500 hover:bg-amber-400 text-white',
    titleColor: 'text-amber-100',
    defaultEmoji: '⚠️',
  },
  danger: {
    ring: 'ring-2 ring-rose-300/60',
    confirmBtn: 'bg-rose-500 hover:bg-rose-400 text-white',
    titleColor: 'text-rose-100',
    defaultEmoji: '🗑',
  },
  help:   {
    ring: 'ring-2 ring-pink-300/60',
    confirmBtn: 'bg-pink-500 hover:bg-pink-400 text-white',
    titleColor: 'text-pink-100',
    defaultEmoji: '🙋',
  },
};

export function ConfirmModal() {
  const confirm = useAppStore(s => s.confirm);
  const resolve = useAppStore(s => s.resolveConfirm);

  // ESC 取消
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') resolve(false);
      else if (e.key === 'Enter') resolve(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, resolve]);

  return (
    <AnimatePresence>
      {confirm && (
        <motion.div
          key={confirm.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          {/* 半透明黑色 backdrop + blur，点一下也是取消 */}
          <button
            aria-label="点空白处关闭"
            onClick={() => resolve(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
          />
          {/* 弹窗主体 */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className={`relative z-10 w-full max-w-sm bg-space-card border border-white/15 rounded-3xl p-6 shadow-2xl ${TONE_STYLES[confirm.tone ?? 'info'].ring}`}
          >
            {/* Emoji 大图标 */}
            <div className="text-6xl text-center mb-2 leading-none">
              {confirm.emoji ?? TONE_STYLES[confirm.tone ?? 'info'].defaultEmoji}
            </div>
            {/* 标题 */}
            <div
              id="confirm-title"
              className={`text-xl font-bold text-center mb-2 ${TONE_STYLES[confirm.tone ?? 'info'].titleColor}`}
            >
              {confirm.title}
            </div>
            {/* 详情 */}
            {confirm.body && (
              <div className="text-sm text-white/70 text-center leading-relaxed mb-5 whitespace-pre-line">
                {confirm.body}
              </div>
            )}
            {/* 按钮（大号，最少 56px 高，给孩子按） */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => resolve(false)}
                className="flex-1 h-14 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-base font-medium transition"
              >
                {confirm.cancelLabel ?? '取消'}
              </button>
              <button
                onClick={() => resolve(true)}
                className={`flex-1 h-14 rounded-2xl active:scale-95 text-base font-bold transition ${TONE_STYLES[confirm.tone ?? 'info'].confirmBtn}`}
                autoFocus
              >
                {confirm.confirmLabel ?? '确定'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
