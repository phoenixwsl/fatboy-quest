// 硬提醒：屏幕中央闪一个大字 3 秒
// 修复（R1.3）：把 onDismiss 移出 useEffect deps，避免父组件每秒重渲染导致
// setTimeout 反复重建、永远到不了 3 秒，弹窗永不消失。
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Props {
  message: string;
  show: boolean;
  onDismiss?: () => void;
  durationMs?: number;
}

export function HardWarning({ message, show, onDismiss, durationMs = 3000 }: Props) {
  const [visible, setVisible] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!show) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDismissRef.current?.();
    }, durationMs);
    return () => clearTimeout(t);
    // 故意只依赖 show / durationMs，不依赖 onDismiss（用 ref）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, durationMs]);

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
