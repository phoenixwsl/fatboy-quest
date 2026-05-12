// 贡献日历数据聚合
import type { Evaluation, PointsEntry, Task } from '../types';
import { addDays, todayString } from './time';

export type DayLevel = 0 | 1 | 2 | 3 | 4;  // 0 灰 / 1-3 绿色阶梯 / 4 金（完美）

export interface CalendarDay {
  date: string;
  level: DayLevel;
  completed: number;
  total: number;
  pointsEarned: number;
  perfectDay: boolean;
}

function computeLevel(completed: number, total: number, perfect: boolean): DayLevel {
  if (total === 0) return 0;
  if (perfect) return 4;
  const ratio = completed / total;
  if (ratio >= 1) return 3;
  if (ratio >= 0.6) return 2;
  if (ratio > 0) return 1;
  return 0;
}

export function aggregateMonth(
  tasks: Task[],
  evals: Evaluation[],
  points: PointsEntry[],
  year: number,
  month: number,                      // 1-12
): CalendarDay[] {
  const firstDay = new Date(year, month - 1, 1);
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
    const perfect = tasksForDay.length > 0 && evalsForDay.length === tasksForDay.length &&
      evalsForDay.every(e => e.completion === 5 && e.quality === 5 && e.attitude === 5);
    const pts = points.filter(p => p.delta > 0 && p.ts >= dayStart && p.ts < dayEnd)
      .reduce((s, p) => s + p.delta, 0);
    out.push({
      date, level: computeLevel(completed, tasksForDay.length, perfect),
      completed, total: tasksForDay.length, pointsEarned: pts, perfectDay: perfect,
    });
  }
  // 前面填占位（让月头从周日/周一对齐）
  const firstDow = firstDay.getDay();
  return out;
  // padding 由 UI 处理
}

export const DAY_LEVEL_COLOR: Record<DayLevel, string> = {
  0: 'bg-white/5',
  1: 'bg-emerald-500/25',
  2: 'bg-emerald-500/55',
  3: 'bg-emerald-500/85',
  4: 'bg-gradient-to-br from-amber-400 to-orange-400',
};
