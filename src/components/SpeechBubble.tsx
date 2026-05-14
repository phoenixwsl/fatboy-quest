// 蛋仔头顶气泡 - 用于轻量提示（"在想什么呢？" 等）
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  text: string | null;
  tone?: 'normal' | 'warn';
}

export function SpeechBubble({ text, tone = 'normal' }: Props) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.8 }}
          className="relative inline-block"
        >
          <div
            className="px-3 py-1.5 rounded-2xl text-sm font-medium shadow-lg ring-1"
            style={
              tone === 'warn'
                ? { background: 'var(--state-warn)', color: 'var(--ink-strong)', boxShadow: '0 0 0 1px var(--state-warn-strong)' }
                : { background: 'var(--surface-paper)', color: 'var(--ink-strong)', boxShadow: '0 0 0 1px var(--surface-fog)' }
            }
          >
            {text}
          </div>
          {/* 气泡小尾巴 */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-3 h-3 rotate-45"
            style={{ background: tone === 'warn' ? 'var(--state-warn)' : 'var(--surface-paper)' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
