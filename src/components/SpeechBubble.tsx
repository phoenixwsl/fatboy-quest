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
          <div className={`px-3 py-1.5 rounded-2xl text-sm font-medium shadow-lg ${
            tone === 'warn'
              ? 'bg-amber-500/90 text-white ring-1 ring-amber-200'
              : 'bg-white/90 text-space-deep ring-1 ring-white/40'
          }`}>
            {text}
          </div>
          {/* 气泡小尾巴 */}
          <div className={`absolute left-1/2 -translate-x-1/2 -bottom-1 w-3 h-3 rotate-45 ${
            tone === 'warn' ? 'bg-amber-500/90' : 'bg-white/90'
          }`} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
