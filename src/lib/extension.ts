// ============================================================
// 延时（超时再给时间）阶梯成本
// 规则（来自需求）：
//   第 1 次：免费 +5 分钟
//   第 2 次：免费 +5 分钟
//   第 3 次：-10 积分 +10 分钟
//   第 4 次：-30 积分 +10 分钟
//   第 5 次+ ：-50 积分 +10 分钟（封顶）
// 副作用：当天已用过延时的任务，不计入"按时完成"徽章
// 何时可点：剩 < 3 分钟或已超时
// ============================================================

export interface ExtensionOffer {
  index: number;             // 第几次（从 1 开始）
  addMinutes: number;
  costPoints: number;        // 0 = 免费
  isFree: boolean;
  description: string;
}

export function nextExtensionOffer(timesUsedAlready: number): ExtensionOffer {
  const idx = timesUsedAlready + 1;
  if (idx === 1) return { index: 1, addMinutes: 5, costPoints: 0, isFree: true, description: '免费 +5 分钟' };
  if (idx === 2) return { index: 2, addMinutes: 5, costPoints: 0, isFree: true, description: '免费 +5 分钟（最后一次免费）' };
  if (idx === 3) return { index: 3, addMinutes: 10, costPoints: 10, isFree: false, description: '消耗 10 积分 +10 分钟' };
  if (idx === 4) return { index: 4, addMinutes: 10, costPoints: 30, isFree: false, description: '消耗 30 积分 +10 分钟' };
  return { index: idx, addMinutes: 10, costPoints: 50, isFree: false, description: '消耗 50 积分 +10 分钟（封顶）' };
}

/**
 * 判断当前是否可点延时（剩余时间不足 N 分钟，或已超时）
 */
export function canShowExtensionButton(
  estimatedEndAt: number,
  now: number,
  windowMinutes = 3,
): boolean {
  const remainMs = estimatedEndAt - now;
  return remainMs < windowMinutes * 60 * 1000;
}
