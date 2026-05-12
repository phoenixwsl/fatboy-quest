// 3 分钟硬提醒：屏幕中央闪一个大字 3 秒
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  show: boolean;
  onDismiss?: () => void;
  durationMs?: number;
}

export function HardWarning({ message, show, onDismiss, durationMs = 3000 }: Props) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); onDismiss?.(); }, durationMs);
    return () => clearTimeout(t);
  }, [show, durationMs, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="px-10 py-6 rounded-3xl bg-gradient-to-br from-rose-500/90 to-orange-500/90 border-4 border-white/30 shadow-2xl">
            <div className="text-5xl font-black text-white text-center whitespace-nowrap drop-shadow-lg">
              {message}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
