// ============================================================
// 「肥仔大闯关」数据模型类型定义
// 所有持久化结构都在这里定义。任何 schema 变化必须升级 SCHEMA_VERSION
// 并在 db/index.ts 里写迁移逻辑。
// ============================================================

export const SCHEMA_VERSION = 1;

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
  description?: string;         // 详细说明（可选）
  date: string;                 // YYYY-MM-DD，家长指定哪天
  basePoints: number;           // 家长设定的基础积分
  estimatedMinutes: number;     // 预估时长
  subject: SubjectType;
  status: TaskStatus;
  createdAt: number;
  completedAt?: number;         // 孩子点完成的时间
  evaluationId?: string;        // 家长评分 ID
}

export interface Evaluation {
  id: string;
  taskId: string;
  completion: number;           // 完成度 1-5
  quality: number;              // 完成质量 1-5
  attitude: number;             // 完成态度 1-5
  note?: string;                // 备注（文字）
  evaluatedAt: number;
  finalPoints: number;          // 经公式计算后实际入账的积分
}

// 时间轴上的一个块（可以是任务或休息）
export interface ScheduleItem {
  kind: 'task' | 'rest';
  taskId?: string;              // kind=task 时必填
  startMinute: number;          // 当天 0:00 起算的分钟数
  durationMinutes: number;
}

export interface Schedule {
  id: string;                   // `${date}_round${n}`
  date: string;                 // YYYY-MM-DD
  round: number;                // 第几轮（周末可能多轮）
  items: ScheduleItem[];
  lockedAt?: number;            // 锁定后开始闯关
  completedAt?: number;
}

export interface PointsEntry {
  id: string;
  ts: number;
  delta: number;                // 正负
  reason: string;               // 'task_done', 'streak_bonus', 'shop_redeem' 等
  refId?: string;               // 关联的 taskId 或 redemptionId
}

export interface StreakState {
  id: 'singleton';              // 只有一行
  currentStreak: number;
  longestStreak: number;
  lastFullDate: string | null;  // 最近一次"当日全部完成"的日期
  guardCards: number;           // 守护卡数量
  lastWeeklyGiftWeek: string | null; // ISO 周字符串，如 "2026-W19"
}

export interface Pet {
  id: 'singleton';
  name: string;                 // 孩子起的名字
  skinId: string;               // 当前皮肤
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
  name: string;                 // "DQ 券一张"
  emoji: string;                // "🍦"
  costPoints: number;
  stockPerWeek: number;         // 每周可兑换次数上限
  redeemedThisWeek: number;
  weekKey: string | null;       // 上次扣减库存的周
  enabled: boolean;
}

export interface Redemption {
  id: string;
  shopItemId: string;
  shopItemName: string;
  costPoints: number;
  redeemedAt: number;
  fulfilledAt?: number;         // 家长确认兑现的时间
}

export interface BarkRecipient {
  id: string;
  label: string;                // "爸爸" / "妈妈"
  emoji: string;                // "👨" / "👩"
  serverUrl: string;            // 默认 https://api.day.app
  key: string;                  // Bark Key
  // 通知订阅
  subTaskDone: boolean;
  subRoundDone: boolean;
  subMilestone: boolean;
  subPendingReview: boolean;
  subWeeklyReport: boolean;
  enabled: boolean;
}

export interface Settings {
  id: 'singleton';
  schemaVersion: number;        // 升级用
  pin: string;                  // 4 位 PIN
  securityQuestion: string;
  securityAnswer: string;       // 答案做简单哈希
  themeId: 'space' | string;    // 当前主题，R1 只有 space
  notificationsEnabled: boolean;
  childName: string;            // "肥仔"
  setupComplete: boolean;
}
