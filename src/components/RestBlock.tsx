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
      className="p-6 text-center rounded-[var(--radius-lg)]"
      style={{
        // R3.0.3: 跟 TaskActiveCard 一致：暖蓝渐变 + 描边
        background: ended
          ? 'linear-gradient(180deg, #E8FBF1, #C9F2DD)'
          : 'linear-gradient(180deg, #E8F5FB, #C8E0EF)',
        boxShadow: 'var(--shadow-md)',
        border: `3px solid ${ended ? 'var(--success)' : 'var(--sky-500)'}`,
        ...(ended ? { animation: 'fb-bouncing 2s ease-in-out infinite' } : {}),
      }}
    >
      <div className="text-5xl mb-2">{ended ? '🔔' : '☕'}</div>
      <div className="text-base font-medium mb-1" style={{ color: 'var(--ink)' }}>
        {ended ? '休息结束啦！' : '休息中'}
      </div>
      {/* 倒计时大字 — 跟 TaskActiveCard 一致 */}
      <div
        className="my-3 mx-auto inline-block px-6 py-3 rounded-[var(--radius-lg)]"
        style={{
          background: ended
            ? 'var(--success)'
            : urgent
            ? 'var(--fatboy-500)'
            : 'var(--sky-700)',
          boxShadow: 'var(--shadow-md)',
          ...(urgent && !ended ? { animation: 'fb-shake 0.45s ease-in-out infinite' } : {}),
        }}
      >
        <div
          className="text-num font-bold leading-none"
          style={{
            color: '#fff',
            fontSize: 72,
            letterSpacing: '0.01em',
            textShadow: '0 2px 8px rgba(0,0,0,0.25)',
          }}
        >
          {ended ? '🎉' : `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`}
        </div>
      </div>
      <div className="text-sm mb-4" style={{ color: 'var(--ink-muted)' }}>
        {ended
          ? `准备好开始下一项 ${ringCount > 0 ? `(响铃 ${ringCount}/${MAX_RING_REPEATS})` : ''}`
          : urgent ? '休息快结束啦' : '放松眼睛 · 喝口水'}
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.5)' }}
      >
        <motion.div
          className="h-full"
          style={{
            background: ended
              ? 'linear-gradient(90deg, var(--success), #A0E6A0)'
              : 'linear-gradient(90deg, var(--sky-500), var(--sky-300))',
          }}
          animate={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-center mt-4">
        <button onClick={handleEndRest} className="primary-btn">
          <span className="primary-btn-bottom" aria-hidden />
          <span className="primary-btn-top" style={{ fontSize: 16 }}>
            {ended ? '🚀 开始下一项' : '▶ 跳过休息'}
          </span>
        </button>
      </div>
    </motion.div>
  );
}
