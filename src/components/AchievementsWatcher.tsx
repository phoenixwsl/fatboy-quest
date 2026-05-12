// 成就检测器 - 监听 DB 变化，发现新成就立即解锁 + 弹窗
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  detectNewlyUnlocked, unlockedIds, type Achievement,
} from '../lib/achievements';
import { totalPoints } from '../lib/points';
import { sounds } from '../lib/sounds';

export function AchievementsWatcher() {
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const evals = useLiveQuery(() => db.evaluations.toArray());
  const schedules = useLiveQuery(() => db.schedules.toArray());
  const badges = useLiveQuery(() => db.badges.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const points = useLiveQuery(() => db.points.toArray());
  const [popup, setPopup] = useState<Achievement | null>(null);
  const queueRef = useRef<Achievement[]>([]);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tasks || !evals || !schedules || !badges || !streak || !points) return;
    const snap = {
      tasks, evaluations: evals, schedules,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalPoints: totalPoints(points),
      guardCards: streak.guardCards,
    };
    const known = unlockedIds(badges);
    // 也过滤已经在本次会话队列处理过的，防止 race
    for (const id of processedRef.current) known.add(id);
    const newly = detectNewlyUnlocked(snap, known);
    if (newly.length === 0) return;
    (async () => {
      for (const a of newly) {
        if (processedRef.current.has(a.id)) continue;
        processedRef.current.add(a.id);
        await db.badges.put({ id: a.id, unlockedAt: Date.now() });
        queueRef.current.push(a);
      }
      if (!popup && queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        setPopup(next);
        sounds.play('unlock');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks?.length, evals?.length, schedules?.length, streak?.currentStreak, points?.length]);

  // 一个 popup 关闭后展示队列里的下一个
  useEffect(() => {
    if (popup) return;
    if (queueRef.current.length > 0) {
      const t = setTimeout(() => {
        const next = queueRef.current.shift()!;
        setPopup(next);
        sounds.play('unlock');
      }, 600);
      return () => clearTimeout(t);
    }
  }, [popup]);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setPopup(null)}
        >
          <motion.div
            initial={{ scale: 0.3, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.3, opacity: 0 }}
            className="space-card p-6 max-w-sm w-full text-center bg-gradient-to-br from-amber-500/30 to-fuchsia-500/30 ring-2 ring-amber-300/60"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-7xl mb-2"
            >{popup.emoji}</motion.div>
            <div className="text-xs text-amber-200/80 mb-1">解锁新成就</div>
            <div className="text-2xl font-black text-white drop-shadow">{popup.title}</div>
            <div className="text-sm text-white/70 mt-2">{popup.description}</div>
            <button onClick={() => setPopup(null)} className="space-btn w-full mt-4">太棒了 🎉</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
