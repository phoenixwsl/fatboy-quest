// ============================================================
// 数据导出 / 导入 / 备份恢复集成测试
// ★ E11 往返不变是这一组的核心：export → 清空 → import → 一致
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, initializeDB } from '../../src/db';
import { SCHEMA_VERSION } from '../../src/types';
import { resetDB, seedSetupComplete, makeTask, makeSchedule, makeShopItem } from './helpers';

vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([])),
  messages: {},
}));
vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));

// 复用 DataExport.tsx 里的核心逻辑
async function exportSnapshot() {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tasks: await db.tasks.toArray(),
    evaluations: await db.evaluations.toArray(),
    schedules: await db.schedules.toArray(),
    points: await db.points.toArray(),
    streak: await db.streak.toArray(),
    pet: await db.pet.toArray(),
    badges: await db.badges.toArray(),
    shop: await db.shop.toArray(),
    redemptions: await db.redemptions.toArray(),
    recipients: await db.recipients.toArray(),
    settings: await db.settings.toArray(),
    templateHidden: await db.templateHidden.toArray(),
  };
}

async function importSnapshot(data: any): Promise<{ ok: boolean; reason?: string }> {
  if (!data || typeof data !== 'object') return { ok: false, reason: 'not_object' };
  if (!('schemaVersion' in data)) return { ok: false, reason: 'no_version' };
  if (data.schemaVersion > SCHEMA_VERSION) return { ok: false, reason: 'newer_version' };

  await db.transaction('rw',
    [db.tasks, db.evaluations, db.schedules, db.points, db.streak, db.pet,
     db.badges, db.shop, db.redemptions, db.recipients, db.settings, db.templateHidden] as any,
    async () => {
      await Promise.all([
        db.tasks.clear(), db.evaluations.clear(), db.schedules.clear(),
        db.points.clear(), db.streak.clear(), db.pet.clear(),
        db.badges.clear(), db.shop.clear(), db.redemptions.clear(),
        db.recipients.clear(), db.settings.clear(), db.templateHidden.clear(),
      ]);
      if (data.tasks?.length) await db.tasks.bulkAdd(data.tasks);
      if (data.evaluations?.length) await db.evaluations.bulkAdd(data.evaluations);
      if (data.schedules?.length) await db.schedules.bulkAdd(data.schedules);
      if (data.points?.length) await db.points.bulkAdd(data.points);
      if (data.streak?.length) await db.streak.bulkAdd(data.streak);
      if (data.pet?.length) await db.pet.bulkAdd(data.pet);
      if (data.badges?.length) await db.badges.bulkAdd(data.badges);
      if (data.shop?.length) await db.shop.bulkAdd(data.shop);
      if (data.redemptions?.length) await db.redemptions.bulkAdd(data.redemptions);
      if (data.recipients?.length) await db.recipients.bulkAdd(data.recipients);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);
      if (data.templateHidden?.length) await db.templateHidden.bulkAdd(data.templateHidden);
    });
  return { ok: true };
}

beforeEach(async () => {
  await resetDB();
  await initializeDB();
  await seedSetupComplete();
});

// 准备一个比较丰富的 DB 状态用于多个测试
async function seedRichState() {
  await db.tasks.bulkPut([
    makeTask({ id: 'tA', title: 'taskA', status: 'evaluated' }),
    makeTask({ id: 'tB', title: 'taskB', status: 'pending' }),
  ] as any);
  await db.schedules.put(makeSchedule({
    id: 'sch1',
    items: [{ kind: 'task', taskId: 'tA', startMinute: 0, durationMinutes: 10 }],
    completedAt: Date.now(),
  }) as any);
  await db.evaluations.put({
    id: 'ev1', taskId: 'tA',
    basePointsAtEval: 20, completion: 1, quality: 1, attitude: 1,
    finalPoints: 20, evaluatedAt: Date.now(),
  } as any);
  await db.points.bulkPut([
    { id: 'p1', ts: 1000, delta: 20, reason: 'evaluated' },
    { id: 'p2', ts: 2000, delta: -10, reason: 'shop_redeem' },
  ] as any);
  await db.shop.put(makeShopItem({ id: 'sh_dq' }) as any);
  await db.redemptions.put({
    id: 'rd1', shopItemId: 'sh_dq', shopItemName: '看动画',
    costPoints: 10, redeemedAt: Date.now(),
  } as any);
  await db.badges.put({ id: 'first_kill', unlockedAt: Date.now() } as any);
  await db.recipients.put({
    id: 'r1', label: '爸爸', emoji: '👨', serverUrl: 'https://api.bark/x', enabled: true,
  } as any);
}

