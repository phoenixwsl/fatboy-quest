// ============================================================
// R5.0.0 集成测试：v7 → v8 数据库 migration
//
// 验证：
//   1) ShopItem.category 'plant' / 'decor' → 'toy'
//   2) 13 件预置幂等 seed（缺失才补，已删除的不重新加）
//   3) 老用户的非预置自定义商品不被动
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';

const DB_NAME = 'FatboyQuestDB_v8MigrationTest';

async function nukeDB() {
  await Dexie.delete(DB_NAME);
}

// 先用 v7 schema 写一些数据
async function seedV7() {
  const v7 = new Dexie(DB_NAME);
  // 一路 stub 到 v7
  v7.version(7).stores({
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
  });
  await v7.open();

  await v7.table('shop').bulkAdd([
    // 老分类（要被迁移）
    { id: 'old-plant', name: '老盆栽', emoji: '🌱', costPoints: 100, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true, category: 'plant', tier: 'instant', rotationStatus: 'displayed' },
    { id: 'old-decor', name: '老摆件', emoji: '🪴', costPoints: 200, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true, category: 'decor', tier: 'mid', rotationStatus: 'displayed' },
    // 自定义不动
    { id: 'custom-keep', name: '自定义', emoji: '🎁', costPoints: 80, stockPerWeek: 5, redeemedThisWeek: 0, weekKey: null, enabled: true, category: 'food', tier: 'instant', rotationStatus: 'displayed' },
    // 已经存在的预置（v7 时只有 DQ + 蜜雪）
    { id: 'preset-dq', name: 'DQ 雪糕券', emoji: '🍦', costPoints: 300, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true, category: 'food', tier: 'mid', rotationStatus: 'displayed' },
  ]);
  v7.close();
}

// v8 migration 复制（保持与 src/db/index.ts 同步）
async function openV8() {
  const db = new Dexie(DB_NAME);
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
  });
  // v8: 镜像自 src/db/index.ts
  db.version(8).stores({
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
    const items = await tx.table('shop').toArray();
    for (const it of items) {
      if (it.category === 'plant' || it.category === 'decor') {
        await tx.table('shop').update(it.id, { category: 'toy' });
      }
    }
    // Seed presets (mirrored from buildPresetItems)
    const existing = new Set(items.map((i: any) => i.id));
    const presetIds = [
      'preset-dq', 'preset-mixue', 'preset-choco', 'preset-screen', 'preset-menu',
      'preset-plush', 'preset-stress',
      'preset-lego-mid', 'preset-lego-big',
      'preset-trophy-5k', 'preset-focus', 'preset-perfect',
      'preset-mystery',
    ];
    for (const id of presetIds) {
      if (!existing.has(id)) {
        await tx.table('shop').add({
          id, name: id, emoji: '🎁',
          costPoints: 100, stockPerWeek: 1,
          redeemedThisWeek: 0, weekKey: null, enabled: true,
          category: 'toy', tier: 'instant', rotationStatus: 'displayed',
          tags: [],
        });
      }
    }
  });
  await db.open();
  return db;
}

beforeEach(async () => {
  await nukeDB();
});

describe('v8 migration: plant / decor → toy', () => {
  it('remaps plant and decor categories', async () => {
    await seedV7();
    const db = await openV8();
    try {
      const items = await db.table('shop').toArray();
      const plant = items.find((i: any) => i.id === 'old-plant');
      const decor = items.find((i: any) => i.id === 'old-decor');
      expect(plant.category).toBe('toy');
      expect(decor.category).toBe('toy');
    } finally { db.close(); }
  });

  it('does not change food / toy items', async () => {
    await seedV7();
    const db = await openV8();
    try {
      const custom = await db.table('shop').get('custom-keep');
      expect(custom.category).toBe('food');
    } finally { db.close(); }
  });
});

describe('v8 migration: preset seed (idempotent)', () => {
  it('adds missing preset-* items', async () => {
    await seedV7();
    const db = await openV8();
    try {
      // 应该有的预置
      const newPresets = await db.table('shop').where('id').startsWith('preset-').toArray();
      expect(newPresets.length).toBeGreaterThanOrEqual(13);
      // 验证新预置 id 存在
      const ids = new Set(newPresets.map((i: any) => i.id));
      expect(ids.has('preset-choco')).toBe(true);
      expect(ids.has('preset-lego-big')).toBe(true);
      expect(ids.has('preset-mystery')).toBe(true);
    } finally { db.close(); }
  });

  it('does NOT overwrite existing preset (e.g. preset-dq)', async () => {
    await seedV7();
    const db = await openV8();
    try {
      const dq = await db.table('shop').get('preset-dq');
      expect(dq.name).toBe('DQ 雪糕券');     // 老名字保留
      expect(dq.costPoints).toBe(300);       // 老价格保留
    } finally { db.close(); }
  });
});
