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
import { detectUnlockedSkins, mergeUnlockedSkins, SKINS } from '../lib/skins';

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
    const tot = totalPoints(points);
    const snap = {
      tasks, evaluations: evals, schedules,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalPoints: tot,
      guardCards: streak.guardCards,
    };
    const known = unlockedIds(badges);
    for (const id of processedRef.current) known.add(id);
    const newly = detectNewlyUnlocked(snap, known);

    // 同时检测皮肤解锁
    (async () => {
      // skin
      const completedTaskCount = tasks.filter(t => t.status === 'done' || t.status === 'evaluated').length;
      const shopRedeems = points.filter(p => p.reason === 'shop_redeem').length;
      const skinSnap = {
        longestStreak: streak.longestStreak,
        totalTasksCompleted: completedTaskCount,
        totalPoints: tot,
        fiveStarWeeks: evals.filter(e => e.completion === 5 && e.quality === 5 && e.attitude === 5).length >= 3 ? 3 : 0,
        shopRedeemsCount: shopRedeems,
      };
      const detected = detectUnlockedSkins(skinSnap);
      const pet = await db.pet.get('singleton');
      if (pet) {
        const merged = mergeUnlockedSkins(pet.unlockedSkins, detected);
        if (merged.length > pet.unlockedSkins.length) {
          await db.pet.update('singleton', { unlockedSkins: merged });
          // 找到刚解锁的皮肤推到队列
          const newSkins = merged.filter(id => !pet.unlockedSkins.includes(id));
          for (const sid of newSkins) {
            const skin = SKINS.find(s => s.id === sid);
            if (skin) {
              queueRef.current.push({
                id: `skin_unlock_${sid}`,
                title: `🎨 解锁皮肤：${skin.name}`,
                description: skin.desc,
                emoji: '🥚',
                type: 'visible',
                check: () => true,
              });
            }
          }
        }
      }

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
            className="space-card p-6 max-w-sm w-full text-center ring-2"
            style={{
              background: 'linear-gradient(135deg, var(--state-warn-soft), var(--accent-soft))',
              boxShadow: '0 0 0 2px var(--state-warn)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ y: [0, -8, 0], rotate: [-3, 3, -3] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-7xl mb-2"
            >{popup.emoji}</motion.div>
            <div className="text-xs mb-1" style={{ color: 'var(--state-warn)' }}>解锁新成就</div>
            <div className="text-2xl font-black drop-shadow" style={{ color: 'var(--ink-strong)' }}>{popup.title}</div>
            <div className="text-sm mt-2" style={{ color: 'var(--ink-muted)' }}>{popup.description}</div>
            <button onClick={() => setPopup(null)} className="space-btn w-full mt-4">太棒了 🎉</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
