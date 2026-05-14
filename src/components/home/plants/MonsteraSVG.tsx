// 龟背竹（右盆）— viewBox 模拟 Python cx=1070, base_y=740 的局部坐标
// Python 实现参考: docs/home-feature-delivery/03-render-reference.py:981-1062
import { memo } from 'react';

// 龟背竹分裂叶形 — Python 中 18 个 polygon 点
const MONSTERA_LEAF_PATH =
  'M 0 -1 L 0.4 -0.85 L 0.7 -0.4 L 0.5 -0.2 L 0.85 0 L 0.55 0.15 L 0.8 0.35 L 0.4 0.55 L 0.45 0.8 L 0 0.95 L -0.45 0.8 L -0.4 0.55 L -0.8 0.35 L -0.55 0.15 L -0.85 0 L -0.5 -0.2 L -0.7 -0.4 L -0.4 -0.85 Z';

function MonsteraLeaf({
  cx, cy, size, angle, fill,
}: { cx: number; cy: number; size: number; angle: number; fill: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle}) scale(${size})`}>
      <path d={MONSTERA_LEAF_PATH} fill={fill} />
    </g>
  );
}

export const MonsteraSVG = memo(function MonsteraSVG() {
  // local frame: 160×260; pot top at y=130 (base_y reference), plant base = (80, 130)
  // leaves from base reach ~130-160 above
  return (
    <svg viewBox="-30 -10 220 260" width="100%" height="100%">
      {/* Pot shadow */}
      <ellipse cx="80" cy="170" rx="35" ry="6" fill="rgba(0,0,0,0.35)" filter="blur(4px)" />

      {/* Stems + Leaves group with sway */}
      <g
        className="study-plant-sway"
        style={{
          transformOrigin: '80px 130px',
          animation: 'study-plant-sway 4.6s ease-in-out infinite',
        }}
      >
        {/* Stems to leaves */}
        <line x1="80" y1="125" x2="30" y2="80" stroke="#508250" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="125" x2="125" y2="70" stroke="#508250" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="125" x2="70" y2="35" stroke="#508250" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="125" x2="105" y2="10" stroke="#508250" strokeWidth="3" strokeLinecap="round" />
        <line x1="80" y1="125" x2="40" y2="0" stroke="#508250" strokeWidth="3" strokeLinecap="round" />

        {/* 5 large split leaves — Python uses sizes 38, 40, 42, 38, 36 with angles -25, 30, -10, 15, -20 */}
        <MonsteraLeaf cx={30} cy={80} size={38} angle={-25} fill="var(--plant-leaf-dark)" />
        <MonsteraLeaf cx={125} cy={70} size={40} angle={30} fill="var(--plant-leaf)" />
        <MonsteraLeaf cx={70} cy={35} size={42} angle={-10} fill="var(--plant-leaf)" />
        <MonsteraLeaf cx={105} cy={10} size={38} angle={15} fill="var(--plant-leaf-light)" />
        <MonsteraLeaf cx={40} cy={0} size={36} angle={-20} fill="var(--plant-leaf)" />
      </g>

      {/* White ceramic pot */}
      <polygon
        points="52.5,130 107.5,130 102.5,185 57.5,185"
        fill="#F5F0E6"
      />
      {/* Pot rim */}
      <rect x="49.5" y="124" width="61" height="10" fill="#C8C3B9" rx="1" />
      {/* Pot side shadow */}
      <polygon points="99,134 107.5,134 102.5,185 99,185" fill="#DCD7C8" />
      {/* Soil */}
      <ellipse cx="80" cy="130" rx="24" ry="4" fill="#32231A" />
    </svg>
  );
});
