import { memo } from 'react';

const PETAL_COUNT = 10;

export const SunflowerSVG = memo(function SunflowerSVG() {
  return (
    <svg viewBox="0 0 150 220" width="100%" height="100%">
      {/* Pot shadow */}
      <ellipse cx="75" cy="185" rx="30" ry="5" fill="rgba(0,0,0,0.3)" filter="blur(4px)" />

      {/* Stem + leaves — sway group */}
      <g
        style={{
          transformOrigin: '75px 140px',
          animation: 'study-plant-sway 4.4s ease-in-out infinite',
        }}
      >
        {/* Stem — gentle S-curve */}
        <path
          d="M 75 140 Q 70 110 73 80 Q 76 50 72 25"
          fill="none"
          stroke="var(--plant-leaf-dark, #418241)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Left leaf */}
        <ellipse
          cx="58" cy="105" rx="14" ry="6"
          fill="var(--plant-leaf, #5FA55F)"
          transform="rotate(-35 58 105)"
        />
        {/* Left leaf vein */}
        <line
          x1="66" y1="102" x2="50" y2="108"
          stroke="var(--plant-leaf-dark, #418241)"
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Right leaf */}
        <ellipse
          cx="90" cy="80" rx="12" ry="5"
          fill="var(--plant-leaf-light, #82C382)"
          transform="rotate(30 90 80)"
        />
        {/* Right leaf vein */}
        <line
          x1="82" y1="78" x2="98" y2="82"
          stroke="var(--plant-leaf-dark, #418241)"
          strokeWidth="1"
          opacity="0.5"
        />

        {/* Flower head */}
        <g transform="translate(72 25)">
          {/* Petals */}
          {Array.from({ length: PETAL_COUNT }, (_, i) => {
            const ang = (360 / PETAL_COUNT) * i - 90;
            return (
              <ellipse
                key={i}
                cx="0" cy="-16" rx="5" ry="12"
                fill={i % 2 === 0
                  ? 'var(--acc-gold, #F0C350)'
                  : 'var(--acc-gold-light, #FFE182)'}
                transform={`rotate(${ang} 0 0)`}
              />
            );
          })}
          {/* Center disk */}
          <circle cx="0" cy="0" r="9" fill="var(--plant-pot-terracotta, #B45F41)" />
          <circle cx="0" cy="0" r="6" fill="#5A3520" />
          {/* Smiley face */}
          <circle cx="-2.5" cy="-1.5" r="1.2" fill="var(--acc-gold-dark, #AF8228)" />
          <circle cx="2.5" cy="-1.5" r="1.2" fill="var(--acc-gold-dark, #AF8228)" />
          <path
            d="M -2.5 1.5 Q 0 4 2.5 1.5"
            fill="none"
            stroke="var(--acc-gold-dark, #AF8228)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Pot — rounded */}
      <path
        d="M 50 140 Q 50 135 55 135 L 95 135 Q 100 135 100 140 L 96 178 Q 95 182 91 182 L 59 182 Q 55 182 54 178 Z"
        fill="var(--plant-pot-terracotta, #B45F41)"
      />
      {/* Pot rim */}
      <rect x="47" y="131" width="56" height="8" rx="3" fill="var(--plant-pot-dark, #8C4128)" />
      {/* Pot highlight */}
      <path
        d="M 55 140 L 58 178 L 54 178 L 50 140 Z"
        fill="#D28260"
        opacity="0.5"
      />
      {/* Pot star emboss */}
      <polygon
        points={(() => {
          const cx = 75, cy = 160;
          const pts: string[] = [];
          for (let i = 0; i < 10; i++) {
            const a = (-90 + 36 * i) * Math.PI / 180;
            const r = i % 2 === 0 ? 5 : 2;
            pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
          }
          return pts.join(' ');
        })()}
        fill="var(--acc-gold, #F0C350)"
        opacity="0.25"
      />
      {/* Soil */}
      <ellipse cx="75" cy="137" rx="24" ry="4" fill="#32231A" />
    </svg>
  );
});
