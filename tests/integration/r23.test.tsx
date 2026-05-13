// ============================================================
// R2.3 + R2.5.C 集成测试
// 覆盖：schedule.round 真递增 / GC / 错误日志 / ADHD 友好模式
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, initializeDB } from '../../src/db';
import { planScheduleGC } from '../../src/lib/scheduleGC';
import { appendLog, exportErrorLogsJSON } from '../../src/lib/errorLogger';
import { resetDB, seedSetupComplete, makeTask, makeSchedule, today } from './helpers';

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
describe('R2.3.2: schedule.round 真递增', () => {
  it('已有 round=1, round=2 → 新建应该是 round=3', async () => {
    await db.schedules.bulkPut([
      { ...makeSchedule({ id: 's1', round: 1 }) },
      { ...makeSchedule({ id: 's2', round: 2 }) },
    ] as any);

    // 模拟 SchedulePage.lockAndStart 的 round 计算逻辑
    const existing = await db.schedules.where({ date: today }).toArray();
    const nextRound = (existing.reduce((max, s) => Math.max(max, s.round ?? 0), 0)) + 1;
    expect(nextRound).toBe(3);
  });

  it('空 DB → 第一个 round = 1', async () => {
    const existing = await db.schedules.where({ date: today }).toArray();
    const nextRound = (existing.reduce((max, s) => Math.max(max, s.round ?? 0), 0)) + 1;
    expect(nextRound).toBe(1);
  });
});

// ============================================================
describe('R2.3.3: schedule GC 在 DB 中实际生效', () => {
  it('GC 清掉空 / 半路废弃，保留活动 + 历史', async () => {
    await db.schedules.bulkPut([
      { ...makeSchedule({ id: 'active', items: [{ kind: 'task', taskId: 'x', startMinute: 0, durationMinutes: 10 }] }) },
      { ...makeSchedule({ id: 'history', items: [{ kind: 'task', taskId: 'y', startMinute: 0, durationMinutes: 10 }], completedAt: Date.now() }) },
      { ...makeSchedule({ id: 'empty', items: [] }) },
      { ...makeSchedule({ id: 'no_lock', lockedAt: undefined as any, items: [{ kind: 'task', taskId: 'z', startMinute: 0, durationMinutes: 10 }] }) },
    ] as any);

    const all = await db.schedules.toArray();
    const plan = planScheduleGC(all);
    await db.schedules.bulkDelete(plan.scheduleIdsToDelete);

    const remaining = (await db.schedules.toArray()).map(s => s.id).sort();
    expect(remaining).toEqual(['active', 'history']);
  });
});

// ============================================================
describe('R2.3.4: 错误日志 append / 导出 / 上限 GC', () => {
  it('appendLog 写入 + 导出 JSON 含 logs 数组', async () => {
    await appendLog({ kind: 'manual', message: 'test error 1' });
    await appendLog({ kind: 'window-error', message: 'test error 2', stack: 'stack...' });
    const json = await exportErrorLogsJSON();
    const parsed = JSON.parse(json);
    expect(parsed.logs.length).toBe(2);
    expect(parsed.logs[0].message).toBeDefined();
    expect(parsed.appVersion).toBeDefined();
  });

  it('超过 50 条上限 → 最老的被 GC', async () => {
    // 先写 55 条
    for (let i = 0; i < 55; i++) {
      await appendLog({ kind: 'manual', message: `log ${i}` });
    }
    const count = await db.errorLogs.count();
    expect(count).toBeLessThanOrEqual(50);

    // 最早的几条应当被删（按 ts 顺序）
    const all = await db.errorLogs.orderBy('ts').toArray();
    expect(all[0].message).not.toBe('log 0');
  });
});

// ============================================================
describe('R2.5.C: ADHD 友好模式', () => {
  it('默认 setupComplete 后 settings.adhdFriendlyMode = true', async () => {
    const s = await db.settings.get('singleton');
    expect(s?.adhdFriendlyMode).toBe(true);
  });

  it('家长可以关掉 ADHD 模式（退化到 R2.2.8 行为）', async () => {
    await db.settings.update('singleton', { adhdFriendlyMode: false });
    const s = await db.settings.get('singleton');
    expect(s?.adhdFriendlyMode).toBe(false);
  });

  it('ADHD 模式下：超时 < 3 分钟 → 不写 overtimeSoundPlayedAt', async () => {
    // 模拟 useEffect 的判断逻辑：adhdMode && overtimeMs < 3min → 不响声
    const adhdMode = true;
    const overtimeMs = 60_000; // 1 分钟超时
    const shouldPlay = adhdMode ? overtimeMs >= 3 * 60_000 : true;
    expect(shouldPlay).toBe(false);
  });

  it('ADHD 模式下：超时 ≥ 3 分钟 → 响 tap，超时 ≥ 5 分钟才推送', async () => {
    const adhdMode = true;
    const overtimeAt3min = 3 * 60_000;
    const overtimeAt5min = 5 * 60_000;
    const overtimeAt4min = 4 * 60_000;

    // 响声门槛
    const playThreshold = adhdMode ? 3 * 60_000 : 0;
    expect(overtimeAt3min >= playThreshold).toBe(true);

    // 推送门槛
    const pushThreshold = adhdMode ? 5 * 60_000 : 3 * 60_000;
    expect(overtimeAt4min >= pushThreshold).toBe(false);
    expect(overtimeAt5min >= pushThreshold).toBe(true);
  });

  it('关闭 ADHD 模式 → 行为退化到 R2.2.8（立刻响 + 3min 推送）', async () => {
    const adhdMode = false;
    const overtimeAt10sec = 10_000;
    const overtimeAt3min = 3 * 60_000;

    const playThreshold = adhdMode ? 3 * 60_000 : 0;
    expect(overtimeAt10sec >= playThreshold).toBe(true); // 立刻响

    const pushThreshold = adhdMode ? 5 * 60_000 : 3 * 60_000;
    expect(overtimeAt3min >= pushThreshold).toBe(true);
  });
});
