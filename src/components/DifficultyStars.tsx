// R3.2 → R4.0.0: 难度星显示（铜/银/金，仅展示，编辑在家长 TaskManager）
// 改动：1 星不再隐藏（铜任务也显示），用对应金属色渲染。
// 老调用 difficulty={1|2|3} 仍然兼容 — toStarLevel() 自动转换。
import type { StarLevel } from '../lib/unlockCondition';
import { DIFFICULTY_COLORS, starCount, toStarLevel } from '../lib/difficulty';

interface Props {
  difficulty: StarLevel | number | undefined;
  size?: 'sm' | 'md';
}

export function DifficultyStars({ difficulty, size = 'sm' }: Props) {
  if (!difficulty) return null;
  const lv = toStarLevel(difficulty);
  const n = starCount(lv);
  const colors = DIFFICULTY_COLORS[lv];
  const fontSize = size === 'sm' ? 11 : 14;
  const label = lv === 'bronze' ? '铜' : lv === 'silver' ? '银' : '金';
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded"
      style={{
        background: colors.soft,
        color: colors.strong,
        fontSize,
        lineHeight: 1,
        gap: 2,
      }}
      aria-label={`难度 ${label} ${n} 星`}
    >
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} style={{ color: colors.fill }}>★</span>
      ))}
      <span style={{ marginLeft: 2, fontSize: fontSize - 1 }}>{label}</span>
    </span>
  );
}
