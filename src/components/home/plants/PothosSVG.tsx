// 大叶绿萝（左盆）— viewBox 模拟 Python 中 cx=530, base_y=740 的局部坐标
// Python 实现参考: docs/home-feature-delivery/03-render-reference.py:851-978
import { memo } from 'react';

export const PothosSVG = memo(function PothosSVG() {
  // local frame: 150×220, plant base at (75, 80)
  // pot bottom at y=130 (80+50), plant top at y= -40 (vines reach up 110px above base)
  return (
    <svg viewBox="0 0 150 220" width="100%" height="100%">
      <defs>
        <path
          id="pothos-heart-leaf"
          d="M 0 -14 L 8.4 -9.8 L 12.6 -1.4 L 5.6 7 L 0 9.8 L -5.6 7 L -12.6 -1.4 L -8.4 -9.8 Z"
        />
      </defs>

      {/* Pot shadow on floor */}
      <ellipse cx="75" cy="175" rx="35" ry="6" fill="rgba(0,0,0,0.35)" filter="blur(4px)" />

      {/* Vines (rendered first, behind pot top edge) — group with sway animation */}
      <g
        className="study-plant-sway"
        style={{
          transformOrigin: '75px 130px',
          animation: 'study-plant-sway 4.2s ease-in-out infinite',
        }}
      >
        {/* Vine 1: upward to top-left */}
        <polyline
          points="65,75 50,50 30,10 15,-30"
          fill="none"
          stroke="var(--plant-vine, #6EAF64)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <use href="#pothos-heart-leaf" x="50" y="50" fill="var(--plant-leaf)" transform="rotate(-30 50 50)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="30" y="10" fill="var(--plant-leaf)" transform="rotate(-30 30 10)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="15" y="-30" fill="var(--plant-leaf)" transform="rotate(-30 15 -30)" opacity="0.9" />

        {/* Vine 2: upward to top-center */}
        <polyline
          points="73,75 70,45 78,5 85,-40"
          fill="none"
          stroke="var(--plant-vine)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <use href="#pothos-heart-leaf" x="70" y="45" fill="var(--plant-leaf-light)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="78" y="5" fill="var(--plant-leaf-light)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="85" y="-40" fill="var(--plant-leaf-light)" opacity="0.9" />

        {/* Vine 3: upward to top-right */}
        <polyline
          points="85,75 100,52 115,20 130,-20"
          fill="none"
          stroke="var(--plant-vine)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <use href="#pothos-heart-leaf" x="100" y="52" fill="var(--plant-leaf)" transform="rotate(25 100 52)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="115" y="20" fill="var(--plant-leaf)" transform="rotate(25 115 20)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="130" y="-20" fill="var(--plant-leaf)" transform="rotate(25 130 -20)" opacity="0.9" />

        {/* Hanging drops */}
        <polyline
          points="53,85 43,100 35,118"
          fill="none"
          stroke="var(--plant-vine)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <use href="#pothos-heart-leaf" x="43" y="100" fill="var(--plant-leaf)" transform="rotate(-45 43 100)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="35" y="118" fill="var(--plant-leaf)" transform="rotate(-45 35 118)" opacity="0.9" />

        <polyline
          points="97,85 105,102 113,120"
          fill="none"
          stroke="var(--plant-vine)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <use href="#pothos-heart-leaf" x="105" y="102" fill="var(--plant-leaf-light)" transform="rotate(45 105 102)" opacity="0.9" />
        <use href="#pothos-heart-leaf" x="113" y="120" fill="var(--plant-leaf-light)" transform="rotate(45 113 120)" opacity="0.9" />
      </g>

      {/* Pot (rendered after vines so rim covers vine bases) */}
      {/* Trapezoidal terracotta */}
      <polygon
        points="50,80 100,80 94,130 56,130"
        fill="var(--plant-pot-terracotta)"
      />
      {/* Pot rim */}
      <rect x="47" y="74" width="56" height="10" fill="var(--plant-pot-dark)" rx="1" />
      {/* Highlight */}
      <polygon points="53,84 58,84 60,126 56,126" fill="#D28260" opacity="0.6" />
      {/* Soil */}
      <ellipse cx="75" cy="80" rx="22" ry="4" fill="#32231A" />
    </svg>
  );
});
