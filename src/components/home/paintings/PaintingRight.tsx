// 右画 · 探索主题 (星空 + 月亮 + 火箭)
// Python 参考: docs/home-feature-delivery/03-render-reference.py:330-361 (kind='toy')
import { memo } from 'react';

// 18 个随机星点 — 用 seed=42 固定布局，匹配 Python 输出
const STARS = (() => {
  // Mulberry32 PRNG with seed 42
  let s = 42;
  const next = () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const stars: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 18; i++) {
    stars.push({
      x: 5 + Math.floor(next() * 188),
      y: 5 + Math.floor(next() * 108),
      r: [1, 1, 2, 2][Math.floor(next() * 4)],
    });
  }
  return stars;
})();

export const PaintingRightSVG = memo(function PaintingRightSVG() {
  return (
    <svg viewBox="0 0 198 118" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="painting-explore-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(35,45,90)" />
          <stop offset="100%" stopColor="rgb(85,105,150)" />
        </linearGradient>
      </defs>
      <rect width="198" height="118" fill="url(#painting-explore-bg)" />

      {/* Stars */}
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF" opacity="0.9" />
      ))}

      {/* Moon (crescent: light circle + sky-color overlap) */}
      <circle cx="37" cy="37" r="15" fill="rgb(255,230,200)" />
      <circle cx="44" cy="32" r="14" fill="rgb(35,45,90)" />

      {/* Rocket — centered around (rx=124, ry=64) */}
      <g>
        {/* Body */}
        <polygon points="124,36 134,48 134,80 114,80 114,48" fill="rgb(235,235,245)" />
        {/* Red tip */}
        <polygon points="124,36 134,52 114,52" fill="var(--acc-red, #D25A50)" />
        {/* Window */}
        <ellipse cx="124" cy="59" rx="5" ry="5" fill="rgb(100,170,220)" stroke="rgb(50,90,140)" strokeWidth="1" />
        {/* Left fin */}
        <polygon points="114,80 108,88 114,88" fill="var(--acc-red)" />
        {/* Right fin */}
        <polygon points="134,80 140,88 134,88" fill="var(--acc-red)" />
        {/* Flame */}
        <polygon points="118,88 130,88 124,102" fill="rgb(255,200,90)" />
      </g>
    </svg>
  );
});
