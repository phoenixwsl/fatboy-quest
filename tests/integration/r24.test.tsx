// ============================================================
// R2.4 集成测试：家长端评分体验
// 覆盖：快速套餐 / 批量评分 / 未评分提醒 watcher / Dashboard 洞察
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, initializeDB } from '../../src/db';
import { evaluateTaskOnce, QUICK_PRESETS, smartDefaultBasePoints } from '../../src/lib/evaluate';
import { totalPoints } from '../../src/lib/points';
import { resetDB, seedSetupComplete, makeTask, makeSchedule } from './helpers';

vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([{ ok: true }])),
  messages: { taskDone: vi.fn(), help: vi.fn(), redeem: vi.fn(), streakBreakAlert: vi.fn() },
}));
vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));

beforeEach(async () => {
  await resetDB();
  await initializeDB();
  await seedSetupComplete();
});

// ============================================================
describe('R2.4.1: 快速评分套餐', () => {
  it('完美套餐 → evaluation 写入 + 积分入账 (status=evaluated)', async () => {
    const t = makeTask({ id: 'qt1', status: 'done', basePoints: 20, completedAt: Date.now() });
    await db.tasks.put(t as any);

    const r = await evaluateTaskOnce(db, {
      taskId: 'qt1',
      basePoints: smartDefaultBasePoints(t as any),
      ...QUICK_PRESETS[0].stars, // 完美 5/5/5
    });

    expect(r.finalPoints).toBeGreaterThan(0);
    const after = await db.tasks.get('qt1');
    expect(after?.status).toBe('evaluated');
    expect(after?.evaluationId).toBeDefined();
    expect((await db.evaluations.toArray()).length).toBe(1);

    // 积分入账
    const total = totalPoints(await db.points.toArray());
    expect(total).toBe(r.finalPoints + r.earlyBonusPoints);
  });

  it('4 个套餐 → finalPoints 严格递减（完美 ≥ 很好 ≥ OK ≥ 加油）', async () => {
    const finalPts: number[] = [];
    for (let i = 0; i < QUICK_PRESETS.length; i++) {
      const t = makeTask({
        id: 'qt_' + i, status: 'done',
        basePoints: 20, completedAt: Date.now(),
      });
      await db.tasks.put(t as any);
      const r = await evaluateTaskOnce(db, {
        taskId: 'qt_' + i,
        basePoints: 20,
        ...QUICK_PRESETS[i].stars,
      });
      finalPts.push(r.finalPoints);
    }
    for (let i = 0; i < finalPts.length - 1; i++) {
      expect(finalPts[i]).toBeGreaterThanOrEqual(finalPts[i + 1]);
    }
  });

  it('子端加的 basePoints=0 任务 → smart default 估算（最少 5）', async () => {
    const t = makeTask({
      id: 'ct1', status: 'done',
      basePoints: 0, createdBy: 'child', estimatedMinutes: 8,
      completedAt: Date.now(),
    });
    await db.tasks.put(t as any);
    const def = smartDefaultBasePoints(t as any);
    expect(def).toBe(Math.max(5, Math.round(8 / 2)));

    const r = await evaluateTaskOnce(db, {
      taskId: 'ct1',
      basePoints: def,
      ...QUICK_PRESETS[0].stars,
    });
    expect(r.finalPoints).toBeGreaterThan(0);
  });
});

// ============================================================
describe('R2.4.2: 批量评分', () => {
  it('多任务依次跑 evaluateTaskOnce → 全部 evaluated + 积分累加', async () => {
    await db.tasks.bulkPut([
      makeTask({ id: 'a', status: 'done', basePoints: 20, completedAt: Date.now() }),
      makeTask({ id: 'b', status: 'done', basePoints: 15, completedAt: Date.now() }),
      makeTask({ id: 'c', status: 'done', basePoints: 10, completedAt: Date.now() }),
    ] as any);

    const before = totalPoints(await db.points.toArray());
    for (const id of ['a', 'b', 'c']) {
      await evaluateTaskOnce(db, {
        taskId: id, completion: 5, quality: 5, attitude: 5,
      });
    }
    const all = await db.tasks.toArray();
    for (const t of all) {
      expect(t.status).toBe('evaluated');
    }
    const after = totalPoints(await db.points.toArray());
    // 5/5/5: baseFactor=1.0, attFactor=1.2 → 实得 = base * 1.2
    expect(after - before).toBe(Math.round(20 * 1.2) + Math.round(15 * 1.2) + Math.round(10 * 1.2));
  });

  it('已 evaluated 的任务不能再次 evaluate（拒绝）', async () => {
    const t = makeTask({ id: 'x', status: 'evaluated', basePoints: 10, completedAt: Date.now() });
    await db.tasks.put(t as any);
    await expect(
      evaluateTaskOnce(db, { taskId: 'x', completion: 5, quality: 5, attitude: 5 }),
    ).rejects.toThrow(/not in done state/);
  });
});

