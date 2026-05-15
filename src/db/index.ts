import Dexie, { type Table } from 'dexie';
import type {
  Task, Evaluation, Schedule, PointsEntry, StreakState, Pet,
  Badge, ShopItem, Redemption, BarkRecipient, Settings, TemplateHidden,
  TaskDefinition, RitualLog, ErrorLog,
  SkillCard, WishingPool, WitnessMoment,
} from '../types';
import { SCHEMA_VERSION } from '../types';

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
  templateHidden!: Table<TemplateHidden, string>;
  taskDefinitions!: Table<TaskDefinition, string>;
  ritualLogs!: Table<RitualLog, string>;
  errorLogs!: Table<ErrorLog, string>;
  // R4.0.0 (v7): kid-rewards 商店重构基础设施 — 表声明，行为代码 R4.3.0+
  skillCards!: Table<SkillCard, string>;
  wishingPool!: Table<WishingPool, 'singleton'>;
  witnessMoments!: Table<WitnessMoment, string>;

  constructor() {
    super('FatboyQuestDB');

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

    this.version(3).stores({
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
      templateHidden: 'title, hiddenAt',
    });

    // v4
    this.version(4).stores({
      tasks: 'id, date, status, definitionId, taskType, [date+status]',
      evaluations: 'id, taskId, evaluatedAt',
      schedules: 'id, date, round',
      points: 'id, ts, reason',
      streak: 'id',
      pet: 'id',
      badges: 'id, unlockedAt',
      shop: 'id, enabled',
      redemptions: 'id, redeemedAt, shopItemId, usedAt',
      recipients: 'id, enabled',
      settings: 'id',
      templateHidden: 'title, hiddenAt',
      taskDefinitions: 'id, type, active',
      ritualLogs: 'id, kind, date',
    }).upgrade(async (tx) => {
      const recipients = await tx.table('recipients').toArray();
      for (const r of recipients) {
        await tx.table('recipients').update(r.id, {
          subTaskDone: true,    // v4: 默认开启每项通知
          subShopPurchase: r.subShopPurchase ?? true,
          subStreakAlert: r.subStreakAlert ?? true,
        });
      }
    });

    // v5: Fatboy v4 集成 - skin_xxx → Fatboy character id 迁移
    this.version(5).stores({
      // 表结构不变，仅触发 upgrade
      tasks: 'id, date, status, definitionId, taskType, [date+status]',
      evaluations: 'id, taskId, evaluatedAt',
      schedules: 'id, date, round',
      points: 'id, ts, reason',
      streak: 'id',
      pet: 'id',
      badges: 'id, unlockedAt',
      shop: 'id, enabled',
      redemptions: 'id, redeemedAt, shopItemId, usedAt',
      recipients: 'id, enabled',
      settings: 'id',
      templateHidden: 'title, hiddenAt',
      taskDefinitions: 'id, type, active',
      ritualLogs: 'id, kind, date',
    }).upgrade(async (tx) => {
      // 内联 LEGACY_SKIN_MAP 避免循环 import db→skins→Fatboy→...
      const map: Record<string, string> = {
        skin_classic: 'default', skin_explorer: 'astronaut',
        skin_cyber: 'racer', skin_rocket: 'mario',
        skin_ninja: 'ninja', skin_dino: 'knight',
        skin_mecha: 'wizard', skin_pirate: 'pirate',
      };
      const norm = (id: string | undefined): string => {
        if (!id) return 'default';
        if (map[id]) return map[id];
        return id;  // 已经是新 id 的话保持原样
      };
      const pets = await tx.table('pet').toArray();
      for (const p of pets) {
        const newSkinId = norm(p.skinId);
        const newUnlocked = Array.from(new Set([
          'default',
          ...(p.unlockedSkins ?? []).map((s: string) => norm(s)),
        ]));
        await tx.table('pet').update(p.id, {
          skinId: newSkinId,
          unlockedSkins: newUnlocked,
        });
      }
    });

    // v6 (R2.3.4): 加 errorLogs 表
    this.version(6).stores({
      tasks: 'id, date, status, definitionId, taskType, [date+status]',
      evaluations: 'id, taskId, evaluatedAt',
      schedules: 'id, date, round',
      points: 'id, ts, reason',
      streak: 'id',
      pet: 'id',
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

    // v7 (R4.0.0): kid-rewards 商店重构基础设施
    //   - 新表：skillCards / wishingPool / witnessMoments
    //   - Task/TaskDefinition.difficulty: 1|2|3 → 'bronze'|'silver'|'gold'
    //   - ShopItem 加 category/tier/rotationStatus 等字段并设默认
    //   - 预置 DQ/蜜雪 stockPerWeek 改 1
    //   - 预置 preset-guard 从 shop 移除（守护卡转 SkillCard）
    this.version(7).stores({
      tasks: 'id, date, status, definitionId, taskType, [date+status]',
      evaluations: 'id, taskId, evaluatedAt',
      schedules: 'id, date, round',
      points: 'id, ts, reason',
      streak: 'id',
      pet: 'id',
      badges: 'id, unlockedAt',
      shop: 'id, enabled, category, rotationStatus',
      redemptions: 'id, redeemedAt, shopItemId, usedAt',
      recipients: 'id, enabled',
      settings: 'id',
      templateHidden: 'title, hiddenAt',
      taskDefinitions: 'id, type, active',
      ritualLogs: 'id, kind, date',
      errorLogs: 'id, ts, kind',
      // 新表
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

      // 1. Tasks: difficulty 数字 → 字符串
      const tasks = await tx.table('tasks').toArray();
      for (const t of tasks) {
        if (t.difficulty !== undefined && typeof t.difficulty === 'number') {
          await tx.table('tasks').update(t.id, { difficulty: remapDiff(t.difficulty) });
        }
      }

      // 2. TaskDefinitions: 同上
      const defs = await tx.table('taskDefinitions').toArray();
      for (const d of defs) {
        if (d.difficulty !== undefined && typeof d.difficulty === 'number') {
          await tx.table('taskDefinitions').update(d.id, { difficulty: remapDiff(d.difficulty) });
        }
      }

      // 3. ShopItem 默认字段填充 + 预置调整
      const shopItems = await tx.table('shop').toArray();
      for (const s of shopItems) {
        const updates: Partial<ShopItem> = {};
        if (s.category === undefined) updates.category = 'food';
        if (s.tier === undefined) {
          updates.tier = (s.costPoints ?? 0) >= 1000 ? 'long'
                       : (s.costPoints ?? 0) >= 200  ? 'mid'
                       : 'instant';
        }
        if (s.rotationStatus === undefined) updates.rotationStatus = 'displayed';
        if (s.tags === undefined) updates.tags = [];
        // 预置价格/库存调整
        if (s.id === 'preset-dq')    updates.stockPerWeek = 1;
        if (s.id === 'preset-mixue') updates.stockPerWeek = 1;
        if (Object.keys(updates).length > 0) {
          await tx.table('shop').update(s.id, updates);
        }
      }

      // 4. preset-guard 从 shop 移除，未使用的兑换记录转成 SkillCard
      const guard = shopItems.find((s: ShopItem) => s.id === 'preset-guard');
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
            } as SkillCard);
          }
        }
        await tx.table('shop').delete('preset-guard');
      }
    });
  }
}

