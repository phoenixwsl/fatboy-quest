// 打怪兽 SVG 组件
// 每个科目对应一只小怪。size=40 用于卡片左侧，size=160 用于闯关页大图
// hp 范围 0-100，0 时触发击杀动画
import { AnimatePresence, motion } from 'framer-motion';
import type { SubjectType } from '../types';

interface Props {
  subject: SubjectType;
  size?: number;
  hp?: number;       // 0-100, undefined = 不显示血条
  defeated?: boolean; // true 时显示爆炸 ✨
}

// 每种科目一个调色板 + 几何形状
const MONSTERS: Record<SubjectType, {
  primary: string;
  secondary: string;
  draw: (s: number) => JSX.Element;
}> = {
  math: {
    primary: '#7c5cff', secondary: '#22d3ee',
    draw: (s) => (
      <g>
        {/* 齿轮主体 */}
        <circle cx={s/2} cy={s/2} r={s*0.32} fill="#7c5cff" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
          <rect key={deg} x={s/2 - s*0.06} y={s*0.08} width={s*0.12} height={s*0.12}
            fill="#22d3ee" transform={`rotate(${deg} ${s/2} ${s/2})`} />
        ))}
        <circle cx={s/2} cy={s/2} r={s*0.18} fill="#0b1026" />
        {/* 眼睛 */}
        <circle cx={s/2 - s*0.07} cy={s/2 - s*0.02} r={s*0.04} fill="white" />
        <circle cx={s/2 + s*0.07} cy={s/2 - s*0.02} r={s*0.04} fill="white" />
      </g>
    ),
  },
  chinese: {
    primary: '#f43f5e', secondary: '#fbbf24',
    draw: (s) => (
      <g>
        {/* 水墨忍者圆头 */}
        <circle cx={s/2} cy={s/2} r={s*0.38} fill="#1a1a2e" />
        <path d={`M ${s*0.15} ${s/2} Q ${s/2} ${s*0.25} ${s*0.85} ${s/2}`}
          fill="#f43f5e" />
        {/* 眼睛 - 红色发光 */}
        <ellipse cx={s/2 - s*0.1} cy={s/2 + s*0.05} rx={s*0.06} ry={s*0.04} fill="#fbbf24" />
        <ellipse cx={s/2 + s*0.1} cy={s/2 + s*0.05} rx={s*0.06} ry={s*0.04} fill="#fbbf24" />
        <circle cx={s/2 - s*0.1} cy={s/2 + s*0.05} r={s*0.015} fill="#1a1a2e" />
        <circle cx={s/2 + s*0.1} cy={s/2 + s*0.05} r={s*0.015} fill="#1a1a2e" />
      </g>
    ),
  },
  english: {
    primary: '#22d3ee', secondary: '#a78bfa',
    draw: (s) => (
      <g>
        {/* 字母史莱姆 - 椭圆 + 滴水 */}
        <ellipse cx={s/2} cy={s*0.6} rx={s*0.38} ry={s*0.32} fill="#22d3ee" />
        <path d={`M ${s*0.2} ${s*0.6} Q ${s*0.25} ${s*0.85} ${s*0.35} ${s*0.8}`}
          fill="#22d3ee" />
        <path d={`M ${s*0.65} ${s*0.8} Q ${s*0.75} ${s*0.85} ${s*0.8} ${s*0.6}`}
          fill="#22d3ee" />
        {/* 高光 */}
        <ellipse cx={s/2 - s*0.1} cy={s*0.5} rx={s*0.08} ry={s*0.05}
          fill="white" opacity="0.5" />
        {/* 眼睛 */}
        <circle cx={s/2 - s*0.08} cy={s*0.58} r={s*0.04} fill="#1a1a2e" />
        <circle cx={s/2 + s*0.08} cy={s*0.58} r={s*0.04} fill="#1a1a2e" />
        {/* 字母 A 标记 */}
        <text x={s/2} y={s*0.42} textAnchor="middle" fill="white" fontSize={s*0.15} fontWeight="bold">A</text>
      </g>
    ),
  },
  reading: {
    primary: '#a78bfa', secondary: '#f59e0b',
    draw: (s) => (
      <g>
        {/* 书页幻影 - 半透叠层 */}
        <rect x={s*0.2} y={s*0.2} width={s*0.55} height={s*0.6}
          fill="#a78bfa" opacity="0.6" rx={s*0.03} />
        <rect x={s*0.25} y={s*0.25} width={s*0.55} height={s*0.6}
          fill="#a78bfa" opacity="0.8" rx={s*0.03} />
        {/* 文字线 */}
        <line x1={s*0.3} y1={s*0.4} x2={s*0.75} y2={s*0.4} stroke="white" strokeWidth={s*0.02} />
        <line x1={s*0.3} y1={s*0.5} x2={s*0.7} y2={s*0.5} stroke="white" strokeWidth={s*0.02} />
        <line x1={s*0.3} y1={s*0.6} x2={s*0.75} y2={s*0.6} stroke="white" strokeWidth={s*0.02} />
        {/* 眼睛 */}
        <circle cx={s*0.45} cy={s*0.7} r={s*0.04} fill="#fbbf24" />
        <circle cx={s*0.65} cy={s*0.7} r={s*0.04} fill="#fbbf24" />
      </g>
    ),
  },
  writing: {
    primary: '#10b981', secondary: '#fbbf24',
    draw: (s) => (
      <g>
        {/* 墨水触手怪 */}
        <ellipse cx={s/2} cy={s*0.4} rx={s*0.3} ry={s*0.25} fill="#10b981" />
        {/* 触手 */}
        <path d={`M ${s*0.25} ${s*0.5} Q ${s*0.2} ${s*0.75} ${s*0.3} ${s*0.85}`}
          stroke="#10b981" strokeWidth={s*0.06} fill="none" strokeLinecap="round" />
        <path d={`M ${s/2} ${s*0.6} Q ${s/2} ${s*0.85} ${s*0.55} ${s*0.9}`}
          stroke="#10b981" strokeWidth={s*0.06} fill="none" strokeLinecap="round" />
        <path d={`M ${s*0.75} ${s*0.5} Q ${s*0.8} ${s*0.75} ${s*0.7} ${s*0.85}`}
          stroke="#10b981" strokeWidth={s*0.06} fill="none" strokeLinecap="round" />
        {/* 眼睛 */}
        <circle cx={s/2 - s*0.1} cy={s*0.38} r={s*0.05} fill="white" />
        <circle cx={s/2 + s*0.1} cy={s*0.38} r={s*0.05} fill="white" />
        <circle cx={s/2 - s*0.1} cy={s*0.38} r={s*0.02} fill="#1a1a2e" />
        <circle cx={s/2 + s*0.1} cy={s*0.38} r={s*0.02} fill="#1a1a2e" />
      </g>
    ),
  },
  other: {
    primary: '#fbbf24', secondary: '#a78bfa',
    draw: (s) => (
      <g>
        {/* 星球怪 */}
        <circle cx={s/2} cy={s/2} r={s*0.32} fill="#fbbf24" />
        {/* 星环 */}
        <ellipse cx={s/2} cy={s/2} rx={s*0.42} ry={s*0.1}
          fill="none" stroke="#a78bfa" strokeWidth={s*0.04} opacity="0.8" />
        {/* 眼睛 */}
        <circle cx={s/2 - s*0.08} cy={s/2 - s*0.04} r={s*0.04} fill="#1a1a2e" />
        <circle cx={s/2 + s*0.08} cy={s/2 - s*0.04} r={s*0.04} fill="#1a1a2e" />
        {/* 嘴巴 */}
        <path d={`M ${s*0.4} ${s*0.6} Q ${s/2} ${s*0.68} ${s*0.6} ${s*0.6}`}
          stroke="#1a1a2e" strokeWidth={s*0.025} fill="none" />
      </g>
    ),
  },
};

export function Monster({ subject, size = 48, hp, defeated }: Props) {
  const cfg = MONSTERS[subject] ?? MONSTERS.other;
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <AnimatePresence>
        {!defeated && (
          <motion.svg
            viewBox={`0 0 ${size} ${size}`} width={size} height={size}
            initial={{ scale: 1 }}
            animate={{ scale: 1, y: [0, -2, 0] }}
            exit={{ scale: 0, rotate: 360, opacity: 0 }}
            transition={{ y: { duration: 1.5, repeat: Infinity }, exit: { duration: 0.5 } }}
          >
            {cfg.draw(size)}
          </motion.svg>
        )}
        {defeated && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: [0, 2, 0] }} exit={{ scale: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center text-[1.5em]"
          >
            💥
          </motion.div>
        )}
      </AnimatePresence>
      {hp !== undefined && !defeated && size >= 80 && (
        <div className="absolute -bottom-3 left-0 right-0 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
            animate={{ width: `${Math.max(0, Math.min(100, hp))}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}
