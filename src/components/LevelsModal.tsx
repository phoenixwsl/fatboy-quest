// ============================================================
// R5.3.0: 段位详情弹窗
//
// 触发：HomePage 点击双货币卡的"Lv X 称号"区域
// 显示：6 级全部 + 当前高亮 + 下一级进度条 + 已解锁 unlock chip
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { LEVELS, type Level, getLevelFromLifetime, getNextLevel } from '../lib/levels';
import { ProgressBar } from './ProgressBar';

interface Props {
  open: boolean;
  lifetimePoints: number;
  onClose: () => void;
}

export function LevelsModal({ open, lifetimePoints, onClose }: Props) {
  const current = getLevelFromLifetime(lifetimePoints);
  const next = getNextLevel(lifetimePoints);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="space-card w-full max-w-md p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ borderRadius: 'var(--radius-lg)' }}
          >
            <div className="flex items-center mb-4">
              <div>
                <div className="text-lg font-bold">🏆 段位</div>
                <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                  当前 <b className="text-num" style={{ color: 'var(--accent-strong)' }}>{lifetimePoints}</b> 终身积分
                </div>
              </div>
              <button onClick={onClose} className="ml-auto text-xl" style={{ color: 'var(--ink-faint)' }}>×</button>
            </div>

            {/* 下一级进度 */}
            {next && (
              <div className="mb-4 p-3 rounded" style={{ background: 'var(--surface-mist)' }}>
                <div className="text-xs mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  距离 <b style={{ color: 'var(--primary-strong)' }}>Lv. {next.level} {next.title}</b> 还差 {next.threshold - lifetimePoints} 分
                </div>
                <ProgressBar
                  current={lifetimePoints - current.threshold}
                  target={next.threshold - current.threshold}
                  tone="points"
                  size="md"
                />
              </div>
            )}

            {/* 6 级列表 */}
            <div className="space-y-2">
              {LEVELS.map(lv => (
                <LevelRow key={lv.level} level={lv} isCurrent={lv.level === current.level} unlocked={lifetimePoints >= lv.threshold} />
              ))}
            </div>

            <button onClick={onClose} className="space-btn w-full mt-4">关闭</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
function LevelRow({ level, isCurrent, unlocked }: { level: Level; isCurrent: boolean; unlocked: boolean }) {
  return (
    <div
      className={`p-3 rounded-md flex items-center gap-3 ${unlocked ? '' : 'opacity-50'}`}
      style={{
        background: isCurrent ? 'var(--accent-soft)' : 'var(--surface-paper)',
        border: isCurrent ? '2px solid var(--accent)' : '1px solid var(--surface-fog)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
        style={{
          background: unlocked ? 'var(--primary-soft)' : 'var(--surface-mist)',
          color: unlocked ? 'var(--primary-strong)' : 'var(--ink-faint)',
        }}
      >
        Lv {level.level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium" style={{ color: unlocked ? 'var(--ink-strong)' : 'var(--ink-muted)' }}>
          {unlocked ? level.title : '???'}
        </div>
        <div className="text-[11px] mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--ink-faint)' }}>
          <span className="text-num">{level.threshold}</span>
          <span>分起</span>
          {unlocked && (
            <>
              {level.unlock.skin     && <UnlockChip emoji="🎭" text="皮肤" />}
              {level.unlock.theme    && <UnlockChip emoji="🎨" text="主题" />}
              {level.unlock.trophy   && <UnlockChip emoji="🏆" text="奖杯" />}
              {level.unlock.mysteryCard && <UnlockChip emoji="🎁" text={`神秘券 ×${level.unlock.mysteryCard}`} />}
              {level.unlock.customTitle && <UnlockChip emoji="✨" text="自定称号" />}
            </>
          )}
        </div>
      </div>
      {isCurrent && (
        <div className="text-xs px-2 py-0.5 rounded font-bold shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
          当前
        </div>
      )}
    </div>
  );
}

function UnlockChip({ emoji, text }: { emoji: string; text: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-mist)' }}>
      {emoji} {text}
    </span>
  );
}
