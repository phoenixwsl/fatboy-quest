// 休息倒计时
// 修复（R1.2.1）：useEffect deps 含 onComplete 导致 setInterval 反复重建。改用 ref。
// 新增（R1.3）：休息结束后持续响铃（每 2 秒），直到孩子点"结束休息"。最多 30 次自停。
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { sounds } from '../lib/sounds';

interface Props {
  durationMinutes: number;
  startedAt: number;
  leadInSec?: number;
  onComplete?: () => void;
  onSkip?: () => void;
}

const MAX_RING_REPEATS = 30;
const RING_INTERVAL_MS = 2000;

export function RestBlock({ durationMinutes, startedAt, leadInSec = 60, onComplete, onSkip }: Props) {
  const totalSec = Math.max(1, durationMinutes * 60);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(0, totalSec - elapsed);
  });
  const [ringCount, setRingCount] = useState(0);
  const lastTickedRef = useRef<number>(-1);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    completedFiredRef.current = false;
    lastTickedRef.current = -1;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const rem = Math.max(0, totalSec - elapsed);
      setRemaining(rem);
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
      if (rem === 0 && !completedFiredRef.current) {
        completedFiredRef.current = true;
        sounds.play('unlock');
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, totalSec, leadInSec]);

  // 持续响铃：到 0 后每 2 秒响一下，直到 MAX_RING_REPEATS 或用户点结束
  useEffect(() => {
    if (remaining > 0) { setRingCount(0); return; }
    let count = 0;
    setRingCount(0);
    const ringId = setInterval(() => {
      count += 1;
      setRingCount(count);
      sounds.play('unlock');
      if (count >= MAX_RING_REPEATS) clearInterval(ringId);
    }, RING_INTERVAL_MS);
    return () => clearInterval(ringId);
  }, [remaining]);

  const handleEndRest = () => {
    onCompleteRef.current?.();
    onSkip?.();
  };

  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const pct = totalSec > 0 ? (1 - remaining / totalSec) * 100 : 100;
  const ended = remaining === 0;
  const urgent = !ended && remaining <= leadInSec;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`space-card p-6 text-center ${ended ? 'ring-4 ring-emerald-400 animate-pulse' : urgent ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="text-5xl mb-2">{ended ? '🔔' : '☕'}</div>
      <div className="text-lg text-white/70 mb-1">{ended ? '休息结束啦！' : '休息中'}</div>
      <div className={`text-7xl font-black my-3 tabular-nums ${
        ended ? 'text-emerald-300' :
        urgent ? 'text-amber-300 animate-pulse' : 'text-white'
      }`}>
        {ended
          ? '🎉'
          : `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`}
      </div>
      <div className="text-sm text-white/50 mb-4">
        {ended
          ? `准备好开始下一项 ${ringCount > 0 ? `(响铃 ${ringCount}/${MAX_RING_REPEATS})` : ''}`
          : urgent ? '休息快结束啦' : '放松眼睛 · 喝口水'}
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full ${ended ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-cyan-400 to-cyan-200'}`}
          animate={{ width: `${pct}%` }}
        />
      </div>
      <button onClick={handleEndRest} className={`w-full text-lg mt-4 ${ended ? 'space-btn animate-pulse-glow' : 'space-btn'}`}>
        {ended ? '🚀 开始下一项' : '▶ 跳过休息，开始下一项'}
      </button>
    </motion.div>
  );
}
