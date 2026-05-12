// 蛋仔头像（SVG）。R1 仅做基础版，R2/R3 会扩展进化形态、装备
import { motion } from 'framer-motion';

interface Props {
  skinId?: string;
  size?: number;
  bobbing?: boolean;
  mood?: 'normal' | 'happy' | 'sleepy';
}

const SKINS: Record<string, { body: string; accent: string }> = {
  skin_classic:   { body: '#fbbf24', accent: '#f59e0b' }, // 经典金蛋
  skin_explorer:  { body: '#7c5cff', accent: '#a78bfa' }, // 星空紫
  skin_cyber:     { body: '#22d3ee', accent: '#06b6d4' }, // 赛博青
  skin_rocket:    { body: '#ef4444', accent: '#fbbf24' }, // 火箭红
};

export function PetAvatar({
  skinId = 'skin_classic',
  size = 120,
  bobbing = true,
  mood = 'normal',
}: Props) {
  const skin = SKINS[skinId] ?? SKINS.skin_classic;
  return (
    <motion.div
      animate={bobbing ? { y: [0, -6, 0] } : {}}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: size, lineHeight: 0 }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <defs>
          <radialGradient id={`g-${skinId}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="40%" stopColor={skin.body} />
            <stop offset="100%" stopColor={skin.accent} />
          </radialGradient>
          <radialGradient id={`shadow-${skinId}`}>
            <stop offset="0%" stopColor="black" stopOpacity="0.3" />
            <stop offset="100%" stopColor="black" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* 阴影 */}
        <ellipse cx="60" cy="108" rx="28" ry="4" fill={`url(#shadow-${skinId})`} />
        {/* 蛋身 */}
        <ellipse cx="60" cy="58" rx="38" ry="46" fill={`url(#g-${skinId})`} stroke={skin.accent} strokeWidth="2" />
        {/* 头盔反光 */}
        <ellipse cx="48" cy="40" rx="12" ry="8" fill="white" opacity="0.35" />
        {/* 眼睛 */}
        {mood === 'sleepy' ? (
          <>
            <path d="M 44 58 Q 50 62 56 58" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 64 58 Q 70 62 76 58" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="50" cy="60" rx="4" ry="6" fill="#1a1a2e" />
            <ellipse cx="70" cy="60" rx="4" ry="6" fill="#1a1a2e" />
            <circle cx="51" cy="58" r="1.4" fill="white" />
            <circle cx="71" cy="58" r="1.4" fill="white" />
          </>
        )}
        {/* 嘴巴 */}
        {mood === 'happy' ? (
          <path d="M 50 76 Q 60 86 70 76" stroke="#1a1a2e" strokeWidth="3" fill="#ef4444" strokeLinecap="round" />
        ) : (
          <path d="M 52 76 Q 60 80 68 76" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
        {/* 腮红 */}
        <circle cx="42" cy="72" r="4" fill="#f87171" opacity="0.5" />
        <circle cx="78" cy="72" r="4" fill="#f87171" opacity="0.5" />
      </svg>
    </motion.div>
  );
}

export const AVAILABLE_SKINS = Object.keys(SKINS);
