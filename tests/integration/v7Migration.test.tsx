// ============================================================
// R4.0.0 集成测试：v6 → v7 数据库 migration
//
// 关键验证：
// 1) Task / TaskDefinition.difficulty 数字 → 'bronze'|'silver'|'gold'
// 2) ShopItem 老数据自动填 category/tier/rotationStatus 默认值
// 3) preset-dq / preset-mixue 的 stockPerWeek 改成 1
// 4) preset-guard 从 shop 移除，未使用兑换转 SkillCard
// 5) 新表（skillCards / wishingPool / witnessMoments）可读写
// 6) 没有破坏 v6 已有数据：tasks / evaluations / 老的 shop 自定义条目
//
// 这些测试假设 fake-indexeddb 已通过 setup.ts 注入。
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';

const DB_NAME = 'FatboyQuestDB_v7MigrationTest';

// 在每个 case 前清掉 DB（fake-indexeddb 全局共享）
async function nukeDB() {
  await Dexie.delete(DB_NAME);
}

// 用 v6 schema 直接打开一个老 DB 并写测试数据
async function seedV6() {
  const v6 = new Dexie(DB_NAME);
  v6.version(1).stores({
    tasks: 'id, date, status, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId',
    recipients: 'id, enabled',
    settings: 'id',
  });
  v6.version(3).stores({
    tasks: 'id, date, status, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
  });
  v6.version(4).stores({
    tasks: 'id, date, status, definitionId, taskType, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId, usedAt',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
    taskDefinitions: 'id, type, active',
    ritualLogs: 'id, kind, date',
  });
  v6.version(5).stores({
    tasks: 'id, date, status, definitionId, taskType, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId, usedAt',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
    taskDefinitions: 'id, type, active',
    ritualLogs: 'id, kind, date',
  });
  v6.version(6).stores({
    tasks: 'id, date, status, definitionId, taskType, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId, usedAt',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
    taskDefinitions: 'id, type, active',
    ritualLogs: 'id, kind, date',
    errorLogs: 'id, ts, kind',
  });
  await v6.open();

  // 各种难度数字的任务
  await v6.table('tasks').bulkAdd([
    { id: 't1', title: '默认（无 difficulty）', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'pending', createdAt: 1 },
    { id: 't2', title: '难度 1', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'pending', createdAt: 2, difficulty: 1 },
    { id: 't3', title: '难度 2', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'pending', createdAt: 3, difficulty: 2 },
    { id: 't4', title: '难度 3 已评分', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 4, difficulty: 3 },
  ]);
  await v6.table('taskDefinitions').bulkAdd([
    { id: 'd1', title: 'def 难度 2', subject: 'math', basePoints: 10, estimatedMinutes: 10, type: 'daily-required', active: true, createdAt: 1, difficulty: 2 },
    { id: 'd2', title: 'def 默认', subject: 'math', basePoints: 10, estimatedMinutes: 10, type: 'daily-required', active: true, createdAt: 2 },
  ]);

  // 老 shop（含 preset-dq / preset-mixue / preset-guard + 自定义）
  await v6.table('shop').bulkAdd([
    { id: 'preset-dq', name: 'DQ 雪糕券', emoji: '🍦', costPoints: 300, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true },
    { id: 'preset-mixue', name: '蜜雪冰城券', emoji: '🥤', costPoints: 150, stockPerWeek: 2, redeemedThisWeek: 0, weekKey: null, enabled: true },
    { id: 'preset-guard', name: '守护卡', emoji: '🛡️', costPoints: 0, stockPerWeek: 99, redeemedThisWeek: 0, weekKey: null, enabled: true },
    { id: 'custom-1', name: '小贴纸', emoji: '✨', costPoints: 80, stockPerWeek: 5, redeemedThisWeek: 0, weekKey: null, enabled: true },
    { id: 'custom-large', name: '大乐高', emoji: '🧱', costPoints: 1500, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true },
  ]);

  // 一笔已使用 + 一笔未使用 守护卡兑换
  const now = Date.now();
  await v6.table('redemptions').bulkAdd([
    { id: 'r-used', shopItemId: 'preset-guard', shopItemName: '守护卡', costPoints: 0, redeemedAt: now - 1000, usedAt: now - 500 },
    { id: 'r-unused-1', shopItemId: 'preset-guard', shopItemName: '守护卡', costPoints: 0, redeemedAt: now - 800 },
    { id: 'r-unused-2', shopItemId: 'preset-guard', shopItemName: '守护卡', costPoints: 0, redeemedAt: now - 600 },
  ]);

  v6.close();
}

