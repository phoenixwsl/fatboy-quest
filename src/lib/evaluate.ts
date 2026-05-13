// ============================================================
// R2.4.1 / R2.4.2: 抽出评分的共用逻辑，让快速套餐 / modal 详细评分 / 批量评分
// 三种入口共用一份实现。
// 同时供集成测试直接调用，不必 mount UI。
// ============================================================
import type { FatboyDB } from '../db';
import type { Task } from '../types';
import { calcFinalPoints, makeEvaluation } from './points';
import { earlyBonus } from './earlyBonus';
import { calcCombo, comboBonusPoints } from './combo';
import { newId } from './ids';

export interface EvalInput {
  taskId: string;
  basePoints?: number;       // 不传则用 task.basePoints（孩子加的会按时长估算）
  completion: number;
  quality: number;
  attitude: number;
  note?: string;
  parentReminderForNext?: string;
}

export interface EvalResult {
  evaluationId: string;
  finalPoints: number;
  earlyBonusPoints: number;
  comboBonusPoints?: number;
}

/**
 * 智能默认基础积分：孩子加的且 basePoints=0 → 时长/2（最小 5）；其它 → task.basePoints || 20
 */
export function smartDefaultBasePoints(t: Task): number {
  if (t.createdBy === 'child' && (t.basePoints ?? 0) === 0) {
    return Math.max(5, Math.round((t.estimatedMinutes ?? 10) / 2));
  }
  return t.basePoints || 20;
}

export async function evaluateTaskOnce(
  db: FatboyDB,
  input: EvalInput,
): Promise<EvalResult> {
  const task = await db.tasks.get(input.taskId);
  if (!task) throw new Error('Task not found: ' + input.taskId);
  if (task.status !== 'done') throw new Error('Task is not in done state: ' + task.status);

  const basePoints = input.basePoints ?? smartDefaultBasePoints(task);
  const ev = makeEvaluation(
    task,
    { completion: input.completion, quality: input.quality, attitude: input.attitude },
    basePoints,
    input.note,
  );
  if (input.parentReminderForNext) ev.parentReminderForNext = input.parentReminderForNext;

  const earlyBonusPts = earlyBonus({
    estimatedMinutes: task.estimatedMinutes,
    actualStartedAt: task.actualStartedAt,
    completedAt: task.completedAt,
    pauseSecondsUsed: task.pauseSecondsUsed,
    qualityStars: input.quality,
  });

  let comboBonus = 0;

  await db.transaction('rw', db.evaluations, db.tasks, db.points, db.schedules, async () => {
    await db.evaluations.add(ev);
    await db.tasks.update(task.id, {
      status: 'evaluated',
      evaluationId: ev.id,
      earlyBonusPoints: earlyBonusPts,
    });
    // 核心积分
    await db.points.add({
      id: newId('pt'), ts: Date.now(), delta: ev.finalPoints,
      reason: 'task_evaluated', refId: task.id,
    });
    if (earlyBonusPts > 0) {
      await db.points.add({
        id: newId('pt'), ts: Date.now(), delta: earlyBonusPts,
        reason: 'early_bonus', refId: task.id,
      });
    }
    // 检查所属 schedule 是否所有任务都已评分 → combo 加分
    const schedules = await db.schedules.where({ date: task.date }).toArray();
    for (const sch of schedules) {
      if (!sch.lockedAt) continue;
      if (!sch.items.some(i => i.taskId === task.id)) continue;
      const ids = sch.items.filter(i => i.kind === 'task' && i.taskId).map(i => i.taskId!);
      const all = await db.tasks.bulkGet(ids);
      const allEvaluated = all.every(x => x?.status === 'evaluated');
      if (allEvaluated && !sch.comboBonusPoints) {
        const taskMap = new Map<string, Task>();
        for (const x of all) if (x) taskMap.set(x.id, x);
        const combo = calcCombo(sch, taskMap);
        if (combo.peak >= 2) {
          const evs = await db.evaluations.where('taskId').anyOf(combo.contributingTaskIds).toArray();
          const sumFinal = evs.reduce((s, e) => s + e.finalPoints, 0);
          const bonus = comboBonusPoints(sumFinal, combo.bonusPct);
          if (bonus > 0) {
            await db.points.add({
              id: newId('pt'), ts: Date.now(), delta: bonus,
              reason: 'combo_bonus', refId: sch.id,
            });
            await db.schedules.update(sch.id, { comboBonusPoints: bonus });
            comboBonus = bonus;
          }
        }
      }
    }
  });

  return {
    evaluationId: ev.id,
    finalPoints: ev.finalPoints,
    earlyBonusPoints: earlyBonusPts,
    comboBonusPoints: comboBonus > 0 ? comboBonus : undefined,
  };
}

// R2.4.1 快速评分套餐
export const QUICK_PRESETS = [
  { id: 'perfect', label: '🌟 完美', stars: { completion: 5, quality: 5, attitude: 5 }, tone: 'amber' as const },
  { id: 'good',    label: '👍 很好', stars: { completion: 5, quality: 5, attitude: 4 }, tone: 'emerald' as const },
  { id: 'ok',      label: '🙂 OK',  stars: { completion: 4, quality: 4, attitude: 4 }, tone: 'cyan' as const },
  { id: 'meh',     label: '💧 加油', stars: { completion: 3, quality: 3, attitude: 3 }, tone: 'rose' as const },
];
