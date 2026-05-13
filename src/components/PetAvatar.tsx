// R2.2: PetAvatar 现在是 Fatboy v4 的薄包装层。
// 保留旧的 props（skinId / mood / bobbing），同时暴露新的 props（state / character）
// 让新代码可以精确控制 Fatboy 状态。
import { Fatboy, type FatboyState, type FatboyCharacterId } from './fatboy/Fatboy';
import { migrateSkinId } from '../lib/skins';
import { SKINS } from '../lib/skins';

export type Mood = 'normal' | 'happy' | 'sleepy';

interface Props {
  /** 老 API：DB 中存的 skinId（兼容 skin_xxx 也兼容新 character id） */
  skinId?: string;
  /** 新 API：直接指定 character id，覆盖 skinId 映射结果 */
  character?: FatboyCharacterId;
  /** 新 API：精确控制 state，否则按 mood 推断 */
  state?: FatboyState;
  size?: number;
  /** 老 API：弹跳；新代码请用 state / autoAnimate */
  bobbing?: boolean;
  /** 老 API：粗略表情 */
  mood?: Mood;
}

const MOOD_TO_STATE: Record<Mood, FatboyState> = {
  normal: 'default',
  happy:  'default',     // 用 default + bouncing 而不是 victory（避免太抢眼）
  sleepy: 'sleeping',
};

export function PetAvatar({
  skinId,
  character,
  state,
  size = 120,
  bobbing = true,
  mood = 'normal',
}: Props) {
  // 决定 character：character prop > skinId 映射 > 'default'
  const finalCharacter: FatboyCharacterId = character ?? migrateSkinId(skinId);
  // 决定 state：state prop > mood 映射
  const finalState: FatboyState = state ?? MOOD_TO_STATE[mood];
  // 决定动画：happy 时强制 bouncing，否则 autoAnimate 跟 state 走
  const isBouncing = mood === 'happy' || bobbing === true;
  // sleepy 总是 autoAnimate (sleepbob)
  const autoAnimate = finalState === 'sleeping' || finalState === 'tense' ||
                      finalState === 'victory' || finalState === 'celebrate';

  return (
    <Fatboy
      character={finalCharacter}
      state={finalState}
      size={size}
      bouncing={isBouncing}
      autoAnimate={autoAnimate}
    />
  );
}

export const AVAILABLE_SKINS = SKINS.map(s => s.id);
