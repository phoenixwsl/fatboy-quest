// ============================================================
// 「肥仔大闯关」数据模型类型定义
// 所有持久化结构都在这里定义。任何 schema 变化必须升级 SCHEMA_VERSION
// 并在 db/index.ts 里写迁移逻辑。
// ============================================================

export const SCHEMA_VERSION = 9;
// v2: 新增 Task.createdBy, Settings.soundEnabled
// v3: 新增 actualStartedAt / pause / extend / undo 字段，templateHidden 表
// v4: 引入 TaskDefinition 循环任务定义、Task.taskType 颜色区分、Redemption.usedAt 库存、
//     Settings 周末模式/晚安/分析/声音包 等多个新设置项
// v5: Fatboy v4 集成 - 旧 pet.skinId='skin_xxx' 迁移到新 character id
// v6: 加 errorLogs 表
// v7 (R4.0.0): kid-rewards 商店重构基础设施
//   - Task/TaskDefinition.difficulty: 1|2|3 → 'bronze'|'silver'|'gold'
//   - ShopItem: 加 category/tags/tier/rotationStatus/lastDisplayedAt
//                isWishable/isLocked/unlockLifetimeThreshold/stockPerSeason/unlockCondition
//   - 预置 DQ/蜜雪 stockPerWeek 改 1
//   - 预置 preset-guard 从 shop 移除（守护卡转 SkillCard）
//   - 新表：skillCards / wishingPool / witnessMoments（声明，R4.3+ 使用）
//
// v8 (R5.0.0): 反馈优化
//   - ShopCategory 简化为 'toy' | 'food'（'plant' / 'decor' → 'toy' migration）
//   - 内置 13 件预置示例覆盖所有机制（积分通路 / 许愿池 / 条件解锁 / 锁定区）
//   - 幂等 seed：只补缺失的 preset-* id，不重新覆盖已删除的
//
// v9 (R5.1.0): 三层架构 + 删许愿池 + 4 档难度
//   - StarLevel 加 'none'（0 星 = 默认无奖励，作业很差/没做好的标记）
//   - TaskType 4 种 → 3 种：'normal' → 'once'，'daily-required' → 'daily'，
//     'weekly-min' + 'weekly-once' → 'weekly'（带 weeklyTimes 字段，默认 1）
//   - TaskDefinition.weeklyMinTimes → weeklyTimes
//   - 新表 cards（卡牌：纯收藏，无 expiresAt 无 usedAt）
//   - wishingPool 表保留声明但数据清空、UI 不再用（许愿池机制全删）
//   - 4 件分挡乐高预置（3000/5000/8000/10000 积分 + 完美数门槛）
//   - 删 streak.guardCards / pardonCardsThisWeek（豁免券系统全删）
//
// 关于 Pet.lifetimePoints / level / 任务计数器：暂不存储，按需 derive。
// 详见 src/lib/petStats.ts。这是为了避免 R4.0.0 接触所有 db.points.add 调用方，
// 等 R4.3.0 引入 hook 时再加 cache。

export type TaskStatus =
  | 'pending'     // 待安排（在作业池里）
  | 'scheduled'   // 已排进今日时间轴
  | 'inProgress'  // 闯关中
  | 'done'        // 孩子已完成、等待家长评分
  | 'evaluated';  // 家长已评分（最终态）

export type SubjectType =
  | 'math' | 'chinese' | 'english' | 'reading' | 'writing' | 'other';

// R4.0.0: 任务星级（替代 R3.2 的 1|2|3 数字）
// 重命名为铜/银/金，UI 用对应金属色渲染。lib/difficulty.ts 仍是 difficultyBonus
// 等业务逻辑的入口；类型在 lib/unlockCondition.ts 定义并 re-export。
export type { StarLevel } from '../lib/unlockCondition';
import type { StarLevel } from '../lib/unlockCondition';
import type { UnlockCondition } from '../lib/unlockCondition';
import type { ShopCategory } from '../lib/categories';

