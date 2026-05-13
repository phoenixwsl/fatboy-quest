/**
 * Fatboy — unified character × state component.
 *
 * 8 characters × 8 states = 64 combinations.
 * Pick any character, any state, get the right SVG.
 *
 *   <Fatboy />                                       // default character, default state
 *   <Fatboy state="victory" />                       // default character, victory state
 *   <Fatboy character="racer" state="focused" />     // racer in focused state
 *   <Fatboy character="ninja" state="sleeping" />    // sleeping ninja
 *
 * Also exports backward-compatible aliases:
 *   <FatboyAvatar state="..." />        — fixes character to 'default'
 *   <FatboyCharacter character="..." /> — fixes state to 'default'
 */

import React from 'react';

// =====================================================
//  TYPES
// =====================================================
export type FatboyState =
  | 'default' | 'thinking' | 'focused' | 'tense'
  | 'victory' | 'celebrate' | 'resting' | 'sleeping';

export type FatboyCharacterId =
  | 'default' | 'racer' | 'astronaut' | 'pirate'
  | 'ninja' | 'mario' | 'knight' | 'wizard';

// =====================================================
//  SVG URL MAP (8 × 8 = 64 imports)
// =====================================================
// Webpack/Vite will tree-shake unused ones at build time.
import default_default   from './svg/characters/default/default.svg';
import default_thinking  from './svg/characters/default/thinking.svg';
import default_focused   from './svg/characters/default/focused.svg';
import default_tense     from './svg/characters/default/tense.svg';
import default_victory   from './svg/characters/default/victory.svg';
import default_celebrate from './svg/characters/default/celebrate.svg';
import default_resting   from './svg/characters/default/resting.svg';
import default_sleeping  from './svg/characters/default/sleeping.svg';

import racer_default     from './svg/characters/racer/default.svg';
import racer_thinking    from './svg/characters/racer/thinking.svg';
import racer_focused     from './svg/characters/racer/focused.svg';
import racer_tense       from './svg/characters/racer/tense.svg';
import racer_victory     from './svg/characters/racer/victory.svg';
import racer_celebrate   from './svg/characters/racer/celebrate.svg';
import racer_resting     from './svg/characters/racer/resting.svg';
import racer_sleeping    from './svg/characters/racer/sleeping.svg';

import astronaut_default   from './svg/characters/astronaut/default.svg';
import astronaut_thinking  from './svg/characters/astronaut/thinking.svg';
import astronaut_focused   from './svg/characters/astronaut/focused.svg';
import astronaut_tense     from './svg/characters/astronaut/tense.svg';
import astronaut_victory   from './svg/characters/astronaut/victory.svg';
import astronaut_celebrate from './svg/characters/astronaut/celebrate.svg';
import astronaut_resting   from './svg/characters/astronaut/resting.svg';
import astronaut_sleeping  from './svg/characters/astronaut/sleeping.svg';

import pirate_default     from './svg/characters/pirate/default.svg';
import pirate_thinking    from './svg/characters/pirate/thinking.svg';
import pirate_focused     from './svg/characters/pirate/focused.svg';
import pirate_tense       from './svg/characters/pirate/tense.svg';
import pirate_victory     from './svg/characters/pirate/victory.svg';
import pirate_celebrate   from './svg/characters/pirate/celebrate.svg';
import pirate_resting     from './svg/characters/pirate/resting.svg';
import pirate_sleeping    from './svg/characters/pirate/sleeping.svg';

import ninja_default      from './svg/characters/ninja/default.svg';
import ninja_thinking     from './svg/characters/ninja/thinking.svg';
import ninja_focused      from './svg/characters/ninja/focused.svg';
import ninja_tense        from './svg/characters/ninja/tense.svg';
import ninja_victory      from './svg/characters/ninja/victory.svg';
import ninja_celebrate    from './svg/characters/ninja/celebrate.svg';
import ninja_resting      from './svg/characters/ninja/resting.svg';
import ninja_sleeping     from './svg/characters/ninja/sleeping.svg';

import mario_default      from './svg/characters/mario/default.svg';
import mario_thinking     from './svg/characters/mario/thinking.svg';
import mario_focused      from './svg/characters/mario/focused.svg';
import mario_tense        from './svg/characters/mario/tense.svg';
import mario_victory      from './svg/characters/mario/victory.svg';
import mario_celebrate    from './svg/characters/mario/celebrate.svg';
import mario_resting      from './svg/characters/mario/resting.svg';
import mario_sleeping     from './svg/characters/mario/sleeping.svg';

import knight_default     from './svg/characters/knight/default.svg';
import knight_thinking    from './svg/characters/knight/thinking.svg';
import knight_focused     from './svg/characters/knight/focused.svg';
import knight_tense       from './svg/characters/knight/tense.svg';
import knight_victory     from './svg/characters/knight/victory.svg';
import knight_celebrate   from './svg/characters/knight/celebrate.svg';
import knight_resting     from './svg/characters/knight/resting.svg';
import knight_sleeping    from './svg/characters/knight/sleeping.svg';

