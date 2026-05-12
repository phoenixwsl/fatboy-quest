// ============================================================
// 「肥仔大闯关」数据模型类型定义
// 所有持久化结构都在这里定义。任何 schema 变化必须升级 SCHEMA_VERSION
// 并在 db/index.ts 里写迁移逻辑。
// ============================================================

export const SCHEMA_VERSION = 3;
// v2: 新增 Task.createdBy, Settings.soundEnabled
// v3: 新增 actualStartedAt / pause / extend / undo 字段，templateHidden 表

// 作业状态机
export type TaskStatus =
  | 'pending'     // 待安排（在作业池里）
  | 'scheduled'   // 已排进今日时间轴
  | 'inProgress'  // 闯关中
  | 'done'        // 孩子已完成、等待家长评分
  | 'evaluated';  // 家长已评分（最终态）

export type SubjectType =
  | 'math' | 'chinese' | 'english' | 'reading' | 'writing' | 'other';

export interface Task {
  id: string;
  title: string;                // 例：「数学口算 P12」
  description?: string;
  date: string;                 // YYYY-MM-DD
  basePoints: number;           // 基础积分（孩子加的任务初始为 0，由家长评分时填）
  estimatedMinutes: number;
  subject: SubjectType;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;
  evaluationId?: string;
  createdBy?: 'parent' | 'child';   // v2
  isRequired?: boolean;             // v3: 家长指定的必做任务，孩子不能删

  // v3: 执行记录
  actualStartedAt?: number;     // 孩子点"我要开始"的时间
  pausedAt?: number;            // 当前暂停的开始时间（暂停中才有）
  pauseSecondsUsed?: number;    // 累计暂停过的秒数
  pauseCount?: number;          // 已暂停过的次数（最多 1）
  extendCount?: number;         // 已延时过的次数
  extendMinutesTotal?: number;  // 已延时的总分钟
  extendPointsSpent?: number;   // 延时累计花费积分
  undoCount?: number;           // 撤回过的次数（用于打断 combo 判定）
  childNote?: string;           // 孩子完成时留言
  earlyBonusPoints?: number;    // 提前奖励（评分后写入，可能为 0）
  comboMultiplier?: number;     // 一轮结束时附给该任务的 combo 倍率（用于显示）
}

export interface Evaluation {
  id: string;
  taskId: string;
  basePointsAtEval: number;     // v3: 评分时家长确认/修改的基础积分
  completion: number;
  quality: number;
  attitude: number;
  note?: string;
  evaluatedAt: number;
  finalPoints: number;          // 三维公式得出的核心分（不含 combo/early/penalty）
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
  comboPeakInRound?: number;    // v3: 本轮最长连击（写入时锁定）
  comboBonusPoints?: number;    // v3: 本轮 combo 总加分
  reportShownAt?: number;       // v3: 战报动画展示过的时间（防重复弹）
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

export interface Redemption {
  id: string;
  shopItemId: string;
  shopItemName: string;
  costPoints: number;
  redeemedAt: number;
  fulfilledAt?: number;
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
  subHelp?: boolean;            // v3: 求助按钮通知
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
  // v3:
  warnMinutesBeforeEnd?: number;   // 默认 3
  restEndSoundLeadSec?: number;    // 默认 60，休息最后多少秒开始滴答
  helpButtonEnabled?: boolean;     // 默认 true
}

// v3: 隐藏的模板（按标题）
export interface TemplateHidden {
  title: string;                // primary key
  hiddenAt: number;
}
