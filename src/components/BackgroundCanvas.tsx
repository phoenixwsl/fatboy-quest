// R3.0 §1.4: 按时段挂载不同的背景动效
//   - day / dusk → 漂浮云（Clouds.tsx）
//   - night       → 闪烁星（NightStars.tsx）
// 注：时段切换 60s 渐变由 body 上 background: linear-gradient(...) 完成；
//     本组件只管动态前景元素。
import { Clouds } from './Clouds';
import { NightStars } from './NightStars';

export type TimePeriod = 'day' | 'dusk' | 'night';

export function BackgroundCanvas({ period }: { period: TimePeriod }) {
  if (period === 'night') return <NightStars />;
  return <Clouds />;
}