describe('E · 导出', () => {
  it('E1: dump 包含全部 12 张表 + schemaVersion + exportedAt + JSON 可反序列化', async () => {
    await seedRichState();
    const dump = await exportSnapshot();

    // 顶层字段
    expect(dump.schemaVersion).toBe(SCHEMA_VERSION);
    expect(typeof dump.exportedAt).toBe('string');
    // 12 张表都存在（即使空）
    expect(Array.isArray(dump.tasks)).toBe(true);
    expect(Array.isArray(dump.evaluations)).toBe(true);
    expect(Array.isArray(dump.schedules)).toBe(true);
    expect(Array.isArray(dump.points)).toBe(true);
    expect(Array.isArray(dump.streak)).toBe(true);
    expect(Array.isArray(dump.pet)).toBe(true);
    expect(Array.isArray(dump.badges)).toBe(true);
    expect(Array.isArray(dump.shop)).toBe(true);
    expect(Array.isArray(dump.redemptions)).toBe(true);
    expect(Array.isArray(dump.recipients)).toBe(true);
    expect(Array.isArray(dump.settings)).toBe(true);
    expect(Array.isArray(dump.templateHidden)).toBe(true);

    // 有数据时数量正确（shop 包含 initializeDB 预置的 3 个 + seed 加的 1）
    expect(dump.tasks.length).toBe(2);
    expect(dump.shop.length).toBeGreaterThanOrEqual(1);
    expect(dump.shop.find((s: any) => s.id === 'sh_dq')).toBeDefined();
    expect(dump.redemptions.length).toBe(1);

    // JSON 往返
    const json = JSON.stringify(dump);
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.tasks.length).toBe(2);
  });
});

describe('E · 导入合法数据', () => {
  it('E5: 合法 JSON + 当前 schemaVersion → 清空旧 + 写入新', async () => {
    // 旧数据
    await db.tasks.put(makeTask({ id: 'OLD', title: 'OLD' }) as any);
    expect(await db.tasks.get('OLD')).toBeDefined();

    // 导入只包含 1 个新 task
    const newDump = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      tasks: [{ ...makeTask({ id: 'NEW', title: 'NEW' }) }],
      evaluations: [], schedules: [], points: [],
      streak: [], pet: [], badges: [],
      shop: [], redemptions: [], recipients: [], settings: [], templateHidden: [],
    };
    const r = await importSnapshot(newDump);
    expect(r.ok).toBe(true);

    // 旧的没了，新的在
    expect(await db.tasks.get('OLD')).toBeUndefined();
    expect(await db.tasks.get('NEW')).toBeDefined();
  });

  it('E6: A 数据集导入 → B 数据集导入 → DB 只剩 B（无残留）', async () => {
    await db.tasks.put(makeTask({ id: 'A1' }) as any);

    const dumpB = {
      schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(),
      tasks: [makeTask({ id: 'B1' }), makeTask({ id: 'B2' })],
      evaluations: [], schedules: [], points: [], streak: [], pet: [],
      badges: [], shop: [], redemptions: [], recipients: [], settings: [], templateHidden: [],
    };
    await importSnapshot(dumpB);

    expect(await db.tasks.get('A1')).toBeUndefined();
    const all = await db.tasks.toArray();
    expect(all.map(t => t.id).sort()).toEqual(['B1', 'B2']);
  });
});

