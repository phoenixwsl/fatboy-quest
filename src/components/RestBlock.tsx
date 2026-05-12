// 休息倒计时组件
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sounds } from '../lib/sounds';

interface Props {
  durationMinutes: number;
  startedAt: number;            // 这个休息块的起始时间戳
  leadInSec?: number;           // 最后多少秒开始滴答（默认 60）
  onComplete?: () => void;
  onSkip?: () => void;
}

export function RestBlock({ durationMinutes, startedAt, leadInSec = 60, onComplete, onSkip }: Props) {
  const totalSec = durationMinutes * 60;
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, totalSec - elapsed);
  });
  const lastTickedRef = useRef<number>(-1);
  const completedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const rem = Math.max(0, totalSec - elapsed);
      setRemaining(rem);

      // 进入 leadIn 后每 5 秒滴答一下，最后 5 秒每秒
      if (rem <= leadInSec && rem > 5) {
        if (lastTickedRef.current !== rem && rem % 5 === 0) {
          lastTickedRef.current = rem;
          sounds.play('tap');
        }
      } else if (rem > 0 && rem <= 5) {
        if (lastTickedRef.current !== rem) {
          lastTickedRef.current = rem;
          sounds.play('tap');
        }
      }

      if (rem === 0 && !completedRef.current) {
        completedRef.current = true;
        sounds.play('unlock');
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [startedAt, totalSec, leadInSec, onComplete]);

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const pct = totalSec > 0 ? (1 - remaining / totalSec) * 100 : 100;
  const urgent = remaining <= leadInSec;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`space-card p-6 text-center ${urgent ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="text-5xl mb-2">☕</div>
      <div className="text-lg text-white/70 mb-1">休息中</div>
      <div className={`text-7xl font-black my-3 tabular-nums ${urgent ? 'text-amber-300 animate-pulse' : 'text-white'}`}>
        {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
      </div>
      <div className="text-sm text-white/50 mb-4">
        {urgent ? '休息快结束啦' : '放松眼睛 · 喝口水'}
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyan-400 to-cyan-200"
          animate={{ width: `${pct}%` }}
        />
      </div>
      <button onClick={onSkip} className="space-btn-ghost text-sm mt-4">
        ▶ 跳过休息，开始下一项
      </button>
    </motion.div>
  );
}
