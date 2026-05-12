import Dexie, { type Table } from 'dexie';
import type {
  Task, Evaluation, Schedule, PointsEntry, StreakState, Pet,
  Badge, ShopItem, Redemption, BarkRecipient, Settings,
} from '../types';
import { SCHEMA_VERSION } from '../types';

// ============================================================
// IndexedDB schema (Dexie)
// 升级规则：
//   - 字段新增（非索引）：可以直接改 types，老数据 undefined 字段会被代码默认值处理
//   - 索引变化或表结构变化：bump 版本号，在 version(n).upgrade() 里写迁移
// ============================================================

export class FatboyDB extends Dexie {
  tasks!: Table<Task, string>;
  evaluations!: Table<Evaluation, string>;
  schedules!: Table<Schedule, string>;
  points!: Table<PointsEntry, string>;
  streak!: Table<StreakState, 'singleton'>;
  pet!: Table<Pet, 'singleton'>;
  badges!: Table<Badge, string>;
  shop!: Table<ShopItem, string>;
  redemptions!: Table<Redemption, string>;
  recipients!: Table<BarkRecipient, string>;
  settings!: Table<Settings, 'singleton'>;

  constructor() {
    super('FatboyQuestDB');

    // Version 1: initial schema
    this.version(1).stores({
      tasks: 'id, date, status, [date+status]',
      evaluations: 'id, taskId, evaluatedAt',
      schedules: 'id, date, round',
      points: 'id, ts, reason',
      streak: 'id',
      pet: 'id',
      badges: 'id, unlockedAt',
      shop: 'id, enabled',
      redemptions: 'id, redeemedAt, shopItemId',
      recipients: 'id, enabled',
      settings: 'id',
    });

    // 未来版本在这里追加：
    // this.version(2).stores({...}).upgrade(async tx => { ... })
  }
}

export const db = new FatboyDB();

// ============================================================
// 初始化：第一次打开时填入默认值
// ============================================================
export async function initializeDB() {
  const existing = await db.settings.get('singleton');
  if (existing) {
    // 已初始化，仅做兼容性补丁
    if (existing.schemaVersion < SCHEMA_VERSION) {
      await db.settings.update('singleton', { schemaVersion: SCHEMA_VERSION });
    }
    return;
  }

  await db.settings.put({
    id: 'singleton',
    schemaVersion: SCHEMA_VERSION,
    pin: '',
    securityQuestion: '',
    securityAnswer: '',
    themeId: 'space',
    notificationsEnabled: false,
    childName: '肥仔',
    setupComplete: false,
  });

  await db.streak.put({
    id: 'singleton',
    currentStreak: 0,
    longestStreak: 0,
    lastFullDate: null,
    guardCards: 0,
    lastWeeklyGiftWeek: null,
  });

  // 预置奖励商店
  await db.shop.bulkPut([
    {
      id: 'preset-dq',
      name: 'DQ 雪糕券',
      emoji: '🍦',
      costPoints: 300,
      stockPerWeek: 1,
      redeemedThisWeek: 0,
      weekKey: null,
      enabled: true,
    },
    {
      id: 'preset-mixue',
      name: '蜜雪冰城券',
      emoji: '🥤',
      costPoints: 150,
      stockPerWeek: 2,
      redeemedThisWeek: 0,
      weekKey: null,
      enabled: true,
    },
    {
      id: 'preset-guard',
      name: '守护卡（保护连击）',
      emoji: '🛡️',
      costPoints: 0, // 由代码动态算
      stockPerWeek: 99,
      redeemedThisWeek: 0,
      weekKey: null,
      enabled: true,
    },
  ]);
}

// 简单密保答案哈希（不是为了对抗专业攻击，仅防止小孩偷看）
export function hashAnswer(answer: string): string {
  let h = 0;
  const s = answer.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `h_${h}`;
}
