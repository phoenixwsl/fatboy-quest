// 测试：仅重置当前任务状态（保留历史）
import { describe, it, expect } from 'vitest';
import {
  planCurrentStateReset, isResetNeeded,
  taskResetPatch, scheduleResetPatch,
} from '../src/lib/reset';
import type { Task, Schedule } from '../src/types';

const t = (overrides: Partial<Task> = {}): Task => ({
  id: 'task_' + Math.random(),
  title: 'X', date: '2026-05-13', basePoints: 20, estimatedMinutes: 25,
  subject: 'math', status: 'pending', createdAt: 0,
  ...overrides,
});

const sch = (overrides: Partial<Schedule> = {}): Schedule => ({
  id: 'sch_' + Math.random(),
  date: '2026-05-13', round: 1, items: [],
  ...overrides,
});

describe('planCurrentStateReset', () => {
  it('returns empty plan when no inFlight', () => {
    const plan = planCurrentStateReset(
      [t({ status: 'evaluated' }), t({ status: 'done' }), t({ status: 'pending' })],
      [],
    );
    expect(plan.taskIdsToReset).toHaveLength(0);
    expect(plan.scheduleIdsToUncomplete).toHaveLength(0);
  });

  it('resets only scheduled / inProgress tasks', () => {
    const plan = planCurrentStateReset([
      t({ id: 'a', status: 'scheduled' }),
      t({ id: 'b', status: 'inProgress' }),
      t({ id: 'c', status: 'done' }),       // 历史，不能动
      t({ id: 'd', status: 'evaluated' }),  // 历史，不能动
      t({ id: 'e', status: 'pending' }),    // 已经 pending，不需要
    ], []);
    expect(plan.taskIdsToReset.sort()).toEqual(['a', 'b']);
  });

  it('uncompletes only schedules with inFlight tasks', () => {
    const tasks = [
      t({ id: 'a', status: 'scheduled' }),
      t({ id: 'b', status: 'evaluated' }),
    ];
    const schedules = [
      // 包含 'a' (inFlight) 且 completedAt 已设 → 应清除
      sch({ id: 's1', lockedAt: 100, completedAt: 200,
        items: [{ kind: 'task', taskId: 'a', startMinute: 0, durationMinutes: 25 }] }),
      // 只包含 'b' (历史) 且 completedAt 已设 → 保留（这是真实历史完成）
      sch({ id: 's2', lockedAt: 100, completedAt: 200,
        items: [{ kind: 'task', taskId: 'b', startMinute: 0, durationMinutes: 25 }] }),
      // 没有 completedAt → 本来就活动着，不动
      sch({ id: 's3', lockedAt: 100,
        items: [{ kind: 'task', taskId: 'a', startMinute: 0, durationMinutes: 25 }] }),
    ];
    const plan = planCurrentStateReset(tasks, schedules);
    expect(plan.scheduleIdsToUncomplete).toEqual(['s1']);
  });

  it('preserves historical schedules with all tasks done', () => {
    const tasks = [
      t({ id: 'a', status: 'evaluated' }),
      t({ id: 'b', status: 'evaluated' }),
    ];
    const schedules = [
      sch({ id: 's1', lockedAt: 100, completedAt: 200,
        items: [
          { kind: 'task', taskId: 'a', startMinute: 0, durationMinutes: 25 },
          { kind: 'task', taskId: 'b', startMinute: 30, durationMinutes: 25 },
        ] }),
    ];
    const plan = planCurrentStateReset(tasks, schedules);
    expect(plan.scheduleIdsToUncomplete).toHaveLength(0);
    expect(plan.taskIdsToReset).toHaveLength(0);
  });

  it('handles cross-date tasks (all inFlight reset, regardless of date)', () => {
    const plan = planCurrentStateReset([
      t({ id: 'today', date: '2026-05-13', status: 'scheduled' }),
      t({ id: 'yesterday', date: '2026-05-12', status: 'inProgress' }),
      t({ id: 'lastweek', date: '2026-05-06', status: 'scheduled' }),
    ], []);
    expect(plan.taskIdsToReset.sort()).toEqual(['lastweek', 'today', 'yesterday']);
  });
});

describe('isResetNeeded', () => {
  it('true if any tasks to reset', () => {
    expect(isResetNeeded({ taskIdsToReset: ['x'], scheduleIdsToUncomplete: [] })).toBe(true);
  });
  it('true if any schedule to uncomplete', () => {
    expect(isResetNeeded({ taskIdsToReset: [], scheduleIdsToUncomplete: ['s'] })).toBe(true);
  });
  it('false when both empty', () => {
    expect(isResetNeeded({ taskIdsToReset: [], scheduleIdsToUncomplete: [] })).toBe(false);
  });
});

describe('taskResetPatch / scheduleResetPatch (history preservation)', () => {
  it('task reset patch sets status pending and clears runtime', () => {
    const patch = taskResetPatch();
    expect(patch.status).toBe('pending');
    expect(patch.actualStartedAt).toBeUndefined();
    expect(patch.completedAt).toBeUndefined();
    expect(patch.firstEncounteredAt).toBeUndefined();
    expect(patch.startNagSentAt).toBeUndefined();
  });

  it('task reset patch does NOT touch basePoints / title / date / id', () => {
    const patch = taskResetPatch();
    expect(patch).not.toHaveProperty('basePoints');
    expect(patch).not.toHaveProperty('title');
    expect(patch).not.toHaveProperty('date');
    expect(patch).not.toHaveProperty('id');
  });

  it('schedule reset patch clears only completed-state fields', () => {
    const patch = scheduleResetPatch();
    expect(patch.completedAt).toBeUndefined();
    expect(patch.comboPeakInRound).toBeUndefined();
    expect(patch.comboBonusPoints).toBeUndefined();
    // 不动 lockedAt / items / date / round
    expect(patch).not.toHaveProperty('lockedAt');
    expect(patch).not.toHaveProperty('items');
    expect(patch).not.toHaveProperty('date');
  });
});

describe('history preservation (high-level invariant)', () => {
  it('NEVER touches evaluations / points / pet / badges / shop tables', () => {
    // 这是个语义检查 - planCurrentStateReset 只返回 task/schedule 的 id
    // 调用方应当只往这两个表写。这条测试通过类型约束保证签名不变
    const plan = planCurrentStateReset([], []);
    expect(Object.keys(plan).sort()).toEqual(['scheduleIdsToUncomplete', 'taskIdsToReset']);
  });
});
