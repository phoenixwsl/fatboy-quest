// Idle nag - 5 分钟无操作时蛋仔催一下
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const AUTO_DISMISS_MS = 8000;

const MESSAGES = [
  '你在哪呀？快回来呀～',
  '蛋仔有点想你了 🥺',
  '小怪还等着你打呢',
  '走神了？深呼吸再来！',
  '咳咳，时间在跑哦',
];

interface Props {
  enabled?: boolean;
}

export function IdleNagBubble({ enabled = true }: Props) {
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;
    const reset = () => { lastActivityRef.current = Date.now(); };
    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];
    for (const e of events) window.addEventListener(e, reset, { passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, reset);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_THRESHOLD_MS && !show) {
        setMsg(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
        setShow(true);
      }
    }, 30_000);
    return () => clearInterval(id);
  }, [enabled, show]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setShow(false);
      lastActivityRef.current = Date.now();   // 提示完算一次"活动"
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setShow(false)}
          className="fixed bottom-24 right-4 z-30 max-w-xs"
        >
          <div className="space-card p-3 pr-4 bg-gradient-to-r from-amber-500/30 to-rose-500/30 ring-1 ring-amber-200/40 flex items-center gap-2">
            <div className="text-2xl">🥚</div>
            <div className="text-sm text-white">{msg}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
