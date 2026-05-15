// ============================================================
// R4.1.0: 通用进度条
//
// 双通路统一渲染：积分通路（许愿池）+ 条件通路（任务里程碑解锁）
// 心理学：
//   - Endowed Progress：起步红利可见标记（可选）
//   - Goal Gradient：最后 20% 视觉冲刺（颜色变金 + 跳动）
// ============================================================

interface Props {
  /** 当前累计 */
  current: number;
  /** 目标 */
  target: number;
  /** 标签（左上）：例如 "我想要 LEGO X"  /  "完成 5 个金任务" */
  label?: string;
  /** 描述（右上）：例如 "32% · 还差 N 分"  /  "3/5" */
  rightHint?: string;
  /** 起步红利（endowed progress 起步比例）— 在条左侧画一条小标记 */
  startBonus?: number;
  /** 主题色 */
  tone?: 'points' | 'bronze' | 'silver' | 'gold' | 'streak';
  size?: 'sm' | 'md' | 'lg';
}

const TONE_COLORS: Record<NonNullable<Props['tone']>, { fill: string; sprint: string; bg: string }> = {
  points: { fill: 'var(--primary)',     sprint: 'var(--state-warn)',  bg: 'var(--surface-mist)' },
  bronze: { fill: '#B87333',            sprint: '#FFD23F',            bg: '#F1DDC9' },
  silver: { fill: '#C0C0C0',            sprint: '#FFD23F',            bg: '#E8E8E8' },
  gold:   { fill: '#FFD23F',            sprint: '#FFA500',            bg: '#FFF1B8' },
  streak: { fill: 'var(--state-success)', sprint: 'var(--state-warn)', bg: 'var(--surface-mist)' },
};

const SIZE_HEIGHT: Record<NonNullable<Props['size']>, number> = {
  sm: 6,
  md: 10,
  lg: 14,
};

export function ProgressBar({
  current,
  target,
  label,
  rightHint,
  startBonus,
  tone = 'points',
  size = 'md',
}: Props) {
  if (target <= 0) return null;
  const pct = Math.min(100, Math.max(0, (current / target) * 100));
  const inSprint = pct >= 80 && current < target;
  const colors = TONE_COLORS[tone];
  const height = SIZE_HEIGHT[size];

  // Goal-Gradient 视觉非线性映射：最后 20% 占进度条视觉的 30% 像素
  // pct → visualPct
  let visualPct: number;
  if (pct <= 80) {
    // 0..80 真实进度 → 0..70 视觉
    visualPct = (pct / 80) * 70;
  } else {
    // 80..100 真实进度 → 70..100 视觉（最后 20% 拉长）
    visualPct = 70 + ((pct - 80) / 20) * 30;
  }

  // Endowed bonus 在条上的位置（视觉百分比）
  const bonusPct = startBonus && startBonus > 0
    ? Math.min(100, (startBonus / target) * 100)
    : 0;
  const bonusVisual = bonusPct <= 80 ? (bonusPct / 80) * 70 : 70 + ((bonusPct - 80) / 20) * 30;

  return (
    <div className="w-full">
      {(label || rightHint) && (
        <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>
          {label && <div className="truncate">{label}</div>}
          {rightHint && <div className="text-num shrink-0 ml-2">{rightHint}</div>}
        </div>
      )}
      <div
        className="w-full overflow-hidden relative"
        style={{
          height,
          borderRadius: height,
          background: colors.bg,
        }}
      >
        {/* Endowed-progress 起步红利：左侧浅色标记，意思是"开局送" */}
        {bonusPct > 0 && (
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: `${bonusVisual}%`,
              background: colors.fill,
              opacity: 0.25,
            }}
          />
        )}
        {/* 实际进度 */}
        <div
          className="absolute top-0 left-0 h-full transition-all"
          style={{
            width: `${visualPct}%`,
            background: inSprint ? `linear-gradient(90deg, ${colors.fill}, ${colors.sprint})` : colors.fill,
            transitionDuration: '480ms',
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: inSprint ? `0 0 8px ${colors.sprint}` : undefined,
          }}
        />
        {/* 冲刺区脉冲 */}
        {inSprint && (
          <div
            className="absolute top-0 right-0 h-full"
            style={{
              width: '30%',
              background: `linear-gradient(90deg, transparent, ${colors.sprint}40)`,
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        )}
      </div>
      {inSprint && (
        <div className="text-[10px] mt-0.5 text-right font-bold" style={{ color: colors.sprint }}>
          ⚡ 最后冲刺！
        </div>
      )}
    </div>
  );
}
