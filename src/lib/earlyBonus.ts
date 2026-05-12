// ============================================================
// 提前完成奖励（质量门槛版）
// 规则（来自需求）：
//   - 只有质量评分 >= 4 星才有奖励
//   - 奖励 = floor(节省分钟 × 0.5)，封顶 10 分
//   - 节省分钟 = max(0, estimated - effectiveActualMinutes)
//   - effectiveActualMinutes = elapsed - paused
//   - 如果用过延时（即原计划时间已超），可能 effective > estimated，没奖励
// ============================================================

export interface EarlyBonusInput {
  estimatedMinutes: number;
  actualStartedAt?: number;
  completedAt?: number;
  pauseSecondsUsed?: number;
  qualityStars: number;
}

export function earlyBonus(input: EarlyBonusInput): number {
  if (input.qualityStars < 4) return 0;
  if (input.actualStartedAt === undefined || input.completedAt === undefined) return 0;

  const elapsedMs = input.completedAt - input.actualStartedAt;
  const pauseMs = (input.pauseSecondsUsed ?? 0) * 1000;
  const effectiveMs = Math.max(0, elapsedMs - pauseMs);
  const effectiveMin = effectiveMs / 60000;

  const saved = input.estimatedMinutes - effectiveMin;
  if (saved <= 0) return 0;

  return Math.min(10, Math.round(saved * 0.5));
}

/**
 * 给评分页用的"工作摘要"，描述这项任务的执行情况
 */
export interface ExecutionSummary {
  elapsedMinutes: number;       // 总耗时
  effectiveMinutes: number;     // 扣除暂停
  estimatedMinutes: number;
  savedMinutes: number;         // 正数=提前，负数=超时
  pauseMinutes: number;
  extendMinutes: number;
  pauseCount: number;
  extendCount: number;
  undoCount: number;
  isOnTime: boolean;            // 没超时也没延时 → 算按时
}

export function summarizeExecution(t: {
  estimatedMinutes: number;
  actualStartedAt?: number;
  completedAt?: number;
  pauseSecondsUsed?: number;
  pauseCount?: number;
  extendCount?: number;
  extendMinutesTotal?: number;
  undoCount?: number;
}): ExecutionSummary {
  const elapsedMs = (t.actualStartedAt !== undefined && t.completedAt !== undefined)
    ? (t.completedAt - t.actualStartedAt) : 0;
  const pauseSec = t.pauseSecondsUsed ?? 0;
  const effectiveMs = Math.max(0, elapsedMs - pauseSec * 1000);
  const elapsedMin = elapsedMs / 60000;
  const effectiveMin = effectiveMs / 60000;
  const saved = t.estimatedMinutes - effectiveMin;
  return {
    elapsedMinutes: Math.round(elapsedMin),
    effectiveMinutes: Math.round(effectiveMin),
    estimatedMinutes: t.estimatedMinutes,
    savedMinutes: Math.round(saved),
    pauseMinutes: Math.round(pauseSec / 60),
    extendMinutes: t.extendMinutesTotal ?? 0,
    pauseCount: t.pauseCount ?? 0,
    extendCount: t.extendCount ?? 0,
    undoCount: t.undoCount ?? 0,
    isOnTime: (t.extendCount ?? 0) === 0 && saved >= 0,
  };
}
