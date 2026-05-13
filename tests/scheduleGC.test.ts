// R2.3.3 单元测试：schedule GC 计划纯函数
import { describe, it, expect } from 'vitest';
import { planScheduleGC } from '../src/lib/scheduleGC';
import type { Schedule } from '../src/types';

const sch = (over: Partial<Schedule> = {}): Schedule => ({
  id: 's_' + Math.random(),
  date: '2026-05-13', round: 1, items: [],
  lockedAt: Date.now(),
  ...over,
} as Schedule);

describe('planScheduleGC', () => {
  it('没 lockedAt 的 → 删', () => {
    const plan = planScheduleGC([sch({ id: 'a', lockedAt: undefined as any })]);
    expect(plan.scheduleIdsToDelete).toEqual(['a']);
  });

  it('lockedAt 有但 items 空 → 删', () => {
    const plan = planScheduleGC([sch({ id: 'b', items: [] })]);
    expect(plan.scheduleIdsToDelete).toEqual(['b']);
  });

  it('lockedAt && !completedAt && 有 items → 保留（活动中）', () => {
    const plan = planScheduleGC([
      sch({ id: 'active', items: [{ kind: 'task', taskId: 't', startMinute: 0, durationMinutes: 10 }] }),
    ]);
    expect(plan.scheduleIdsToDelete).toEqual([]);
  });

  it('lockedAt && completedAt && 有 items → 保留（历史）', () => {
    const plan = planScheduleGC([
      sch({
        id: 'done',
        completedAt: Date.now(),
        items: [{ kind: 'task', taskId: 't', startMinute: 0, durationMinutes: 10 }],
      }),
    ]);
    expect(plan.scheduleIdsToDelete).toEqual([]);
  });

  it('混合：3 个 schedule → 只删空的 / 半路废弃的', () => {
    const plan = planScheduleGC([
      sch({ id: 'good', items: [{ kind: 'task', taskId: 't', startMinute: 0, durationMinutes: 10 }] }),
      sch({ id: 'empty', items: [] }),
      sch({ id: 'no_lock', lockedAt: undefined as any, items: [{ kind: 'task', taskId: 't', startMinute: 0, durationMinutes: 10 }] }),
    ]);
    expect(plan.scheduleIdsToDelete.sort()).toEqual(['empty', 'no_lock']);
  });
});
