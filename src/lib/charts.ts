// ============================================================
// 图表数据聚合（家长 Dashboard 用）
// 4 张图：
//   1. 14 天积分柱状
//   2. 30 天科目时间占比
//   3. 30 天实际 vs 预估折线
//   4. 评分维度雷达图（最近 N 项 vs 上一窗口）
// ============================================================

import type { Evaluation, PointsEntry, SubjectType, Task } from '../types';
import { addDays, todayString } from './time';

// ---- 图 1: 每日积分（最近 N 天） ----
export interface DailyPoint {
  date: string;          // YYYY-MM-DD
  earned: number;        // 当日正向积分（不含消费）
  spent: number;         // 当日消费
}

export function dailyPoints(entries: PointsEntry[], days = 14, today = todayString()): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const dayStart = new Date(d + 'T00:00:00').getTime();
    const dayEnd = dayStart + 86400000;
    let earned = 0, spent = 0;
    for (const e of entries) {
      if (e.ts < dayStart || e.ts >= dayEnd) continue;
      if (e.delta > 0) earned += e.delta;
      else spent += -e.delta;
    }
    out.push({ date: d, earned, spent });
  }
  return out;
}

// ---- 图 2: 科目时间占比（最近 N 天） ----
export interface SubjectShare {
  subject: SubjectType;
  minutes: number;
  count: number;
  label: string;
}

const SUBJECT_LABELS: Record<SubjectType, string> = {
  math: '数学', chinese: '语文', english: '英语',
  reading: '阅读', writing: '练字', other: '其他',
};

export function subjectDistribution(tasks: Task[], days = 30, today = todayString()): SubjectShare[] {
  const cutoff = addDays(today, -days + 1);
  const filtered = tasks.filter(t =>
    (t.status === 'done' || t.status === 'evaluated') && t.date >= cutoff,
  );
  const map = new Map<SubjectType, { minutes: number; count: number }>();
  for (const t of filtered) {
    const cur = map.get(t.subject) ?? { minutes: 0, count: 0 };
    cur.minutes += t.estimatedMinutes;
    cur.count += 1;
    map.set(t.subject, cur);
  }
  return Array.from(map.entries())
    .map(([subject, v]) => ({ subject, ...v, label: SUBJECT_LABELS[subject] }))
    .sort((a, b) => b.minutes - a.minutes);
}

// ---- 图 3: 实际 vs 预估比例（每完成一项一个数据点） ----
export interface AccuracyPoint {
  date: string;
  taskTitle: string;
  estimatedMinutes: number;
  effectiveMinutes: number;
  ratio: number;                    // effective/estimated, 1.0=准时
}

export function timeAccuracy(tasks: Task[], days = 30, today = todayString()): AccuracyPoint[] {
  const cutoff = addDays(today, -days + 1);
  const done = tasks.filter(t =>
    (t.status === 'done' || t.status === 'evaluated') &&
    t.date >= cutoff &&
    t.actualStartedAt !== undefined && t.completedAt !== undefined,
  );
  return done
    .sort((a, b) => (a.completedAt! - b.completedAt!))
    .map(t => {
      const elapsedMs = t.completedAt! - t.actualStartedAt!;
      const pauseMs = (t.pauseSecondsUsed ?? 0) * 1000;
      const effectiveMin = Math.max(0, (elapsedMs - pauseMs) / 60000);
      const ratio = t.estimatedMinutes > 0 ? effectiveMin / t.estimatedMinutes : 0;
      return {
        date: t.date,
        taskTitle: t.title,
        estimatedMinutes: t.estimatedMinutes,
        effectiveMinutes: Math.round(effectiveMin),
        ratio: Math.round(ratio * 100) / 100,
      };
    });
}

// ---- 图 4: 评分维度均值（雷达） ----
export interface RatingSnapshot {
  completion: number;
  quality: number;
  attitude: number;
  count: number;
}

export function ratingSnapshot(evaluations: Evaluation[], lastN = 10): { current: RatingSnapshot; previous: RatingSnapshot } {
  const sorted = [...evaluations].sort((a, b) => b.evaluatedAt - a.evaluatedAt);
  const current = sorted.slice(0, lastN);
  const previous = sorted.slice(lastN, lastN * 2);

  function avg(list: Evaluation[]): RatingSnapshot {
    if (list.length === 0) return { completion: 0, quality: 0, attitude: 0, count: 0 };
    let c = 0, q = 0, a = 0;
    for (const e of list) { c += e.completion; q += e.quality; a += e.attitude; }
    return {
      completion: c / list.length,
      quality: q / list.length,
      attitude: a / list.length,
      count: list.length,
    };
  }

  return { current: avg(current), previous: avg(previous) };
}
