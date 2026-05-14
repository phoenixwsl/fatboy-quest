// ============================================================
// 全局自定义确认弹窗 — 替代原生 window.confirm
// 比原生 confirm 大得多、配色明显、动画、emoji 图标，孩子端用得着。
// 用法：const ok = await confirmModal({ title, body?, tone?, emoji? });
// ============================================================
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useAppStore, type ConfirmTone } from '../store/useAppStore';

// R3.4.1: TONE_STYLES 原有 ring/confirmBtn/titleColor 是死代码（JSX 已用 inline style 接 token），
// 简化为只保留 defaultEmoji
const TONE_EMOJI: Record<ConfirmTone, string> = {
  info:   'ℹ️',
  warn:   '⚠️',
  danger: '🗑',
  help:   '🙋',
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
          {/* R3.0 §11: 弹窗主体 — 改成白底 paper */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="relative z-10 w-full max-w-sm rounded-[var(--radius-xl)] p-6"
            style={{
              background: 'var(--paper)',
              boxShadow: 'var(--shadow-lg)',
              border: `2px solid ${(() => {
                const tone = confirm.tone ?? 'info';
                if (tone === 'danger') return 'var(--danger)';
                if (tone === 'warn')   return 'var(--fatboy-500)';
                if (tone === 'help')   return 'var(--danger)';
                return 'var(--sky-300)';
              })()}`,
            }}
          >
            {/* Emoji 大图标 */}
            <div className="text-6xl text-center mb-2 leading-none">
              {confirm.emoji ?? TONE_EMOJI[confirm.tone ?? 'info']}
            </div>
            {/* 标题 */}
            <div
              id="confirm-title"
              className="text-xl font-bold text-center mb-2"
              style={{
                color: (() => {
                  const tone = confirm.tone ?? 'info';
                  if (tone === 'danger') return 'var(--danger)';
                  if (tone === 'warn')   return 'var(--fatboy-700)';
                  if (tone === 'help')   return 'var(--danger)';
                  return 'var(--sky-700)';
                })(),
              }}
            >
              {confirm.title}
            </div>
            {/* 详情 */}
            {confirm.body && (
              <div
                className="text-sm text-center leading-relaxed mb-5 whitespace-pre-line"
                style={{ color: 'var(--ink-muted)' }}
              >
                {confirm.body}
              </div>
            )}
            {/* 按钮 */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => resolve(false)}
                className="secondary-btn flex-1"
                style={{ height: 56, padding: 0 }}
              >
                {confirm.cancelLabel ?? '取消'}
              </button>
              {(() => {
                const tone = confirm.tone ?? 'info';
                const isDanger = tone === 'danger' || tone === 'help';
                if (isDanger) {
                  return (
                    <button
                      onClick={() => resolve(true)}
                      autoFocus
                      className="danger-btn flex-1"
                      style={{ height: 56, padding: 0 }}
                    >
                      {confirm.confirmLabel ?? '确定'}
                    </button>
                  );
                }
                return (
                  <button
                    onClick={() => resolve(true)}
                    autoFocus
                    className="primary-btn flex-1"
                    style={{ height: 56 }}
                  >
                    <span className="primary-btn-bottom" aria-hidden />
                    <span
                      className="primary-btn-top"
                      style={{ height: 56, justifyContent: 'center', width: '100%', padding: 0 }}
                    >
                      {confirm.confirmLabel ?? '确定'}
                    </span>
                  </button>
                );
              })()}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