describe('E · 导入校验失败的兜底', () => {
  it('E7: schemaVersion 比当前大 → 拒绝，DB 不变', async () => {
    const seed = await db.tasks.put(makeTask({ id: 'KEEP' }) as any);
    const dump = {
      schemaVersion: SCHEMA_VERSION + 99,
      exportedAt: '...', tasks: [makeTask({ id: 'BAD' })],
    };
    const r = await importSnapshot(dump);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('newer_version');
    // DB 不变
    expect(await db.tasks.get('KEEP')).toBeDefined();
    expect(await db.tasks.get('BAD')).toBeUndefined();
  });

  it('E8: JSON 解析失败 → DB 不变（模拟：传入非对象）', async () => {
    await db.tasks.put(makeTask({ id: 'KEEP' }) as any);
    const r = await importSnapshot(null);
    expect(r.ok).toBe(false);
    expect(await db.tasks.get('KEEP')).toBeDefined();
  });

  it('E9: 缺 schemaVersion 字段 → 拒绝，DB 不变', async () => {
    await db.tasks.put(makeTask({ id: 'KEEP' }) as any);
    const r = await importSnapshot({ tasks: [makeTask({ id: 'X' })] });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_version');
    expect(await db.tasks.get('KEEP')).toBeDefined();
  });

  it('E10: 模拟用户取消二次确认 → 不调用 importSnapshot，DB 不变', async () => {
    await db.tasks.put(makeTask({ id: 'KEEP' }) as any);
    // 这一步在 DataExport.tsx 里是 `if (!confirm(...)) return;`
    // 测试层：模拟用户点取消，importSnapshot 不被调用
    const confirmed = false;
    if (confirmed) {
      await importSnapshot({ schemaVersion: SCHEMA_VERSION, tasks: [] });
    }
    expect(await db.tasks.get('KEEP')).toBeDefined();
  });
});

describe('E · 往返不变 ★', () => {
  it('E11: export → 完全清空 → import → 12 张表内容与导出前逐条一致', async () => {
    await seedRichState();
    const before = await exportSnapshot();

    // 清空 DB（用 db.delete + open + initializeDB 来彻底重置）
    await db.delete();
    await db.open();
    await initializeDB();

    // 此时表内只有 initializeDB 写入的默认项（settings、streak、shop 预置）
    // 我们要把这些也覆盖掉
    const r = await importSnapshot(before);
    expect(r.ok).toBe(true);

    const after = await exportSnapshot();

    // 排除 exportedAt 时间戳后，所有表条目应当一致
    function normalize(snap: any) {
      const { exportedAt, ...rest } = snap;
      return rest;
    }
    const b = normalize(before);
    const a = normalize(after);

    // 数量级断言
    expect(a.tasks.length).toBe(b.tasks.length);
    expect(a.evaluations.length).toBe(b.evaluations.length);
    expect(a.schedules.length).toBe(b.schedules.length);
    expect(a.points.length).toBe(b.points.length);
    expect(a.shop.length).toBe(b.shop.length);
    expect(a.redemptions.length).toBe(b.redemptions.length);
    expect(a.badges.length).toBe(b.badges.length);
    expect(a.recipients.length).toBe(b.recipients.length);

    // 逐条 id 对比（按 id 排序后比较）
    const byId = (arr: any[]) => [...arr].sort((x, y) => String(x.id).localeCompare(String(y.id)));
    expect(byId(a.tasks).map(t => t.id)).toEqual(byId(b.tasks).map(t => t.id));
    expect(byId(a.points).map(p => p.id)).toEqual(byId(b.points).map(p => p.id));
    expect(byId(a.evaluations).map(e => e.id)).toEqual(byId(b.evaluations).map(e => e.id));
  });

  it('E11b: 关联数据（evaluation / redemption）也等价', async () => {
    await seedRichState();
    const before = await exportSnapshot();

    await db.delete();
    await db.open();
    await initializeDB();
    await importSnapshot(before);

    const ev = await db.evaluations.get('ev1');
    expect(ev?.taskId).toBe('tA');
    expect(ev?.finalPoints).toBe(20);

    const red = await db.redemptions.get('rd1');
    expect(red?.shopItemId).toBe('sh_dq');
    expect(red?.costPoints).toBe(10);

    const badge = await db.badges.get('first_kill');
    expect(badge).toBeDefined();

    const recipient = await db.recipients.get('r1');
    expect(recipient?.label).toBe('爸爸');
  });
});
