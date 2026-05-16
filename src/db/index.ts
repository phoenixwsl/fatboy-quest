import Dexie, { type Table } from 'dexie';
import type {
  Task, Evaluation, Schedule, PointsEntry, StreakState, Pet,
  Badge, ShopItem, Redemption, BarkRecipient, Settings, TemplateHidden,
  TaskDefinition, RitualLog, ErrorLog,
  SkillCard, WishingPool, WitnessMoment, CollectibleCard,
  GalleryImage,
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
  skillCards!: Table<SkillCard, string>;       // 券（4 种：guard/skip/mystery/extend）
  wishingPool!: Table<WishingPool, 'singleton'>; // R5.1.0 已弃用，保留声明避免破坏老 schema
  witnessMoments!: Table<WitnessMoment, string>;
  // R5.1.0: 卡牌（收藏型）
  cards!: Table<CollectibleCard, string>;
  // R5.7.0 (v10): 肥仔画廊
  galleryImages!: Table<GalleryImage, string>;

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

    // v9 (R5.1.0): 三层架构（券/卡牌/里程碑）+ 删许愿池 + 任务类型简化
    //   - 新表 cards
    //   - TaskType: normal/daily-required/weekly-min/weekly-once → once/daily/weekly
    //   - TaskDefinition: weeklyMinTimes → weeklyTimes（合并）
    //   - 已存的预置 wishingPool 数据清空（UI 不再用）
    //   - 删 streak.guardCards / pardonCardsThisWeek（豁免券系统全删）
    //   - 4 件分挡乐高预置（删 isWishable 用 condition 复合）
    this.version(9).stores({
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
      cards: 'id, type, earnedAt',
    }).upgrade(async (tx) => {
      // 1) Task.taskType 字符串映射
      const TT_MAP: Record<string, string> = {
        'normal': 'once',
        'daily-required': 'daily',
        'weekly-min': 'weekly',
        'weekly-once': 'weekly',
      };
      const tasks = await tx.table('tasks').toArray();
      for (const t of tasks) {
        if (t.taskType && TT_MAP[t.taskType]) {
          await tx.table('tasks').update(t.id, { taskType: TT_MAP[t.taskType] });
        }
      }

      // 2) TaskDefinition.type 字符串映射 + weeklyMinTimes → weeklyTimes
      const defs = await tx.table('taskDefinitions').toArray();
      for (const d of defs) {
        const updates: any = {};
        if (d.type && TT_MAP[d.type]) updates.type = TT_MAP[d.type];
        if (d.weeklyMinTimes !== undefined && d.weeklyTimes === undefined) {
          updates.weeklyTimes = d.weeklyMinTimes;
        }
        // weekly-once 的 weeklyTimes 设为 1（如果没设过）
        if (d.type === 'weekly-once' && updates.weeklyTimes === undefined) {
          updates.weeklyTimes = 1;
        }
        if (Object.keys(updates).length > 0) {
          await tx.table('taskDefinitions').update(d.id, updates);
        }
      }

      // 3) wishingPool 清空（UI 不再用，避免数据残留困扰）
      await tx.table('wishingPool').clear();

      // 4) streak: guardCards / pardonCardsThisWeek 清零（豁免券系统删）
      const streak = await tx.table('streak').get('singleton');
      if (streak) {
        await tx.table('streak').update('singleton', {
          guardCards: 0,
          pardonCardsThisWeek: 0,
        });
      }

      // 5) shop 预置升级：删除老 isWishable + 加 4 件分挡乐高
      const shopItems = await tx.table('shop').toArray();
      for (const item of shopItems) {
        if (item.id === 'preset-lego-mid' || item.id === 'preset-lego-big') {
          // 老 wishable 乐高被新 4 挡替代，删除
          await tx.table('shop').delete(item.id);
        }
      }
      const existingIds = new Set(shopItems.map((i: ShopItem) => i.id));
      const newPresets = buildLegoPresets(Date.now());
      for (const p of newPresets) {
        if (!existingIds.has(p.id)) {
          await tx.table('shop').add(p);
        }
      }
    });

    // v10 (R5.7.0): 肥仔之家 → 肥仔画廊
    //   - 新表 galleryImages：温馨家庭画廊，100 张硬上限
    //   - 字段：fullBlob(长边 1200 JPEG 0.82) + thumbBlob(长边 400 JPEG 0.75)
    //     + 元数据(title/artist/year/medium/caption，全 optional)
    //   - 权限：双端可上传、仅家长可删除
    //   - 不在 migration 里 seed 任何图片(避免动 Blob/打包静态资源)。
    //     启动逻辑里(initializeDB / GalleryPage 首次进入)按需 seed center_hero.jpg。
    //   - 详见 .claude/skills/gallery-design/SKILL.md
    this.version(10).stores({
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
      cards: 'id, type, earnedAt',
      // 新表 — 索引按上传时间倒序 + 上传者过滤
      galleryImages: 'id, uploadedAt, uploadedBy',
    });
    // v10 不需要 upgrade 块：新表为空，老用户升级后画廊空白，
    // 由 GalleryPage 引导 seed center_hero.jpg（见 lib/gallerySeed.ts）
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

    // === 积分通路 - 大件 4 挡（10 积分 = 1 元，3000/5000/8000/10000）===
    // 大件用 composite 条件：积分够 + 累计完美任务数达阈值
    ...buildLegoPresets(now),

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

// ============================================================
// R5.1.0: 4 件分挡乐高（10 积分 = 1 元，3000/5000/8000/10000）
// 大件用 composite 条件：积分够 + 累计完美任务数达阈值
// 完美数仅作"门槛"（不消耗），积分扣（兑换时正常 spend）
// ============================================================
export function buildLegoPresets(now: number): ShopItem[] {
  const lego = (id: string, name: string, emoji: string, points: number, perfectThreshold: number): ShopItem => ({
    id, name, emoji,
    costPoints: points,
    stockPerWeek: 1,                  // 每周最多兑 1 件大件，避免短期囤
    redeemedThisWeek: 0,
    weekKey: null,
    enabled: true,
    category: 'toy',
    tier: 'long',
    rotationStatus: 'displayed',
    lastDisplayedAt: now,
    tags: ['乐高'],
    unlockCondition: {
      kind: 'composite',
      all: [
        { kind: 'lifetimePoints', threshold: points },
        { kind: 'perfectTask', count: perfectThreshold, window: 'lifetime' },
      ],
    },
  });
  return [
    lego('preset-lego-3000',  '中型乐高（约 300 元）',  '🧱', 3000,  3),
    lego('preset-lego-5000',  '大乐高（约 500 元）',    '🚀', 5000,  5),
    lego('preset-lego-8000',  '超大乐高（约 800 元）',  '🏰', 8000, 10),
    lego('preset-lego-10000', '旗舰乐高（约 1000 元）', '🛸', 10000, 15),
  ];
}

export const db = new FatboyDB();
// R5.1.0: 心愿池 hook 已删（许愿池机制全删）

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

// R5.6.0: 内置默认 Bark 接收人 — 仅在「一个接收人都没有」时写入。
// 只要用户改过/删过/加过任何接收人，一律不动（默认值只在没设置时生效）。
export async function ensureDefaultRecipients() {
  const existing = await db.recipients.toArray();
  if (existing.length > 0) return; // 有任何接收人 → 一律不覆盖、不补回

  const SUBS = {
    subTaskDone: true,
    subRoundDone: true,
    subMilestone: true,
    subPendingReview: true,
    subWeeklyReport: true,
    subHelp: true,
    subStreakAlert: true,
    subShopPurchase: true,
    enabled: true,
  };

  await db.recipients.bulkAdd([
    {
      id: 'preset-mom', label: '妈妈', emoji: '👩',
      serverUrl: 'https://api.day.app', key: 'DfjzKiUDcfdWLcnMeR6jXf', ...SUBS,
    },
    {
      id: 'preset-dad', label: '爸爸', emoji: '👨',
      serverUrl: 'https://api.day.app', key: 'aWEsiXKUPXgZAPNiz6r835', ...SUBS,
    },
  ] as any);
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
