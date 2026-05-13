// ============================================================
// R2.4.4: 家长 Dashboard 的 3 个核心洞察卡片纯函数
//   - streakTrend：连击是否在涨
//   - weeklyPointsTrend：本周积分 vs 上周
//   - lowestEfficiencySubject：哪类任务效率最低（actualMin / estMin 最高的学科）
// 纯函数，便于单测和 UI 渲染解耦。
// ============================================================
import type { Task, PointsEntry, StreakState } from '../types';
import { addDays, todayString } from './time';

// ---------- 1. 连击趋势 ----------
export interface StreakTrend {
  current: number;
  longest: number;
  status: 'growing' | 'stable' | 'broken' | 'fresh'; // 在涨 / 平稳 / 刚断 / 全新
}

export function streakTrend(s: StreakState | undefined, today = todayString()): StreakTrend {
  if (!s) return { current: 0, longest: 0, status: 'fresh' };
  const yesterday = addDays(today, -1);
  if (s.currentStreak === 0) return { current: 0, longest: s.longestStreak ?? 0, status: 'fresh' };
  // 昨天完成 → 还在涨
  if (s.lastFullDate === yesterday || s.lastFullDate === today) {
    return { current: s.currentStreak, longest: s.longestStreak ?? 0, status: 'growing' };
  }
  // 距离上次 fullDate ≥ 2 天 → broken
  if (s.lastFullDate && s.lastFullDate < yesterday) {
    return { current: s.currentStreak, longest: s.longestStreak ?? 0, status: 'broken' };
  }
  return { current: s.currentStreak, longest: s.longestStreak ?? 0, status: 'stable' };
}

// ---------- 2. 本周 vs 上周积分对比 ----------
export interface WeeklyPointsTrend {
  thisWeek: number;
  lastWeek: number;
  delta: number;
  pct: number;             // 增长百分比；上周 0 时返回 0
  direction: 'up' | 'down' | 'flat';
}

export function weeklyPointsTrend(
  points: PointsEntry[],
  today = todayString(),
): WeeklyPointsTrend {
  const thisStart = new Date(addDays(today, -6)).getTime();
  const lastStart = new Date(addDays(today, -13)).getTime();
  const lastEnd = new Date(addDays(today, -7)).getTime() + 86400_000 - 1;

  const thisWeek = points
    .filter(p => p.ts >= thisStart && p.delta > 0)
    .reduce((s, p) => s + p.delta, 0);
  const lastWeek = points
    .filter(p => p.ts >= lastStart && p.ts <= lastEnd && p.delta > 0)
    .reduce((s, p) => s + p.delta, 0);

  const delta = thisWeek - lastWeek;
  const pct = lastWeek === 0 ? 0 : Math.round((delta / lastWeek) * 100);
  const direction: 'up' | 'down' | 'flat' =
    delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  return { thisWeek, lastWeek, delta, pct, direction };
}

// ---------- 3. 学科效率（最差的）----------
export interface SubjectEfficiency {
  subject: string;
  totalEstMinutes: number;
  totalActualMinutes: number;
  ratio: number;            // actual/est；> 1 表示比预估慢
  sampleCount: number;
}

export function lowestEfficiencySubject(
  tasks: Task[],
  windowDays: number = 14,
  today = todayString(),
): SubjectEfficiency | null {
  const startTime = new Date(addDays(today, -windowDays + 1)).getTime();
  const byBucket = new Map<string, { est: number; actual: number; count: number }>();
  for (const t of tasks) {
    if (t.status !== 'evaluated' && t.status !== 'done') continue;
    if (!t.actualStartedAt || !t.completedAt) continue;
    if (t.actualStartedAt < startTime) continue;
    const actualMs = t.completedAt - t.actualStartedAt - (t.pauseSecondsUsed ?? 0) * 1000;
    if (actualMs <= 0) continue;
    const actualMin = actualMs / 60_000;
    const bucket = byBucket.get(t.subject) ?? { est: 0, actual: 0, count: 0 };
    bucket.est += t.estimatedMinutes;
    bucket.actual += actualMin;
    bucket.count += 1;
    byBucket.set(t.subject, bucket);
  }
  let worst: SubjectEfficiency | null = null;
  for (const [subject, b] of byBucket.entries()) {
    if (b.count < 2) continue;  // 样本太少不算
    const ratio = b.actual / b.est;
    const entry: SubjectEfficiency = {
      subject,
      totalEstMinutes: Math.round(b.est),
      totalActualMinutes: Math.round(b.actual),
      ratio: Math.round(ratio * 100) / 100,
      sampleCount: b.count,
    };
    if (!worst || entry.ratio > worst.ratio) worst = entry;
  }
  return worst;
}
