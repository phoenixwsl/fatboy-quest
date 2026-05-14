// ============================================================
// 书房柜子浮层 — 展示已解锁奖杯 / LEGO / 玩具收藏
//
// R3.5: 扩展 type prop，支持 'trophy' | 'lego' | 'toy'
//       - trophy: 真实读 db.badges，展示成就网格
//       - lego / toy: 暂未开放收藏，直接走空状态文案
// ============================================================

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { db } from '../../db';
import { ACHIEVEMENTS, type Achievement } from '../../lib/achievements';

export type OverlayType = 'trophy' | 'lego' | 'toy';

interface TrophyOverlayProps {
  open: boolean;
  type: OverlayType;
  onClose: () => void;
}

interface TrophyItem {
  id: string;
  unlockedAt: number;
  title: string;
  description: string;
  emoji: string;
}

const COPY: Record<OverlayType, { title: string; emptyEmoji: string; emptyText: string }> = {
  trophy: { title: '🏆 我的成就', emptyEmoji: '🌟', emptyText: '继续加油，第一个奖杯在等你！' },
  lego:   { title: '🧱 我的 LEGO', emptyEmoji: '🧱', emptyText: '还没有 LEGO 收藏，攒积分去商店换吧' },
  toy:    { title: '🧸 我的玩具', emptyEmoji: '🧸', emptyText: '还没有玩具收藏，攒积分去商店换吧' },
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function TrophyOverlay({ open, type, onClose }: TrophyOverlayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 只有 trophy 类型才读真实 badges；lego / toy 暂时不接 DB
  const badges = useLiveQuery(
    async () => (type === 'trophy' ? await db.badges.toArray() : []),
    [type, open],
  );

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

  const copy = COPY[type];
  const showEmpty = type !== 'trophy' || trophies.length === 0;

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
              <h2 className="trophy-overlay-title">{copy.title}</h2>
              {type === 'trophy' && (
                <span className="trophy-overlay-count">
                  {trophies.length} 个
                </span>
              )}
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
              {showEmpty ? (
                <div className="trophy-overlay-empty">
                  <div className="trophy-empty-star">{copy.emptyEmoji}</div>
                  <div className="trophy-empty-text">
                    {copy.emptyText}
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
