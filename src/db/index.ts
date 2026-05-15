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

    // v8 (R5.0.0): 反馈优化
    //   - ShopCategory: 'plant' / 'decor' → 'toy'
    //   - 内置 13 件预置示例（幂等：只补缺失 id，不覆盖已删除的）
    this.version(8).stores({
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
      skillCards: 'id, type, earnedAt, expiresAt, usedAt',
      wishingPool: 'id',
      witnessMoments: 'id, ts, fromRecipientId',
    }).upgrade(async (tx) => {
      // 1) plant / decor → toy
      const items = await tx.table('shop').toArray();
      for (const it of items) {
        if (it.category === 'plant' || it.category === 'decor') {
          await tx.table('shop').update(it.id, { category: 'toy' });
        }
      }
      // 2) 幂等 seed 13 件预置（只补缺失，不覆盖删除）
      const existing = new Set(items.map((i: ShopItem) => i.id));
      const presets = buildPresetItems(Date.now());
      for (const p of presets) {
        if (!existing.has(p.id)) {
          await tx.table('shop').add(p);
        }
      }
    });
  }
}

// ============================================================
// R5.0.0: 13 件预置示例
// 覆盖：3 时间档 + 2 分类 + 4 种位置（普通 / 许愿池 / 条件解锁 / 锁定区）
// + 5 种 unlock kind 中的 4 种（streak 留给家长自己创建）
//
// 幂等：基于 id 判断，只 add 缺失的；用户删除后不会重新加。
// ============================================================
export function buildPresetItems(now: number): ShopItem[] {
  const base = (id: string, name: string, emoji: string, category: 'toy' | 'food', tier: 'instant' | 'mid' | 'long', costPoints: number, stockPerWeek: number, tags: string[] = []): ShopItem => ({
    id, name, emoji,
    costPoints, stockPerWeek,
    redeemedThisWeek: 0, weekKey: null, enabled: true,
    category, tier, rotationStatus: 'displayed',
    lastDisplayedAt: now,
    tags,
  });
  return [
    // === 积分通路 - 即时档 ===
    base('preset-dq',     'DQ 雪糕券',       '🍦', 'food', 'mid',     300, 1, ['零食']),
    base('preset-mixue',  '蜜雪冰城券',      '🥤', 'food', 'instant', 150, 1, ['饮品']),
    base('preset-choco',  '一颗巧克力',      '🍫', 'food', 'instant',  30, 5, ['零食']),
    base('preset-screen', '30 分钟自由屏幕', '🎮', 'food', 'instant', 100, 2, ['特权']),
    base('preset-menu',   '今晚菜单我选',    '🍱', 'food', 'instant',  50, 3, ['特权']),

    // === 积分通路 - 中期档 ===
    base('preset-plush',  '小毛绒抓一个',    '🧸', 'toy', 'mid', 250, 1, ['毛绒']),
    base('preset-stress', '解压玩具盲盒',    '🎨', 'toy', 'mid', 280, 1, ['解压']),

    // === 积分通路 - 大件 wishable ===
    { ...base('preset-lego-mid', '中型乐高套装', '🧱', 'toy', 'long', 600, 0, ['乐高']),
      isWishable: true, stockPerSeason: 1 },
    { ...base('preset-lego-big', '大乐高套装', '🚀', 'toy', 'long', 4500, 0, ['乐高']),
      isWishable: true, stockPerSeason: 1 },

    // === 条件解锁通路（unlockCondition）===
    { ...base('preset-trophy-5k', '5000 分纪念奖杯', '🏆', 'toy', 'long', 0, 0, ['收藏品']),
      costPoints: 0,
      unlockCondition: { kind: 'lifetimePoints', threshold: 5000 } },

    { ...base('preset-focus', '「专注者」徽章', '🎯', 'toy', 'long', 0, 0, ['收藏品']),
      costPoints: 0,
      unlockCondition: { kind: 'longTask', count: 10, window: 'lifetime' } },

    { ...base('preset-perfect', '「完美匠」奖品', '💎', 'toy', 'long', 0, 0, ['收藏品']),
      costPoints: 0,
      unlockCondition: { kind: 'perfectTask', count: 5, window: 'lifetime' } },

    // === 锁定区"???" ===
    { ...base('preset-mystery', '神秘奖励', '🎁', 'toy', 'long', 0, 0, []),
      costPoints: 0,
      isLocked: true,
      unlockLifetimeThreshold: 3000 },
  ];
}

export const db = new FatboyDB();

// R4.2.0: 心愿池流入 hook —— 任何 PointsEntry insert 后，正向 delta 异步
// 流入 wishingPool（如果开了）。用 setTimeout(0) 调度到当前事务提交后执行，
// 避开"wishingPool 不在 transaction 范围"问题。
//
// 失败静默：如果用户没开心愿池或心愿池表读取失败，不影响主积分流。
db.points.hook('creating', (_pk, obj: any) => {
  const delta = obj?.delta;
  if (typeof delta === 'number' && delta > 0) {
    setTimeout(async () => {
      try {
        const { streamPoints } = await import('../lib/wishingPool');
        await streamPoints(db, delta);
      } catch {
        /* silent */
      }
    }, 0);
  }
});

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

  // R5.0.0: 13 件预置示例（覆盖所有机制）—— 详见 buildPresetItems
  await db.shop.bulkPut(buildPresetItems(Date.now()));

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