export const db = new FatboyDB();

export async function initializeDB() {
  const existing = await db.settings.get('singleton');
  if (existing) {
    if (existing.schemaVersion < SCHEMA_VERSION) {
      const patch: Partial<typeof existing> = { schemaVersion: SCHEMA_VERSION };
      if (existing.soundEnabled === undefined) patch.soundEnabled = true;
      if (existing.childCanAddTasks === undefined) patch.childCanAddTasks = true;
      if (existing.childMaxPointsPerTask === undefined) patch.childMaxPointsPerTask = 20;
      if (existing.warnMinutesBeforeEnd === undefined) patch.warnMinutesBeforeEnd = 3;
      if (existing.restEndSoundLeadSec === undefined) patch.restEndSoundLeadSec = 60;
      if (existing.helpButtonEnabled === undefined) patch.helpButtonEnabled = true;
      if (existing.weekendModeEnabled === undefined) patch.weekendModeEnabled = true;
      if (existing.eveningSummaryHour === undefined) patch.eveningSummaryHour = 21;
      if (existing.eveningSummaryMinute === undefined) patch.eveningSummaryMinute = 30;
      if (existing.streakAlertHour === undefined) patch.streakAlertHour = 19;
      if (existing.streakAlertMinute === undefined) patch.streakAlertMinute = 30;
      if (existing.sundayRitualHour === undefined) patch.sundayRitualHour = 21;
      if (existing.sundayRitualMinute === undefined) patch.sundayRitualMinute = 0;
      if (existing.soundPack === undefined) patch.soundPack = 'default';
      if (existing.developerMode === undefined) patch.developerMode = false;
      if (existing.dailyPointsGoal === undefined) patch.dailyPointsGoal = 0;
      if (existing.idleNagEnabled === undefined) patch.idleNagEnabled = true;
      if (existing.adhdFriendlyMode === undefined) patch.adhdFriendlyMode = true;
      if (existing.unevaluatedNotifyMinutes === undefined) patch.unevaluatedNotifyMinutes = 45;
      await db.settings.update('singleton', patch);
    }
    return;
  }

  await db.settings.put({
    id: 'singleton',
    schemaVersion: SCHEMA_VERSION,
    pin: '',
    securityQuestion: '',
    securityAnswer: '',
    themeId: 'cozy',                  // R3.1 默认温馨黄
    notificationsEnabled: false,
    childName: '肥仔',
    setupComplete: false,
    soundEnabled: true,
    childCanAddTasks: true,
    childMaxPointsPerTask: 20,
    warnMinutesBeforeEnd: 3,
    restEndSoundLeadSec: 60,
    helpButtonEnabled: true,
    weekendModeEnabled: true,
    eveningSummaryHour: 21,
    eveningSummaryMinute: 30,
    streakAlertHour: 19,
    streakAlertMinute: 30,
    sundayRitualHour: 21,
    sundayRitualMinute: 0,
    soundPack: 'default',
    developerMode: false,
    dailyPointsGoal: 0,
    idleNagEnabled: true,
    adhdFriendlyMode: true,
    unevaluatedNotifyMinutes: 45,
  });

  await db.streak.put({
    id: 'singleton',
    currentStreak: 0,
    longestStreak: 0,
    lastFullDate: null,
    guardCards: 0,
    lastWeeklyGiftWeek: null,
  });

  // R4.0.0 (v7): preset-guard 不再上架（守护卡迁到 SkillCard 系统、行为解锁）
  // DQ / 蜜雪 stockPerWeek=1（用户拍板），加 category/tier/rotationStatus 默认
  await db.shop.bulkPut([
    {
      id: 'preset-dq', name: 'DQ 雪糕券', emoji: '🍦',
      costPoints: 300, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true,
      category: 'food', tier: 'mid', rotationStatus: 'displayed', tags: ['零食'],
    },
    {
      id: 'preset-mixue', name: '蜜雪冰城券', emoji: '🥤',
      costPoints: 150, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true,
      category: 'food', tier: 'instant', rotationStatus: 'displayed', tags: ['饮品'],
    },
  ]);

  // R3.0.1: 内置爸爸 / 妈妈 Bark 接收人
  await ensureDefaultRecipients();
}

