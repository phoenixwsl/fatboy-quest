// ============================================================
// R4.3.0: 等级升级仪式弹窗
//
// 触发：等级跨过下一阈值（lifetime points 越过 LEVELS thresh）
//   通过 LevelUpWatcher 组件检测，比对 localStorage 'fatboy:lastShownLevel'
//
// 仪式：全屏遮罩 + 称号大字 + 解锁奖励列表 + "继续闯关"按钮
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import type { Level } from '../lib/levels';
import { sounds } from '../lib/sounds';
import { useEffect } from 'react';

interface Props {
  newLevel: Level | null;
  onClose: () => void;
}

export function LevelUpModal({ newLevel, onClose }: Props) {
  useEffect(() => {
    if (newLevel) {
      sounds.play('fanfare');
    }
  }, [newLevel?.level]);

  return (
    <AnimatePresence>
      {newLevel && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.6, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="space-card p-6 w-full max-w-md text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 12, delay: 0.1 }}
              className="text-7xl mb-2"
            >
              🏆
            </motion.div>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>
              升级了
            </div>
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: 'var(--accent-strong)' }}
            >
              Lv. {newLevel.level}
            </div>
            <div
              className="text-xl font-bold mb-4 glow-text"
              style={{ color: 'var(--primary-strong)' }}
            >
              「{newLevel.title}」
            </div>

            {/* 解锁清单 */}
            <div
              className="text-sm mb-5 p-3 text-left space-y-1"
              style={{
                background: 'var(--surface-mist)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--ink-strong)',
              }}
            >
              <div className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>🎁 你解锁了：</div>
              {newLevel.unlock.skin && <div>• 新蛋仔皮肤：{newLevel.unlock.skin}</div>}
              {newLevel.unlock.theme && <div>• 新主题：{newLevel.unlock.theme}</div>}
              {newLevel.unlock.trophy && <div>• 自定义奖杯（{newLevel.unlock.trophy}）</div>}
              {newLevel.unlock.mysteryCard && <div>• 神秘券 × {newLevel.unlock.mysteryCard}</div>}
              {newLevel.unlock.customTitle && <div>• 自定义称号权限</div>}
              {!hasAnyUnlock(newLevel) && <div>• 一份继续闯关的勇气</div>}
            </div>

            <button
              onClick={onClose}
              className="primary-btn"
            >
              <span className="primary-btn-bottom" aria-hidden />
              <span className="primary-btn-top">继续闯关 →</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function hasAnyUnlock(lv: Level): boolean {
  const u = lv.unlock;
  return !!(u.skin || u.theme || u.trophy || u.mysteryCard || u.customTitle);
}
