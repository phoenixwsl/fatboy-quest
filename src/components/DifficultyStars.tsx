// R3.2: 难度星显示（1-3 颗，仅展示，编辑在家长 TaskManager）
import type { Difficulty } from '../lib/difficulty';

interface Props {
  difficulty: Difficulty | undefined;
  size?: 'sm' | 'md';
}

export function DifficultyStars({ difficulty, size = 'sm' }: Props) {
  if (!difficulty || difficulty === 1) return null;   // 1 星不显示，去视觉噪音
  const fontSize = size === 'sm' ? 11 : 14;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded"
      style={{
        background: 'var(--fatboy-50)',
        color: 'var(--fatboy-700)',
        fontSize,
        lineHeight: 1,
        gap: 1,
      }}
      aria-label={`难度 ${difficulty} 星`}
    >
      {Array.from({ length: difficulty }).map((_, i) => (
        <span key={i}>⭐</span>
      ))}
    </span>
  );
}