// 让真正的 db.ts FatboyDB 用到这个测试 DB —— 直接在 db 模块里用同名常量太麻烦，
// 这里独立打开一个继承相同 schema 的 Dexie 实例，把 v7 升级逻辑跑一遍验证。
import type { FatboyDB } from '../../src/db';
async function openV7(): Promise<Dexie & {
  table(name: string): Dexie.Table<any, any>;
}> {
  // 重新构造一个和 src/db 同 schema 的 Dexie，直接把 v1-v7 喂给它，
  // 让它在 fake-indexeddb 上跑 upgrade。
  const db = new Dexie(DB_NAME);
  db.version(1).stores({
    tasks: 'id, date, status, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId',
    recipients: 'id, enabled',
    settings: 'id',
  });
  db.version(3).stores({
    tasks: 'id, date, status, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
  });
  db.version(4).stores({
    tasks: 'id, date, status, definitionId, taskType, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId, usedAt',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
    taskDefinitions: 'id, type, active',
    ritualLogs: 'id, kind, date',
  });
  db.version(5).stores({
    tasks: 'id, date, status, definitionId, taskType, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId, usedAt',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
    taskDefinitions: 'id, type, active',
    ritualLogs: 'id, kind, date',
  });
  db.version(6).stores({
    tasks: 'id, date, status, definitionId, taskType, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled',
    redemptions: 'id, redeemedAt, shopItemId, usedAt',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
    taskDefinitions: 'id, type, active',
    ritualLogs: 'id, kind, date',
    errorLogs: 'id, ts, kind',
  });
  // v7 — 复制自 src/db/index.ts（保持同步！）
  db.version(7).stores({
    tasks: 'id, date, status, definitionId, taskType, [date+status]',
    evaluations: 'id, taskId, evaluatedAt',
    schedules: 'id, date, round',
    points: 'id, ts, reason',
    streak: 'id', pet: 'id',
    badges: 'id, unlockedAt',
    shop: 'id, enabled, category, rotationStatus',
    redemptions: 'id, redeemedAt, shopItemId, usedAt',
    recipients: 'id, enabled',
    settings: 'id',
    templateHidden: 'title, hiddenAt',
    taskDefinitions: 'id, type, active',
    ritualLogs: 'id, kind, date',
    errorLogs: 'id, ts, kind',
    skillCards: 'id, type, earnedAt, expiresAt, usedAt',
    wishingPool: 'id',
    witnessMoments: 'id, ts, fromRecipientId',
  }).upgrade(async (tx) => {
    const DIFFICULTY_MAP: Record<number, 'bronze' | 'silver' | 'gold'> = {
      1: 'bronze', 2: 'silver', 3: 'gold',
    };
    const remapDiff = (v: unknown): 'bronze' | 'silver' | 'gold' => {
      if (typeof v === 'number') return DIFFICULTY_MAP[v] ?? 'bronze';
      if (v === 'bronze' || v === 'silver' || v === 'gold') return v;
      return 'bronze';
    };
    const tasks = await tx.table('tasks').toArray();
    for (const t of tasks) {
      if (t.difficulty !== undefined && typeof t.difficulty === 'number') {
        await tx.table('tasks').update(t.id, { difficulty: remapDiff(t.difficulty) });
      }
    }
    const defs = await tx.table('taskDefinitions').toArray();
    for (const d of defs) {
      if (d.difficulty !== undefined && typeof d.difficulty === 'number') {
        await tx.table('taskDefinitions').update(d.id, { difficulty: remapDiff(d.difficulty) });
      }
    }
    const shopItems = await tx.table('shop').toArray();
    for (const s of shopItems) {
      const updates: any = {};
      if (s.category === undefined) updates.category = 'food';
      if (s.tier === undefined) {
        updates.tier = (s.costPoints ?? 0) >= 1000 ? 'long'
                     : (s.costPoints ?? 0) >= 200  ? 'mid'
                     : 'instant';
      }
      if (s.rotationStatus === undefined) updates.rotationStatus = 'displayed';
      if (s.tags === undefined) updates.tags = [];
      if (s.id === 'preset-dq')    updates.stockPerWeek = 1;
      if (s.id === 'preset-mixue') updates.stockPerWeek = 1;
      if (Object.keys(updates).length > 0) {
        await tx.table('shop').update(s.id, updates);
      }
    }
    const guard = shopItems.find((s: any) => s.id === 'preset-guard');
    if (guard) {
      const guardRedemptions = await tx
        .table('redemptions')
        .where('shopItemId').equals('preset-guard')
        .toArray();
      const now = Date.now();
      const THIRTY_DAYS = 30 * 24 * 3600 * 1000;
      for (const r of guardRedemptions) {
        if (!r.usedAt) {
          const earnedAt = r.redeemedAt ?? now;
          await tx.table('skillCards').add({
            id: 'sk_' + Math.random().toString(36).slice(2, 10) + earnedAt,
            type: 'guard',
            source: 'migration-from-preset-guard',
            earnedAt,
            expiresAt: earnedAt + THIRTY_DAYS,
          });
        }
      }
      await tx.table('shop').delete('preset-guard');
    }
  });

  await db.open();
  return db as any;
}

