// 左画 · 荣耀主题 (金桂冠 + 中央 5 角星)
// Python 参考: docs/home-feature-delivery/03-render-reference.py:307-328 (kind='trophy')
import { memo } from 'react';

export const PaintingLeftSVG = memo(function PaintingLeftSVG() {
  // viewBox 对应 Python 中 inner_w × inner_h = 198 × 118 (P1_W=210 减去 12 边距)
  // wreath center: wr_cx = 99, wr_cy = inner_h/2 + 4 = 63
  // 14 leaves total (7 each side), star r=14
  return (
    <svg viewBox="0 0 198 118" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="painting-glory-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(252,238,200)" />
          <stop offset="100%" stopColor="rgb(232,208,175)" />
        </linearGradient>
      </defs>
      <rect width="198" height="118" fill="url(#painting-glory-bg)" />

      {/* Wreath leaves — both sides, 7 each, angle 180-360 + 0+ at 20° increments */}
      {/* Right side leaves (angle = 0 + 20*i, where i=0..6) */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const ang = (20 * i) * Math.PI / 180;
        const lx = 99 + Math.cos(ang) * 32;
        const ly = 63 + Math.sin(ang) * 28;
        return (
          <ellipse key={`r-${i}`} cx={lx} cy={ly} rx="8" ry="3" fill="#558252" transform={`rotate(${(20 * i)} ${lx} ${ly})`} />
        );
      })}
      {/* Left side leaves (angle = 180 - 20*i) */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const ang = (180 - 20 * i) * Math.PI / 180;
        const lx = 99 + Math.cos(ang) * 32;
        const ly = 63 + Math.sin(ang) * 28;
        return (
          <ellipse key={`l-${i}`} cx={lx} cy={ly} rx="8" ry="3" fill="#558252" transform={`rotate(${180 - 20 * i} ${lx} ${ly})`} />
        );
      })}

      {/* Center 5-point star */}
      <polygon
        points={(() => {
          const pts = [];
          for (let i = 0; i < 10; i++) {
            const ang = (-90 + 36 * i) * Math.PI / 180;
            const r = i % 2 === 0 ? 14 : 6;
            const x = 99 + r * Math.cos(ang);
            const y = 63 + r * Math.sin(ang);
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
          }
          return pts.join(' ');
        })()}
        fill="var(--acc-gold, #F0C350)"
        stroke="var(--acc-gold-dark, #AF8228)"
        strokeWidth="0.5"
      />
    </svg>
  );
});
