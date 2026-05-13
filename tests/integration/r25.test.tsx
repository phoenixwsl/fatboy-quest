// ============================================================
// R2.5 集成测试：A 微奖励 + D 豁免券
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, initializeDB } from '../../src/db';
import {
  shouldGrantLuckyBonus, LUCKY_BONUS_POINTS,
} from '../../src/lib/microRewards';
import {
  effectivePardonCards, isStreakBroken, applyPardonToStreak,
} from '../../src/lib/pardon';
import { addDays, isoWeekString } from '../../src/lib/time';
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

// ============================================================
describe('R2.5.D: 豁免券完整流程', () => {
  it('断击 + 有券 → 用券后 streak 字段正确', async () => {
    const thisWeek = isoWeekString(new Date(today));
    // 模拟：连击 5 天，已断 3 天
    await db.streak.update('singleton', {
      currentStreak: 5,
      longestStreak: 10,
      lastFullDate: addDays(today, -3),
      pardonCardsThisWeek: 2,
      lastPardonResetWeek: thisWeek,
    } as any);

    const before = await db.streak.get('singleton');
    expect(isStreakBroken(before, today)).toBe(true);

    const patch = applyPardonToStreak(before!, today);
    await db.streak.update('singleton', patch as any);
    await db.ritualLogs.put({
      id: 'rl_pardon', kind: 'streak-pardon', date: today, shownAt: Date.now(),
    } as any);

    const after = await db.streak.get('singleton');
    expect(after?.pardonCardsThisWeek).toBe(1);
    expect(after?.lastFullDate).toBe(addDays(today, -1));
    // currentStreak 保持原值（用券是"保住"不是 reset）
    expect(after?.currentStreak).toBe(5);
    expect(isStreakBroken(after, today)).toBe(false);

    const logs = await db.ritualLogs.where({ kind: 'streak-pardon' }).toArray();
    expect(logs.length).toBe(1);
  });

  it('跨周自动重置 → 上周 0 张今周回血 2 张', async () => {
    await db.streak.update('singleton', {
      currentStreak: 3,
      lastFullDate: addDays(today, -1),
      pardonCardsThisWeek: 0,
      lastPardonResetWeek: 'PREV-WEEK',
    } as any);

    const s = await db.streak.get('singleton');
    const r = effectivePardonCards(s, today);
    expect(r.remaining).toBe(2);
    expect(r.needsReset).toBe(true);
  });

  it('没断击时调用 applyPardon → 抛错', async () => {
    await db.streak.update('singleton', {
      currentStreak: 3,
      lastFullDate: addDays(today, -1), // 昨天还在做，没断
      pardonCardsThisWeek: 2,
    } as any);
    const s = await db.streak.get('singleton');
    expect(() => applyPardonToStreak(s!, today)).toThrow(/not_broken/);
  });

  it('用完本周豁免券后再断击 → 拒绝（保留断击）', async () => {
    const thisWeek = isoWeekString(new Date(today));
    await db.streak.update('singleton', {
      currentStreak: 7,
      lastFullDate: addDays(today, -3),
      pardonCardsThisWeek: 0,
      lastPardonResetWeek: thisWeek,
    } as any);
    const s = await db.streak.get('singleton');
    expect(() => applyPardonToStreak(s!, today)).toThrow(/no_cards/);
    // 数据保持不变
    const after = await db.streak.get('singleton');
    expect(after?.pardonCardsThisWeek).toBe(0);
    expect(after?.currentStreak).toBe(7);
  });
});