beforeEach(async () => {
  await nukeDB();
});

describe('v7 migration: difficulty 1|2|3 → bronze|silver|gold', () => {
  it('converts numeric difficulty on tasks', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const tasks = await db.table('tasks').toArray();
      const byId = new Map(tasks.map((t: any) => [t.id, t]));
      expect((byId.get('t1') as any).difficulty).toBeUndefined();          // 老数据无 difficulty 不动
      expect((byId.get('t2') as any).difficulty).toBe('bronze');
      expect((byId.get('t3') as any).difficulty).toBe('silver');
      expect((byId.get('t4') as any).difficulty).toBe('gold');
    } finally { db.close(); }
  });

  it('converts numeric difficulty on taskDefinitions', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const defs = await db.table('taskDefinitions').toArray();
      const byId = new Map(defs.map((d: any) => [d.id, d]));
      expect((byId.get('d1') as any).difficulty).toBe('silver');
      expect((byId.get('d2') as any).difficulty).toBeUndefined();
    } finally { db.close(); }
  });
});

describe('v7 migration: ShopItem default fields + preset adjustments', () => {
  it('fills category/tier/rotationStatus/tags defaults', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const items = await db.table('shop').toArray();
      const dq = items.find((i: any) => i.id === 'preset-dq')!;
      expect(dq.category).toBe('food');
      expect(dq.tier).toBe('mid');               // 300 → mid
      expect(dq.rotationStatus).toBe('displayed');
      expect(dq.tags).toEqual([]);

      const mx = items.find((i: any) => i.id === 'preset-mixue')!;
      expect(mx.tier).toBe('instant');           // 150 → instant

      const big = items.find((i: any) => i.id === 'custom-large')!;
      expect(big.tier).toBe('long');             // 1500 → long
    } finally { db.close(); }
  });

  it('clamps DQ and 蜜雪 stockPerWeek to 1', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const dq = await db.table('shop').get('preset-dq');
      const mx = await db.table('shop').get('preset-mixue');
      expect(dq.stockPerWeek).toBe(1);
      expect(mx.stockPerWeek).toBe(1);
    } finally { db.close(); }
  });

  it('does NOT touch user-custom shop items', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const custom = await db.table('shop').get('custom-1');
      expect(custom.stockPerWeek).toBe(5);     // 不改
      expect(custom.costPoints).toBe(80);      // 不改
      expect(custom.category).toBe('food');    // 但补默认
    } finally { db.close(); }
  });
});

describe('v7 migration: preset-guard removed, unused redemptions → SkillCard', () => {
  it('removes preset-guard from shop', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const guard = await db.table('shop').get('preset-guard');
      expect(guard).toBeUndefined();
    } finally { db.close(); }
  });

  it('migrates unused redemptions to skillCards (already-used ones skipped)', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const cards = await db.table('skillCards').toArray();
      // 2 unused redemptions → 2 skill cards. 1 used redemption → 0.
      expect(cards).toHaveLength(2);
      for (const c of cards) {
        expect(c.type).toBe('guard');
        expect(c.source).toBe('migration-from-preset-guard');
        expect(c.expiresAt).toBeGreaterThan(c.earnedAt);
      }
    } finally { db.close(); }
  });

  it('keeps the redemption history intact (audit trail)', async () => {
    await seedV6();
    const db = await openV7();
    try {
      const reds = await db.table('redemptions').toArray();
      expect(reds).toHaveLength(3);  // 不删兑换历史
    } finally { db.close(); }
  });
});

describe('v7 migration: new tables exist and are usable', () => {
  it('skillCards / wishingPool / witnessMoments are open and writable', async () => {
    await seedV6();
    const db = await openV7();
    try {
      await db.table('wishingPool').put({
        id: 'singleton', shopItemId: 'x', openedAt: 1, startBonusPoints: 0,
        currentProgress: 0, targetPoints: 100, autoStreamRatio: 0.5, lockedUntil: 1,
      });
      const got = await db.table('wishingPool').get('singleton');
      expect(got).toBeTruthy();

      await db.table('witnessMoments').add({
        id: 'w1', ts: Date.now(), text: 'test', emoji: '🌟',
        fromRecipientId: 'preset-mom', fromLabel: '妈妈',
      });
      const wits = await db.table('witnessMoments').toArray();
      expect(wits).toHaveLength(1);
    } finally { db.close(); }
  });
});
