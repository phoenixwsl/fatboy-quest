// 贡献日历数据聚合 - R2.1.1: 按"当日积分"分档（5 档，参考 GitHub）+ 完美日金色覆盖
import type { Evaluation, PointsEntry, Task } from '../types';

export type DayLevel = 0 | 1 | 2 | 3 | 4;  // 0 灰 / 1-3 绿色阶梯 / 4 金（完美日）

export interface CalendarDay {
  date: string;
  level: DayLevel;
  completed: number;
  total: number;
  pointsEarned: number;
  perfectDay: boolean;
}

/**
 * R2.1.1: 颜色按"当日积分"分档
 *  - perfectDay → 直接金色（即使分不高）
 *  - 0 分 → 灰
 *  - 1-29 → 浅绿
 *  - 30-79 → 中绿
 *  - 80+ → 深绿
 */
function computeLevel(pointsEarned: number, perfect: boolean): DayLevel {
  if (perfect) return 4;
  if (pointsEarned <= 0) return 0;
  if (pointsEarned < 30) return 1;
  if (pointsEarned < 80) return 2;
  return 3;
}

export function aggregateMonth(
  tasks: Task[],
  evals: Evaluation[],
  points: PointsEntry[],
  year: number,
  month: number,                      // 1-12
): CalendarDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const out: CalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayStart = new Date(year, month - 1, d).setHours(0,0,0,0);
    const dayEnd = dayStart + 86400000;
    const tasksForDay = tasks.filter(t => t.date === date);
    const completed = tasksForDay.filter(t => t.status === 'done' || t.status === 'evaluated').length;
    const evalsForDay = evals.filter(e =>
      tasksForDay.some(t => t.id === e.taskId),
    );
    const perfect = tasksForDay.length > 0 &&
      evalsForDay.length === tasksForDay.length &&
      evalsForDay.every(e => e.completion === 5 && e.quality === 5 && e.attitude === 5);
    const pts = points.filter(p => p.delta > 0 && p.ts >= dayStart && p.ts < dayEnd)
      .reduce((s, p) => s + p.delta, 0);
    out.push({
      date,
      level: computeLevel(pts, perfect),
      completed,
      total: tasksForDay.length,
      pointsEarned: pts,
      perfectDay: perfect,
    });
  }
  return out;
}

export const DAY_LEVEL_COLOR: Record<DayLevel, string> = {
  0: 'bg-white/5',
  1: 'bg-emerald-500/25',
  2: 'bg-emerald-500/55',
  3: 'bg-emerald-500/85',
  4: 'bg-gradient-to-br from-amber-400 to-orange-400',
};

/**
 * R2.1.1: 某一天的详细任务展开数据
 */
export interface CalendarDayDetail {
  date: string;
  tasks: Array<{
    id: string;
    title: string;
    subject: string;
    status: string;
    evaluation?: Evaluation;
    earlyBonus?: number;
    childNote?: string;
  }>;
  totalPoints: number;
  comboBonus?: number;
}

export function buildDayDetail(
  date: string,
  tasks: Task[],
  evals: Evaluation[],
  points: PointsEntry[],
): CalendarDayDetail {
  const tasksForDay = tasks.filter(t => t.date === date);
  const dayStart = new Date(date + 'T00:00:00').getTime();
  const dayEnd = dayStart + 86400000;
  const detail = tasksForDay.map(t => {
    const ev = evals.find(e => e.taskId === t.id);
    const earlyBonus = points
      .filter(p => p.reason === 'early_bonus' && p.refId === t.id)
      .reduce((s, p) => s + p.delta, 0);
    return {
      id: t.id, title: t.title, subject: t.subject, status: t.status,
      evaluation: ev, earlyBonus: earlyBonus || undefined,
      childNote: t.childNote,
    };
  });
  const totalPoints = points
    .filter(p => p.delta > 0 && p.ts >= dayStart && p.ts < dayEnd)
    .reduce((s, p) => s + p.delta, 0);
  const comboBonus = points
    .filter(p => p.reason === 'combo_bonus' && p.ts >= dayStart && p.ts < dayEnd)
    .reduce((s, p) => s + p.delta, 0);
  return { date, tasks: detail, totalPoints, comboBonus: comboBonus || undefined };
}
