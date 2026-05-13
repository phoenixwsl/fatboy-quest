// 蛋仔头像 R2.1: 重画 + 8 个皮肤 + 装饰物（披风/面罩/角/天线/王冠/眼罩）
import { motion } from 'framer-motion';
import { findSkin, SKINS } from '../lib/skins';

interface Props {
  skinId?: string;
  size?: number;
  bobbing?: boolean;
  mood?: 'normal' | 'happy' | 'sleepy';
}

export function PetAvatar({
  skinId = 'skin_classic',
  size = 120,
  bobbing = true,
  mood = 'normal',
}: Props) {
  const skin = findSkin(skinId) ?? findSkin('skin_classic')!;
  const deco = skin.decoration;

  return (
    <motion.div
      animate={bobbing ? { y: [0, -6, 0] } : {}}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ width: size, height: size, lineHeight: 0 }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <defs>
          <radialGradient id={`g-${skinId}`} cx="38%" cy="32%">
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

        {/* 装饰：天线 */}
        {deco === 'antenna' && (
          <g>
            <line x1="60" y1="12" x2="60" y2="22" stroke={skin.accent} strokeWidth="2" />
            <circle cx="60" cy="10" r="3" fill={skin.accent} />
          </g>
        )}

        {/* 装饰：角 */}
        {deco === 'horn' && (
          <>
            <path d="M 40 22 L 35 8 L 48 18 Z" fill={skin.accent} />
            <path d="M 80 22 L 85 8 L 72 18 Z" fill={skin.accent} />
          </>
        )}

        {/* 装饰：王冠 */}
        {deco === 'crown' && (
          <path d="M 38 18 L 44 8 L 52 16 L 60 6 L 68 16 L 76 8 L 82 18 Z"
            fill={skin.accent} stroke="#1a1a2e" strokeWidth="1.5" />
        )}

        {/* 蛋身 */}
        <ellipse cx="60" cy="58" rx="38" ry="46" fill={`url(#g-${skinId})`}
          stroke={skin.accent} strokeWidth="2" />

        {/* 头盔反光 */}
        <ellipse cx="48" cy="40" rx="12" ry="8" fill="white" opacity="0.35" />

        {/* 装饰：面罩 */}
        {deco === 'mask' && (
          <rect x="38" y="55" width="44" height="12" rx="3"
            fill="#1a1a2e" opacity="0.85" />
        )}

        {/* 眼睛 */}
        {mood === 'sleepy' ? (
          <>
            <path d="M 44 58 Q 50 62 56 58" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 64 58 Q 70 62 76 58" stroke="#1a1a2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : deco === 'mask' ? (
          <>
            <ellipse cx="50" cy="61" rx="3" ry="2.5" fill={skin.accent} />
            <ellipse cx="70" cy="61" rx="3" ry="2.5" fill={skin.accent} />
          </>
        ) : deco === 'patch' ? (
          <>
            <ellipse cx="50" cy="60" rx="8" ry="6" fill="#1a1a2e" />
            <line x1="42" y1="55" x2="40" y2="48" stroke="#1a1a2e" strokeWidth="2" />
            <line x1="58" y1="55" x2="62" y2="48" stroke="#1a1a2e" strokeWidth="2" />
            <ellipse cx="70" cy="60" rx="4" ry="6" fill="#1a1a2e" />
            <circle cx="71" cy="58" r="1.4" fill="white" />
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

        {/* 装饰：披风 */}
        {deco === 'cape' && (
          <path d="M 92 50 Q 110 70 95 95 L 75 90 Q 85 70 92 50 Z"
            fill={skin.accent} opacity="0.85" />
        )}
      </svg>
    </motion.div>
  );
}

export const AVAILABLE_SKINS = SKINS.map(s => s.id);