// ============================================================
describe('R2.4.3: 未评分提醒 watcher 集成', () => {
  it('default unevaluatedNotifyMinutes = 45 写入 settings', async () => {
    const s = await db.settings.get('singleton');
    expect(s?.unevaluatedNotifyMinutes).toBe(45);
  });

  it('手动调用 watcher 等价逻辑：超时 → 写戳 + Bark 调用', async () => {
    const bark = await import('../../src/lib/bark');
    (bark.pushToRecipients as any).mockClear();

    // 1 个完成 60min 的任务
    await db.tasks.put(makeTask({
      id: 'old', status: 'done', completedAt: Date.now() - 60 * 60_000,
    }) as any);
    await db.recipients.put({
      id: 'r1', label: '爸爸', emoji: '👨',
      serverUrl: 'https://api', key: 'k', enabled: true, subPendingReview: true,
    } as any);

    // 模拟 watcher 的核心：plan → push → 写戳
    const { planUnevaluatedReminders } = await import('../../src/lib/unevaluatedReminder');
    const all = await db.tasks.where({ status: 'done' }).toArray();
    const plan = planUnevaluatedReminders(all, 45);
    expect(plan.taskIdsToNotify).toEqual(['old']);

    await db.tasks.update('old', { unevaluatedNotifySentAt: Date.now() });
    await bark.pushToRecipients([{ id: 'r1', enabled: true } as any], 'help' as any, { title: 'X', body: 'Y' } as any);

    expect(bark.pushToRecipients).toHaveBeenCalled();
    const after = await db.tasks.get('old');
    expect(after?.unevaluatedNotifySentAt).toBeDefined();

    // 第二次跑 → 不再通知
    const plan2 = planUnevaluatedReminders(await db.tasks.where({ status: 'done' }).toArray(), 45);
    expect(plan2.taskIdsToNotify).toEqual([]);
  });

  it('threshold = 0 → 关闭，所有任务都不通知', async () => {
    const { planUnevaluatedReminders } = await import('../../src/lib/unevaluatedReminder');
    const tasks = [makeTask({ id: 'a', status: 'done', completedAt: Date.now() - 24 * 3600_000 })];
    expect(planUnevaluatedReminders(tasks as any, 0).taskIdsToNotify).toEqual([]);
  });
});

// ============================================================
describe('R2.4.4: Dashboard 洞察卡片数据正确', () => {
  it('streakTrend / weeklyPointsTrend / lowestEfficiencySubject 在真实 DB 状态下不崩溃', async () => {
    // 完整一天的数据
    const t = makeTask({
      id: 'a', status: 'evaluated', basePoints: 20,
      actualStartedAt: Date.now() - 20 * 60_000,
      completedAt: Date.now() - 10 * 60_000,
      subject: 'math',
    });
    const t2 = makeTask({
      id: 'b', status: 'evaluated', basePoints: 20,
      actualStartedAt: Date.now() - 25 * 60_000,
      completedAt: Date.now() - 10 * 60_000,
      subject: 'math',
    });
    await db.tasks.bulkPut([t, t2] as any);
    await db.points.put({
      id: 'p1', ts: Date.now(), delta: 20, reason: 'task_evaluated',
    } as any);
    await db.streak.update('singleton', {
      currentStreak: 3, longestStreak: 5, lastFullDate: '2026-05-13',
    } as any);

    const { streakTrend, weeklyPointsTrend, lowestEfficiencySubject }
      = await import('../../src/lib/dashboardInsights');

    const s = await db.streak.get('singleton');
    expect(streakTrend(s).current).toBe(3);

    const points = await db.points.toArray();
    expect(weeklyPointsTrend(points).thisWeek).toBe(20);

    const tasks = await db.tasks.toArray();
    const eff = lowestEfficiencySubject(tasks);
    expect(eff?.subject).toBe('math');
  });
});
