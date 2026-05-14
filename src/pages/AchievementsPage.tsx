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
    <div className="min-h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(-1)} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">🏆 成就馆</div>
      </div>

      <div className="space-card p-4 mb-4 text-center">
        <div className="text-sm" style={{ color: 'var(--ink-faint)' }}>已解锁</div>
        <div className="text-3xl font-bold glow-text">
          {unlocked.size} / {ACHIEVEMENTS.length}
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
          显式 {visible.filter(v => unlocked.has(v.id)).length}/{visible.length} · 隐藏 {hiddenUnlocked.length}/{hidden.length}
        </div>
      </div>

      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>⭐ 显式成就（路标）</div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {visible.map(a => {
          const got = unlocked.has(a.id);
          return (
            <motion.div
              key={a.id}
              whileTap={{ scale: 0.95 }}
              className={`space-card p-3 text-center ${got ? 'ring-2' : 'opacity-50 grayscale'}`}
              style={got ? { boxShadow: '0 0 0 2px var(--state-warn)' } : undefined}
            >
              <div className="text-3xl">{a.emoji}</div>
              <div className="text-sm font-bold mt-1" style={got ? { color: 'var(--state-warn)' } : undefined}>{a.title}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{a.description}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>
        ❓ 隐藏成就 · {hiddenUnlocked.length} / {hidden.length} 已发现
        {hiddenRemaining > 0 && <span className="text-xs ml-1" style={{ color: 'var(--ink-faint)' }}>（还有 {hiddenRemaining} 个等你探索）</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {hiddenUnlocked.map(a => (
          <div
            key={a.id}
            className="space-card p-3 text-center ring-2"
            style={{ boxShadow: '0 0 0 2px var(--accent)' }}
          >
            <div className="text-3xl">{a.emoji}</div>
            <div className="text-sm font-bold mt-1" style={{ color: 'var(--accent)' }}>{a.title}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{a.description}</div>
          </div>
        ))}
        {Array.from({ length: hiddenRemaining }).map((_, i) => (
          <div key={`mystery-${i}`} className="space-card p-3 text-center opacity-30">
            <div className="text-3xl">❓</div>
            <div className="text-sm font-bold mt-1">？？？</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>未发现</div>
          </div>
        ))}
      </div>
    </div>
  );
}