import wizard_default     from './svg/characters/wizard/default.svg';
import wizard_thinking    from './svg/characters/wizard/thinking.svg';
import wizard_focused     from './svg/characters/wizard/focused.svg';
import wizard_tense       from './svg/characters/wizard/tense.svg';
import wizard_victory     from './svg/characters/wizard/victory.svg';
import wizard_celebrate   from './svg/characters/wizard/celebrate.svg';
import wizard_resting     from './svg/characters/wizard/resting.svg';
import wizard_sleeping    from './svg/characters/wizard/sleeping.svg';

const SVG_MATRIX: Record<FatboyCharacterId, Record<FatboyState, string>> = {
  default:   { default: default_default,   thinking: default_thinking,   focused: default_focused,   tense: default_tense,
               victory: default_victory,   celebrate: default_celebrate, resting: default_resting,   sleeping: default_sleeping },
  racer:     { default: racer_default,     thinking: racer_thinking,     focused: racer_focused,     tense: racer_tense,
               victory: racer_victory,     celebrate: racer_celebrate,   resting: racer_resting,     sleeping: racer_sleeping },
  astronaut: { default: astronaut_default, thinking: astronaut_thinking, focused: astronaut_focused, tense: astronaut_tense,
               victory: astronaut_victory, celebrate: astronaut_celebrate, resting: astronaut_resting, sleeping: astronaut_sleeping },
  pirate:    { default: pirate_default,    thinking: pirate_thinking,    focused: pirate_focused,    tense: pirate_tense,
               victory: pirate_victory,    celebrate: pirate_celebrate,  resting: pirate_resting,    sleeping: pirate_sleeping },
  ninja:     { default: ninja_default,     thinking: ninja_thinking,     focused: ninja_focused,     tense: ninja_tense,
               victory: ninja_victory,     celebrate: ninja_celebrate,   resting: ninja_resting,     sleeping: ninja_sleeping },
  mario:     { default: mario_default,     thinking: mario_thinking,     focused: mario_focused,     tense: mario_tense,
               victory: mario_victory,     celebrate: mario_celebrate,   resting: mario_resting,     sleeping: mario_sleeping },
  knight:    { default: knight_default,    thinking: knight_thinking,    focused: knight_focused,    tense: knight_tense,
               victory: knight_victory,    celebrate: knight_celebrate,  resting: knight_resting,    sleeping: knight_sleeping },
  wizard:    { default: wizard_default,    thinking: wizard_thinking,    focused: wizard_focused,    tense: wizard_tense,
               victory: wizard_victory,    celebrate: wizard_celebrate,  resting: wizard_resting,    sleeping: wizard_sleeping },
};

// =====================================================
//  METADATA
// =====================================================
export interface CharacterMeta {
  id: FatboyCharacterId;
  name: string;
  nameEn: string;
  tagline: string;
  themeColor: string;
}

export const CHARACTER_META: Record<FatboyCharacterId, CharacterMeta> = {
  default:   { id: 'default',   name: '原版肥仔',   nameEn: 'Fatboy',    tagline: '最初的样子',     themeColor: '#F4C752' },
  racer:     { id: 'racer',     name: '赛车手',     nameEn: 'Racer',     tagline: '风驰电掣的肥仔', themeColor: '#E53935' },
  astronaut: { id: 'astronaut', name: '宇航员',     nameEn: 'Astronaut', tagline: '飞向群星的肥仔', themeColor: '#1976D2' },
  pirate:    { id: 'pirate',    name: '海盗船长',   nameEn: 'Pirate',    tagline: '寻找宝藏的肥仔', themeColor: '#37474F' },
  ninja:     { id: 'ninja',     name: '忍者',       nameEn: 'Ninja',     tagline: '隐入暗影的肥仔', themeColor: '#263238' },
  mario:     { id: 'mario',     name: '水管工',     nameEn: 'Mario',     tagline: '一路向前的肥仔', themeColor: '#E53935' },
  knight:    { id: 'knight',    name: '骑士',       nameEn: 'Knight',    tagline: '荣耀守护的肥仔', themeColor: '#90A4AE' },
  wizard:    { id: 'wizard',    name: '魔法师',     nameEn: 'Wizard',    tagline: '掌握咒语的肥仔', themeColor: '#9C27B0' },
};

export const ALL_CHARACTERS: FatboyCharacterId[] = [
  'default', 'racer', 'astronaut', 'pirate', 'ninja', 'mario', 'knight', 'wizard',
];

export const ALL_STATES: FatboyState[] = [
  'default', 'thinking', 'focused', 'tense', 'victory', 'celebrate', 'resting', 'sleeping',
];

const STATE_ALT: Record<FatboyState, string> = {
  default:   '站立微笑',
  thinking:  '在思考',
  focused:   '专注准备',
  tense:     '紧张奋力',
  victory:   '击败胜利',
  celebrate: '欢呼庆祝',
  resting:   '休息',
  sleeping:  '睡着了',
};

