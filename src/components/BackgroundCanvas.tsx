// R3.0 §1.4 + R3.1: 按主题 + 时段挂载背景动效
//   - cozy + day/dusk  → Clouds（漂浮云）
//   - cozy + night     → NightStars
//   - starry           → NightStars（始终）
//   - mecha            → CircuitGrid（霓虹电路网格）
import { Clouds } from './Clouds';
import { NightStars } from './NightStars';
import { CircuitGrid } from './CircuitGrid';

export type TimePeriod = 'day' | 'dusk' | 'night';
export type ThemeId = 'cozy' | 'starry' | 'mecha';

export function BackgroundCanvas({
  period,
  theme = 'cozy',
}: {
  period: TimePeriod;
  theme?: ThemeId;
}) {
  if (theme === 'mecha') return <CircuitGrid />;
  if (theme === 'starry') return <NightStars />;
  // cozy
  if (period === 'night') return <NightStars />;
  return <Clouds />;
}
