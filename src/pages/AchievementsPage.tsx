// 成就馆 - 展示所有显式和已解锁的隐藏成就
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '../db';
import {
  ACHIEVEMENTS, visibleAchievementsList, hiddenAchievementsList, unlockedIds,
} from '../lib/achievements';

export function AchievementsPage() {
  const nav = useNavigate();
  const badges = useLiveQuery(() => db.badges.toArray());
  const unlocked = unlockedIds(badges ?? []);

  const visible = visibleAchievementsList();
  const hidden = hiddenAchievementsList();
  const hiddenUnlocked = hidden.filter(h => unlocked.has(h.id));
  const hiddenRemaining = hidden.length - hiddenUnlocked.length;

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(-1)} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">🏆 成就馆</div>
      </div>

      <div className="space-card p-4 mb-4 text-center">
        <div className="text-sm text-white/60">已解锁</div>
        <div className="text-3xl font-bold glow-text">
          {unlocked.size} / {ACHIEVEMENTS.length}
        </div>
        <div className="text-xs text-white/40 mt-1">
          显式 {visible.filter(v => unlocked.has(v.id)).length}/{visible.length} · 隐藏 {hiddenUnlocked.length}/{hidden.length}
        </div>
      </div>

      <div className="text-sm text-white/70 mb-2">⭐ 显式成就（路标）</div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {visible.map(a => {
          const got = unlocked.has(a.id);
          return (
            <motion.div key={a.id}
              whileTap={{ scale: 0.95 }}
              className={`space-card p-3 text-center ${got ? 'ring-2 ring-amber-300/50' : 'opacity-50 grayscale'}`}
            >
              <div className="text-3xl">{a.emoji}</div>
              <div className={`text-sm font-bold mt-1 ${got ? 'text-amber-200' : ''}`}>{a.title}</div>
              <div className="text-[10px] text-white/50 mt-0.5">{a.description}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="text-sm text-white/70 mb-2">
        ❓ 隐藏成就 · {hiddenUnlocked.length} / {hidden.length} 已发现
        {hiddenRemaining > 0 && <span className="text-white/40 text-xs ml-1">（还有 {hiddenRemaining} 个等你探索）</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {hiddenUnlocked.map(a => (
          <div key={a.id} className="space-card p-3 text-center ring-2 ring-fuchsia-300/50">
            <div className="text-3xl">{a.emoji}</div>
            <div className="text-sm font-bold mt-1 text-fuchsia-200">{a.title}</div>
            <div className="text-[10px] text-white/50 mt-0.5">{a.description}</div>
          </div>
        ))}
        {Array.from({ length: hiddenRemaining }).map((_, i) => (
          <div key={`mystery-${i}`} className="space-card p-3 text-center opacity-30">
            <div className="text-3xl">❓</div>
            <div className="text-sm font-bold mt-1">？？？</div>
            <div className="text-[10px] text-white/40 mt-0.5">未发现</div>
          </div>
        ))}
      </div>
    </div>
  );
}