// v4 → v9 (R5.1.0): 任务类型简化为 3 种（新代码统一用前 3 种）
// 老 4 种保留作向后兼容，新 UI 用 normalizeTaskType() 映射
// migration 已把 DB 里的老值改成新值；老 const/UI 引用还在过渡
export type TaskType =
  | 'once'             // 单次任务
  | 'daily'            // 每天必做
  | 'weekly'           // 每周任务
  // === 老类型，向后兼容（不在 UI 显示，被 normalizeTaskType 映射）===
  | 'normal'
  | 'daily-required'
  | 'weekly-min'
  | 'weekly-once';

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
  // R2.4.3: 完成后家长长时间未评分的提醒
  unevaluatedNotifySentAt?: number; // 防重戳
  // R3.2 → R4.0.0: 难度（铜/银/金，仅家长可设，默认 'bronze'）
  // 老数据 1|2|3 在 v7 migration 转换为字符串
  difficulty?: StarLevel;
}

// v4 → v9 (R5.1.0): 循环任务定义
export interface TaskDefinition {
  id: string;
  title: string;
  description?: string;
  subject: SubjectType;
  basePoints: number;
  estimatedMinutes: number;
  // v9: 重命名 'daily-required' → 'daily', 合并 weekly-min/once → 'weekly'
  // 老值保留兼容（migration 已转换 DB 数据；老 const 引用过渡期还在）
  type: 'daily' | 'weekly' | 'daily-required' | 'weekly-min' | 'weekly-once';
  weeklyTimes?: number;             // R5.1.0: 合并 weeklyMinTimes，weekly 类型用，默认 1
  /** @deprecated 用 weeklyTimes，老字段保留兼容 */
  weeklyMinTimes?: number;
  isRequired?: boolean;             // 仅 daily 用
  active: boolean;
  createdAt: number;
  archivedAt?: number;
  lastGeneratedFor?: string;        // 最近一次生成实例时的日期/周
  difficulty?: StarLevel;
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
  // R2.5.D: 豁免券（断击保护）
  pardonCardsThisWeek?: number;     // 本周剩余豁免券（每周一重置为 2）
  lastPardonResetWeek?: string;     // 上次重置发生在哪个 ISO 周
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
  // R5.2.0: 解锁的称号集合（来自里程碑 / 见证累计），不可减少
  unlockedTitles?: string[];
}

export interface Badge {
  id: string;
  unlockedAt: number;
}

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  costPoints: number;                       // > 0 = 走积分通路；0 + unlockCondition 设了 = 走条件解锁通路
  stockPerWeek: number;
  redeemedThisWeek: number;
  weekKey: string | null;
  enabled: boolean;
  // === R4.0.0 新增（v7） ===
  category?: ShopCategory;                  // 4 分类，老数据迁移默认 'food'
  tags?: string[];                          // chip 二级筛选用
  tier?: 'instant' | 'mid' | 'long';        // 时间档（migration 按价格推断）
  rotationStatus?: 'displayed' | 'shelved'; // 强制轮转状态，默认 'displayed'
  lastDisplayedAt?: number;                 // 最近一次进入 displayed 的时间
  isWishable?: boolean;                     // 是否可做许愿池（积分通路大件用）
  isLocked?: boolean;                       // 锁定区"???"商品标记
  unlockLifetimeThreshold?: number;         // 兼容字段：等同 unlockCondition: { kind: 'lifetimePoints' }
  stockPerSeason?: number;                  // 季度限购（玩具堆大件）
  unlockCondition?: UnlockCondition;        // 条件解锁通路（与 costPoints>0 互斥）
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
  // R3.1: 主题 — 'cozy'(温馨黄) | 'starry'(星空蓝) | 'mecha'(机械灰)；旧 'space' 自动迁移到 'starry'
  themeId: 'cozy' | 'starry' | 'mecha' | 'space' | string;
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
  // R2.5.C: ADHD 友好模式 — 超时提醒分级 + 推送家长延后到 5min + 文案软化
  adhdFriendlyMode?: boolean;       // 默认 true
  // R2.4.3: 完成后家长 X 分钟未评分 → 自动 Bark 提醒；0=关闭
  unevaluatedNotifyMinutes?: number; // 默认 45
}

