// ============================================================
// 「肥仔大闯关」数据模型类型定义
// 所有持久化结构都在这里定义。任何 schema 变化必须升级 SCHEMA_VERSION
// 并在 db/index.ts 里写迁移逻辑。
// ============================================================

export const SCHEMA_VERSION = 5;
// v2: 新增 Task.createdBy, Settings.soundEnabled
// v3: 新增 actualStartedAt / pause / extend / undo 字段，templateHidden 表
// v5: Fatboy v4 集成 - 旧 pet.skinId='skin_xxx' 迁移到新 character id
// v4: 引入 TaskDefinition 循环任务定义、Task.taskType 颜色区分、Redemption.usedAt 库存、
//     Settings 周末模式/晚安/分析/声音包 等多个新设置项

export type TaskStatus =
  | 'pending'     // 待安排（在作业池里）
  | 'scheduled'   // 已排进今日时间轴
  | 'inProgress'  // 闯关中
  | 'done'        // 孩子已完成、等待家长评分
  | 'evaluated';  // 家长已评分（最终态）

export type SubjectType =
  | 'math' | 'chinese' | 'english' | 'reading' | 'writing' | 'other';

// v4: 任务类型 - 用于颜色区分 + 推断行为
export type TaskType =
  | 'normal'           // 普通一次性（白色边框）
  | 'daily-required'   // 每日必做（红色边框）
  | 'weekly-min'       // 每周至少 N 次（紫色边框）
  | 'weekly-once';     // 每周一次（蓝色边框）

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;                 // YYYY-MM-DD
  basePoints: number;
  estimatedMinutes: number;
  subject: SubjectType;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  evaluationId?: string;
  createdBy?: 'parent' | 'child';   // v2
  isRequired?: boolean;             // v3
  // v3: 执行记录
  actualStartedAt?: number;
  pausedAt?: number;
  pauseSecondsUsed?: number;
  pauseCount?: number;
  extendCount?: number;
  extendMinutesTotal?: number;
  extendPointsSpent?: number;
  undoCount?: number;
  childNote?: string;
  earlyBonusPoints?: number;
  comboMultiplier?: number;
  // v4:
  taskType?: TaskType;              // 默认 'normal'（老数据兜底）
  definitionId?: string;            // 关联到 TaskDefinition（如果是循环生成的实例）
  parentReminderForNext?: string;   // 家长在上次评分留的"下次提醒"
  // R2.1.1: 进入闯关后还没点"开始"的等待计时
  firstEncounteredAt?: number;      // 在 quest 页第一次成为"当前小怪"的时间
  startNagSentAt?: number;          // 3 分钟未开始的 Bark 推送已发送时间（防重）
  // R2.2.8: 任务超时后的提醒
  overtimeNagSentAt?: number;       // 超时 3 分钟后给家长推送的时间（防重）
  overtimeSoundPlayedAt?: number;   // 第一次进入超时时声音已响起的时间（防重）
}

// v4: 循环任务定义
export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  subject: SubjectType;
  basePoints: number;
  estimatedMinutes: number;
  type: 'daily-required' | 'weekly-min' | 'weekly-once';
  weeklyMinTimes?: number;          // 仅 weekly-min 用
  isRequired?: boolean;             // 仅 daily-required 用
  active: boolean;
  createdAt: number;
  archivedAt?: number;
  lastGeneratedFor?: string;        // 最近一次生成实例时的日期/周
}

export interface Evaluation {
  id: string;
  taskId: string;
  basePointsAtEval: number;
  completion: number;
  quality: number;
  attitude: number;
  note?: string;
  evaluatedAt: number;
  finalPoints: number;
  parentReminderForNext?: string;   // v4: 家长留给孩子下次的提醒
}

export interface ScheduleItem {
  kind: 'task' | 'rest';
  taskId?: string;
  startMinute: number;
  durationMinutes: number;
}

export interface Schedule {
  id: string;
  date: string;
  round: number;
  items: ScheduleItem[];
  lockedAt?: number;
  completedAt?: number;
  comboPeakInRound?: number;
  comboBonusPoints?: number;
  reportShownAt?: number;
}

export interface PointsEntry {
  id: string;
  ts: number;
  delta: number;
  reason: string;
  refId?: string;
}

export interface StreakState {
  id: 'singleton';
  currentStreak: number;
  longestStreak: number;
  lastFullDate: string | null;
  guardCards: number;
  lastWeeklyGiftWeek: string | null;
}

export interface Pet {
  id: 'singleton';
  name: string;
  skinId: string;
  unlockedSkins: string[];
  level: number;
  exp: number;
  evolutionStage: 1 | 2 | 3 | 4;
  equippedAccessories: string[];
}

export interface Badge {
  id: string;
  unlockedAt: number;
}

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  costPoints: number;
  stockPerWeek: number;
  redeemedThisWeek: number;
  weekKey: string | null;
  enabled: boolean;
}

// v4: redemption 流程升级
//   redeemedAt = 兑换（积分扣除）时间
//   usedAt = 实际使用时间。未使用前一直在"我的库存"展示
export interface Redemption {
  id: string;
  shopItemId: string;
  shopItemName: string;
  shopItemEmoji?: string;       // v4: 快照便于展示库存
  costPoints: number;
  redeemedAt: number;
  fulfilledAt?: number;         // 兼容老数据
  usedAt?: number;              // v4: 已使用时间
}

export interface BarkRecipient {
  id: string;
  label: string;
  emoji: string;
  serverUrl: string;
  key: string;
  subTaskDone: boolean;
  subRoundDone: boolean;
  subMilestone: boolean;
  subPendingReview: boolean;
  subWeeklyReport: boolean;
  subHelp?: boolean;
  subShopPurchase?: boolean;    // v4: 商店兑换/使用通知
  subStreakAlert?: boolean;     // v4: 断击预警通知
  enabled: boolean;
}

export interface Settings {
  id: 'singleton';
  schemaVersion: number;
  pin: string;
  securityQuestion: string;
  securityAnswer: string;
  themeId: 'space' | string;
  notificationsEnabled: boolean;
  childName: string;
  setupComplete: boolean;
  soundEnabled?: boolean;
  childCanAddTasks?: boolean;
  childMaxPointsPerTask?: number;
  warnMinutesBeforeEnd?: number;
  restEndSoundLeadSec?: number;
  helpButtonEnabled?: boolean;
  // v4:
  weekendModeEnabled?: boolean;     // 默认 true
  eveningSummaryHour?: number;      // 默认 21
  eveningSummaryMinute?: number;    // 默认 30
  streakAlertHour?: number;         // 默认 19, 19:30 提醒
  streakAlertMinute?: number;       // 默认 30
  sundayRitualHour?: number;        // 默认 21
  sundayRitualMinute?: number;      // 默认 0
  soundPack?: 'default' | 'cartoon' | 'minimal';
  developerMode?: boolean;          // 影响快速 reset 等
  dailyPointsGoal?: number;         // 家长设的"每日积分目标"，0=未设
  idleNagEnabled?: boolean;         // 默认 true
}

export interface TemplateHidden {
  title: string;
  hiddenAt: number;
}

// v4: 周任务进度记录（不必持久化复杂状态，仅用于"显示过的"提示）
//     实际进度从 Task instances 即时统计
export interface RitualLog {
  id: string;                       // YYYY-MM-DD-kind
  kind: 'evening-summary' | 'sunday-ritual' | 'streak-alert';
  date: string;                     // 当天 YYYY-MM-DD
  shownAt: number;
}
