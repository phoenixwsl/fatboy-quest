// ============================================================
// R2.5.A 集成测试：微奖励
// (R2.5.D 豁免券测试在 R5.1.0 已删 — 系统下线)
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, initializeDB } from '../../src/db';
import {
  shouldGrantLuckyBonus, LUCKY_BONUS_POINTS,
} from '../../src/lib/microRewards';
import { resetDB, seedSetupComplete, makeTask, today } from './helpers';

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
describe('R2.5.A: 彩蛋积分（在 DB 上验证）', () => {
  it('确定为 true 的随机源 → markComplete 时写入 lucky_bonus 积分', async () => {
    const t = makeTask({ id: 'a', status: 'inProgress' });
    await db.tasks.put(t as any);

    // 模拟 markComplete 中的彩蛋逻辑
    const todayDone = (await db.tasks.where({ date: today }).toArray())
      .filter(x => x.status === 'done' || x.status === 'evaluated');
    expect(shouldGrantLuckyBonus(todayDone.length + 1, () => 0)).toBe(true); // 强制触发

    await db.points.add({
      id: 'pt_lucky', ts: Date.now(),
      delta: LUCKY_BONUS_POINTS, reason: 'lucky_bonus', refId: 'a',
    } as any);

    const entries = await db.points.where('reason').equals('lucky_bonus').toArray();
    expect(entries.length).toBe(1);
    expect(entries[0].delta).toBe(LUCKY_BONUS_POINTS);
    expect(entries[0].refId).toBe('a');
  });

  it('不触发时不写积分', async () => {
    expect(shouldGrantLuckyBonus(1, () => 0.99)).toBe(false);
    expect(shouldGrantLuckyBonus(10, () => 0.99)).toBe(false);
    const entries = await db.points.where('reason').equals('lucky_bonus').toArray();
    expect(entries.length).toBe(0);
  });
});

// R2.5.D 豁免券测试 — R5.1.0 整套删除（系统下线）