export interface TemplateHidden {
  title: string;
  hiddenAt: number;
}

// v4: 周任务进度记录（不必持久化复杂状态，仅用于"显示过的"提示）
//     实际进度从 Task instances 即时统计
export interface RitualLog {
  id: string;                       // YYYY-MM-DD-kind
  kind: 'evening-summary' | 'sunday-ritual' | 'streak-alert' | 'streak-pardon';
  date: string;                     // 当天 YYYY-MM-DD
  shownAt: number;
}

// v6 (R2.3.4): 运行时错误日志，便于在 iPad 上事后排查
export interface ErrorLog {
  id: string;
  ts: number;
  kind: 'window-error' | 'unhandled-rejection' | 'manual';
  message: string;
  stack?: string;
  url?: string;
  appVersion?: string;
}

// ============================================================
// v7 (R4.0.0): kid-rewards 商店重构基础设施 — 新表声明
// 这些表在 R4.0.0 仅声明，行为代码在 R4.3.0+ 实现
// ============================================================

export type SkillCardType =
  | 'guard'    // 守护卡：抵 1 次连击中断
  | 'pardon'   // 豁免券：缺勤一天不算断击
  | 'extend'   // 延时券：任务超时缓冲 5 分钟
  | 'replace'  // 替换券：换掉非必做任务
  | 'pause'    // 暂停券：暂停超 3 分钟不强退
  | 'help'     // 求助券：一键求助家长（默认无限）
  | 'skip'     // 跳过券：跳过 1 个非必做任务
  | 'mystery'; // 神秘券：抽 1 次盲盒

export interface SkillCard {
  id: string;
  type: SkillCardType;
  source: string;                    // 'streak-7day' | 'weekly-auto' | 'manual-grant' | 'migration-*' | ...
  earnedAt: number;
  expiresAt: number;                 // earnedAt + 30 天
  usedAt?: number;
  consumedRefId?: string;            // 关联到使用时的对象（taskId / scheduleId）
}

export interface WishingPool {
  id: 'singleton';                   // 一次只能一个许愿
  shopItemId: string;
  openedAt: number;
  startBonusPoints: number;          // endowed progress 起步点数（= 商品价 × 0.12）
  currentProgress: number;           // 累计点数（含起步）
  targetPoints: number;              // 商品价
  autoStreamRatio: number;           // 默认 0.5
  lockedUntil: number;               // openedAt + 7 × 86400000
  fulfilledAt?: number;
}

export interface WitnessMoment {
  id: string;
  ts: number;
  text: string;
  emoji: string;
  fromRecipientId: string;           // 'preset-mom' | 'preset-dad' | ...
  fromLabel: string;                 // 冗余存 label，方便孩子端直接显示
}

// ============================================================
// v9 (R5.1.0): 卡牌系统 — 收藏型，永远累积，不可消费
// 同 type 可有多张（堆叠），无 expiresAt 无 usedAt
// 触发：行为达标自动发；与 SkillCard（券）/ Badge（里程碑）正交
// ============================================================
export type CollectibleCardType =
  | 'focus'              // 专注卡：实际用时 ≥ 30min 任务（每天最多 1）
  | 'perfect-day'        // 完美一天：当日所有评分都是三维全 5（每天最多 1）
  | 'weekend-warrior';   // 周末战士：周六或周日完成全部任务（每周末最多 1）

export interface CollectibleCard {
  id: string;
  type: CollectibleCardType;
  earnedAt: number;
  /** 关联到触发的对象（taskId / 日期 等） */
  context?: string;
}
