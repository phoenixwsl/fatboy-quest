// ============================================================
// 奖杯浮层 — 书房内展示已解锁成就
// 网格 3-4 列 · 可滚动 · 最新在上 · 点击展开详情
// ADHD 友好：信息按需加载 + 温柔空状态 + 不离开书房
// ============================================================

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { db } from '../../db';
import { ACHIEVEMENTS, type Achievement } from '../../lib/achievements';

interface TrophyOverlayProps {
  open: boolean;
  onClose: () => void;
}

interface TrophyItem {
  id: string;
  unlockedAt: number;
  title: string;
  description: string;
  emoji: string;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TrophyOverlay({ open, onClose }: TrophyOverlayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const badges = useLiveQuery(() => db.badges.toArray(), []);

  // Merge badges with achievement definitions, sort newest first
  const trophies: TrophyItem[] = (badges ?? [])
    .map(b => {
      const def: Achievement | undefined = ACHIEVEMENTS.find(a => a.id === b.id);
      if (!def) return null;
      return {
        id: b.id,
        unlockedAt: b.unlockedAt,
        title: def.title,
        description: def.description,
        emoji: def.emoji,
      };
    })
    .filter((t): t is TrophyItem => t !== null)
    .sort((a, b) => b.unlockedAt - a.unlockedAt);

  const handleCardClick = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="trophy-overlay-backdrop"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="trophy-overlay-panel"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="trophy-overlay-header">
              <h2 className="trophy-overlay-title">🏆 我的成就</h2>
              <span className="trophy-overlay-count">
                {trophies.length} 个
              </span>
              <button
                className="trophy-overlay-close"
                onClick={onClose}
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="trophy-overlay-scroll">
              {trophies.length === 0 ? (
                <div className="trophy-overlay-empty">
                  <div className="trophy-empty-star">🌟</div>
                  <div className="trophy-empty-text">
                    继续加油，第一个奖杯在等你！
                  </div>
                </div>
              ) : (
                <div className="trophy-grid">
                  {trophies.map(t => {
                    const isExpanded = expandedId === t.id;
                    return (
                      <motion.div
                        key={t.id}
                        layout
                        className={`trophy-card ${isExpanded ? 'trophy-card--expanded' : ''}`}
                        onClick={() => handleCardClick(t.id)}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      >
                        <motion.div layout="position" className="trophy-card-emoji">
                          {t.emoji}
                        </motion.div>
                        <motion.div layout="position" className="trophy-card-title">
                          {t.title}
                        </motion.div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="trophy-card-detail"
                            >
                              <div className="trophy-card-desc">{t.description}</div>
                              <div className="trophy-card-date">{formatDate(t.unlockedAt)} 获得</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
