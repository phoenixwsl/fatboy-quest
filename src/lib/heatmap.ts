// 7 天热力图状态计算
import type { Task } from '../types';
import { addDays, todayString } from './time';

export type HeatStatus = 'none' | 'partial' | 'full' | 'perfect';

export interface HeatCell {
  date: string;
  status: HeatStatus;
  completed: number;
  total: number;
}

export function compute7DayHeatmap(allTasks: Task[], today = todayString()): HeatCell[] {
  const out: HeatCell[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today, -i);
    const tasksForDay = allTasks.filter(t => t.date === date);
    const completed = tasksForDay.filter(t => t.status === 'done' || t.status === 'evaluated').length;
    const total = tasksForDay.length;
    let status: HeatStatus = 'none';
    if (total > 0) {
      if (completed === 0) status = 'none';
      else if (completed < total) status = 'partial';
      else status = 'full';
    }
    out.push({ date, status, completed, total });
  }
  return out;
}

export const HEAT_COLORS: Record<HeatStatus, string> = {
  none: 'bg-white/10',
  partial: 'bg-emerald-500/30',
  full: 'bg-emerald-500/70',
  perfect: 'bg-amber-400',
};