// R3.0.1: 内置默认 Bark 接收人（首次初始化 + 老用户兜底）
// R3.0.2: 修正 — 之前 mom / dad 的 key 写反了，加自动纠正
export async function ensureDefaultRecipients() {
  // 正确对应关系
  const MOM_KEY = 'DfjzKiUDcfdWLcnMeR6jXf';
  const DAD_KEY = 'aWEsiXKUPXgZAPNiz6r835';

  const DEFAULTS = [
    {
      id: 'preset-mom',
      label: '妈妈',
      emoji: '👩',
      serverUrl: 'https://api.day.app',
      key: MOM_KEY,
    },
    {
      id: 'preset-dad',
      label: '爸爸',
      emoji: '👨',
      serverUrl: 'https://api.day.app',
      key: DAD_KEY,
    },
  ];

  const existing = await db.recipients.toArray();

  // R3.0.2 一次性纠正：如果 preset-mom / preset-dad 存在但 key 反了 → 修
  for (const d of DEFAULTS) {
    const found = existing.find(r => r.id === d.id);
    if (found && found.key !== d.key) {
      await db.recipients.update(d.id, { key: d.key, label: d.label, emoji: d.emoji });
    }
  }

  // 首次添加（如果还没有这条预置）
  const refreshed = await db.recipients.toArray();
  const existingIds = new Set(refreshed.map(r => r.id));
  const existingKeys = new Set(refreshed.map(r => r.key));
  for (const d of DEFAULTS) {
    if (existingIds.has(d.id)) continue;
    if (existingKeys.has(d.key)) continue; // 用户自己加过同 key（自定义 id）→ 跳过
    await db.recipients.add({
      ...d,
      subTaskDone: true,
      subRoundDone: true,
      subMilestone: true,
      subPendingReview: true,
      subWeeklyReport: true,
      subHelp: true,
      subStreakAlert: true,
      subShopPurchase: true,
      enabled: true,
    } as any);
  }
}

export function hashAnswer(answer: string): string {
  let h = 0;
  const s = answer.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return `h_${h}`;
}
