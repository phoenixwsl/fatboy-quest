// ============================================================
// Combo 连击系统
// 规则（来自需求）：
//   - 一轮内"连续完成且未撤回"的任务数 = combo
//   - 撤回打断 combo（undoCount > 0 表示曾撤回过）
//   - 休息块、暂停 不打断 combo
//   - 跳过某项不做也打断 combo（轮结束时还是 pending/scheduled）
// 加成阶梯：2→5% / 3→10% / 4→20% / 5+→50%
// 加成应用于本轮 evaluated 任务的 finalPoints 之和
// ============================================================

import type { Schedule, Task } from '../types';

export interface ComboResult {
  peak: number;             // 本轮达到的最长连击
  bonusPct: number;         // 0 / 0.05 / 0.10 / 0.20 / 0.50
  contributingTaskIds: string[]; // 哪些任务进入了 peak combo
}

export function comboPctForLength(n: number): number {
  if (n >= 5) return 0.5;
  if (n >= 4) return 0.2;
  if (n >= 3) return 0.1;
  if (n >= 2) return 0.05;
  return 0;
}

/**
 * 在一轮的 schedule + tasks 上计算 combo
 * 只统计 status==='done' 或 'evaluated' 且 undoCount==0 的任务，按 schedule 顺序
 */
export function calcCombo(schedule: Schedule, tasks: Map<string, Task>): ComboResult {
  let cur = 0;
  let peak = 0;
  let curIds: string[] = [];
  let peakIds: string[] = [];

  for (const item of schedule.items) {
    if (item.kind !== 'task' || !item.taskId) continue;
    const t = tasks.get(item.taskId);
    if (!t) continue;

    const isCompleted = t.status === 'done' || t.status === 'evaluated';
    const wasUndone = (t.undoCount ?? 0) > 0;

    if (isCompleted && !wasUndone) {
      cur += 1;
      curIds.push(t.id);
      if (cur > peak) {
        peak = cur;
        peakIds = [...curIds];
      }
    } else {
      cur = 0;
      curIds = [];
    }
  }

  return {
    peak,
    bonusPct: comboPctForLength(peak),
    contributingTaskIds: peakIds,
  };
}

/**
 * 给定本轮 contributing 任务的 evaluation finalPoints 之和，算出 combo 加分
 * （未评分的任务不计入基数，combo 加分会在评分后补发或一次性发）
 */
export function comboBonusPoints(contributingEvaluatedSum: number, pct: number): number {
  return Math.round(contributingEvaluatedSum * pct);
}
