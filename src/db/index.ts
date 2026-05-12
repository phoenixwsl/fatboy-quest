import Dexie, { type Table } from 'dexie';
import type {
  Task, Evaluation, Schedule, PointsEntry, StreakState, Pet,
  Badge, ShopItem, Redemption, BarkRecipient, Settings, TemplateHidden,
  TaskDefinition, RitualLog,
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
    themeId: 'space',
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
  });

  await db.streak.put({
    id: 'singleton',
    currentStreak: 0,
    longestStreak: 0,
    lastFullDate: null,
    guardCards: 0,
    lastWeeklyGiftWeek: null,
  });

  await db.shop.bulkPut([
    { id: 'preset-dq', name: 'DQ 雪糕券', emoji: '🍦', costPoints: 300, stockPerWeek: 1, redeemedThisWeek: 0, weekKey: null, enabled: true },
    { id: 'preset-mixue', name: '蜜雪冰城券', emoji: '🥤', costPoints: 150, stockPerWeek: 2, redeemedThisWeek: 0, weekKey: null, enabled: true },
    { id: 'preset-guard', name: '守护卡（保护连击）', emoji: '🛡️', costPoints: 0, stockPerWeek: 99, redeemedThisWeek: 0, weekKey: null, enabled: true },
  ]);
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
