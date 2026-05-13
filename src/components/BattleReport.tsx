// 今日战报动画 - 一轮完成时展示
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { PetAvatar } from './PetAvatar';
import { formatDuration } from '../lib/time';

interface Props {
  show: boolean;
  petSkinId?: string;
  killCount: number;
  totalMinutes: number;
  comboPeak: number;
  bestFastTitle?: string;     // 最快一项的标题
  currentStreakDays: number;
  onClose: () => void;
}

export function BattleReport({
  show, petSkinId, killCount, totalMinutes, comboPeak, bestFastTitle, currentStreakDays, onClose,
}: Props) {
  // 飘金币粒子
  const coins = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    id: i, x: Math.random() * 100, delay: Math.random() * 0.8, dur: 1.5 + Math.random() * 1.5,
  })), [show]);

  // 自动关闭兜底 8 秒
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onClose(), 8000);
    return () => clearTimeout(t);
  }, [show, onClose]);

  const comboTag = comboPeak >= 5 ? '🌟 完美通关' : comboPeak >= 3 ? `⚡ ${comboPeak} 连击` : '';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          style={{ background: 'radial-gradient(circle, rgba(40,30,80,0.95), rgba(5,8,24,0.98))' }}
        >
          {/* 金币雨 */}
          {coins.map(c => (
            <motion.div key={c.id}
              initial={{ y: '-10vh', x: `${c.x}vw`, opacity: 0 }}
              animate={{ y: '110vh', opacity: [0, 1, 1, 0], rotate: 720 }}
              transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, repeatDelay: 1 }}
              className="absolute text-3xl pointer-events-none"
            >🪙</motion.div>
          ))}

          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="relative z-10 max-w-md w-full"
          >
            <div className="text-center mb-4">
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [-5, 5, -5] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="inline-block"
              >
                <PetAvatar skinId={petSkinId} size={140} state="celebrate" bobbing={false} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-2 text-4xl font-black bg-gradient-to-r from-amber-300 to-rose-300 bg-clip-text text-transparent drop-shadow-2xl"
              >
                今 日 通 关 ！
              </motion.div>
              {comboTag && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="inline-block mt-2 px-4 py-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-sm"
                >
                  {comboTag}
                </motion.div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-card p-5 space-y-3"
            >
              <Row icon="💥" label="击败小怪" value={`${killCount} 只`} />
              <Row icon="⏱" label="本轮用时" value={formatDuration(totalMinutes)} />
              {comboPeak >= 2 && <Row icon="⚡" label="最高连击" value={`${comboPeak} 连击`} />}
              {bestFastTitle && <Row icon="🚀" label="最快一项" value={bestFastTitle} />}
              <Row icon="🔥" label="当前连击" value={`${currentStreakDays} 天`} />
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
              onClick={onClose}
              className="space-btn w-full mt-4 text-lg"
            >
              继续闯关 ✨
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 text-white/70">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}
