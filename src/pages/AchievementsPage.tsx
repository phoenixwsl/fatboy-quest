// 成就馆 - 展示所有显式和已解锁的隐藏成就
// R5.3.0: 加"温柔时刻 / 卡牌柜"入口 + R5.2.0 里程碑分区
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '../db';
import {
  ACHIEVEMENTS, visibleAchievementsList, hiddenAchievementsList, unlockedIds,
} from '../lib/achievements';
import { BADGE_CATALOG } from '../lib/badges';

export function AchievementsPage() {
  const nav = useNavigate();
  const badges = useLiveQuery(() => db.badges.toArray());
  const stickerCount = useLiveQuery(() => db.witnessMoments.count()) ?? 0;
  const cardsCount = useLiveQuery(() => db.cards.count()) ?? 0;
  const unlocked = unlockedIds(badges ?? []);
  const unlockedBadgeIds = new Set((badges ?? []).map(b => b.id));

  const visible = visibleAchievementsList();
  const hidden = hiddenAchievementsList();
  const hiddenUnlocked = hidden.filter(h => unlocked.has(h.id));
  const hiddenRemaining = hidden.length - hiddenUnlocked.length;

  // R5.2.0 里程碑（和老 achievements 并列）
  const r5Badges = Object.entries(BADGE_CATALOG);
  const r5UnlockedCount = r5Badges.filter(([id]) => unlockedBadgeIds.has(id)).length;

  return (
    <div className="min-h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(-1)} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">🏆 成就馆</div>
      </div>

      {/* R5.3.0: 温柔时刻 + 卡牌柜 入口 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => nav('/stickers')}
          className="space-card p-3 text-left active:scale-[0.98] transition-transform"
          style={{ borderLeft: '3px solid var(--accent)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">💛</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">温柔时刻</div>
              <div className="text-[10px] text-num" style={{ color: 'var(--ink-faint)' }}>{stickerCount} 个</div>
            </div>
          </div>
        </button>
        <button
          onClick={() => nav('/collection')}
          className="space-card p-3 text-left active:scale-[0.98] transition-transform"
          style={{ borderLeft: '3px solid var(--primary)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🃏</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">卡牌收藏</div>
              <div className="text-[10px] text-num" style={{ color: 'var(--ink-faint)' }}>{cardsCount} 张</div>
            </div>
          </div>
        </button>
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

      {/* R5.2.0: 里程碑（first-* / streak-* / level-up-*） */}
      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>
        🏅 里程碑 · {r5UnlockedCount} / {r5Badges.length}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {r5Badges.map(([id, spec]) => {
          const got = unlockedBadgeIds.has(id);
          return (
            <div
              key={id}
              className={`space-card p-3 text-center ${got ? '' : 'opacity-50 grayscale'}`}
              style={got ? { boxShadow: '0 0 0 2px var(--state-warn)' } : undefined}
            >
              <div className="text-3xl">{got ? spec.emoji : '?'}</div>
              <div className="text-sm font-bold mt-1" style={got ? { color: 'var(--state-warn)' } : undefined}>
                {got ? spec.name : '???'}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-faint)' }}>{spec.description}</div>
              {got && spec.rewardTitle && (
                <div className="text-[10px] mt-1 px-1.5 py-0.5 rounded inline-block" style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
                  解锁称号「{spec.rewardTitle}」
                </div>
              )}
            </div>
          );
        })}
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