// =====================================================
//  MAIN COMPONENT
// =====================================================
export interface FatboyProps {
  /** Which themed character. Default: 'default' (vanilla Fatboy). */
  character?: FatboyCharacterId;
  /** Current emotional state. Default: 'default' (neutral smile). */
  state?: FatboyState;
  /** Display size in pixels. */
  size?: number;
  /** Adds breathing animation (subtle scale). */
  breathing?: boolean;
  /** Bouncing animation (for character select / idle showcase). */
  bouncing?: boolean;
  /** Auto-animate based on state (recommended). */
  autoAnimate?: boolean;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export const Fatboy: React.FC<FatboyProps> = ({
  character = 'default',
  state = 'default',
  size = 180,
  breathing = false,
  bouncing = false,
  autoAnimate = false,
  className,
  style,
  alt,
}) => {
  const url = SVG_MATRIX[character]?.[state] ?? SVG_MATRIX.default.default;
  const meta = CHARACTER_META[character];

  // Auto pick the right animation for the current state
  const autoCls = autoAnimate
    ? state === 'tense'     ? 'fatboy--shake'
    : state === 'victory'   ? 'fatboy--bounce'
    : state === 'celebrate' ? 'fatboy--wobble'
    : state === 'sleeping'  ? 'fatboy--sleepbob'
    : state === 'default'   ? 'fatboy--breathe'
    : state === 'resting'   ? 'fatboy--breathe-slow'
    : ''
    : '';

  const animCls = autoCls
    || (bouncing ? 'fatboy--bouncing' : '')
    || (breathing ? 'fatboy--breathe' : '');

  return (
    <img
      src={url}
      width={size}
      height={Math.round(size * 320 / 280)}
      alt={alt ?? `肥仔 · ${meta.name} · ${STATE_ALT[state]}`}
      className={[
        'fatboy',
        `fatboy--${character}`,
        `fatboy--state-${state}`,
        animCls,
        className ?? '',
      ].filter(Boolean).join(' ')}
      style={{
        display: 'inline-block',
        userSelect: 'none',
        pointerEvents: 'none',
        ...style,
      }}
      draggable={false}
    />
  );
};

// =====================================================
//  BACKWARD COMPATIBLE ALIASES
// =====================================================
export const FatboyAvatar: React.FC<Omit<FatboyProps, 'character'>> = (props) => (
  <Fatboy {...props} character="default" />
);

export const FatboyCharacter: React.FC<Omit<FatboyProps, 'state'>> = (props) => (
  <Fatboy {...props} state="default" />
);

// =====================================================
//  STATE INFERENCE FROM APP CONTEXT
// =====================================================
export interface FatboyContext {
  page:
    | 'home' | 'quest-prepare' | 'quest-running' | 'quest-victory'
    | 'awaiting-rating' | 'achievements' | 'shop' | 'parent-panel' | 'settings';
  remainingMinutes?: number;
  idleMinutes?: number;
  isCelebrating?: boolean;
  hourOfDay?: number;
}

export function inferFatboyState(ctx: FatboyContext): FatboyState {
  if (ctx.isCelebrating) return 'celebrate';
  switch (ctx.page) {
    case 'home':
      if ((ctx.idleMinutes ?? 0) > 10) return 'sleeping';
      if ((ctx.hourOfDay ?? 12) >= 22 || (ctx.hourOfDay ?? 12) < 6) return 'sleeping';
      return 'default';
    case 'quest-prepare':   return 'focused';
    case 'quest-running':   return (ctx.remainingMinutes ?? 99) < 5 ? 'tense' : 'focused';
    case 'quest-victory':   return 'victory';
    case 'awaiting-rating': return 'resting';
    case 'achievements':
    case 'shop':            return 'thinking';
    default:                return 'default';
  }
}

export default Fatboy;

/**
 * Suggested CSS (paste into global stylesheet):
 *
 * @keyframes fb-breathe      { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
 * @keyframes fb-breathe-slow { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
 * @keyframes fb-bounce       { 0%{transform:translateY(0) scale(1)} 30%{transform:translateY(-22px) scale(1.06)} 60%{transform:translateY(0) scale(.98)} 100%{transform:translateY(0) scale(1)} }
 * @keyframes fb-bouncing     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
 * @keyframes fb-wobble       { 0%,100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
 * @keyframes fb-shake        { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
 * @keyframes fb-sleepbob     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
 *
 * .fatboy--breathe      { animation: fb-breathe      3.2s ease-in-out infinite; transform-origin: 50% 85%; }
 * .fatboy--breathe-slow { animation: fb-breathe-slow 4.5s ease-in-out infinite; transform-origin: 50% 85%; }
 * .fatboy--bounce       { animation: fb-bounce       1.4s cubic-bezier(.34,1.56,.64,1) 1; }
 * .fatboy--bouncing     { animation: fb-bouncing     2.2s ease-in-out infinite; }
 * .fatboy--wobble       { animation: fb-wobble       1.4s ease-in-out infinite; transform-origin: 50% 90%; }
 * .fatboy--shake        { animation: fb-shake        0.45s ease-in-out infinite; }
 * .fatboy--sleepbob     { animation: fb-sleepbob     3.4s ease-in-out infinite; }
 */
