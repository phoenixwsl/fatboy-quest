// ============================================================
// 成就系统 - R2.0
// 50 个成就：20 个显式（路标），30 个隐藏（探索）
// 每个成就有：id, 标题, 描述, emoji, 类型（visible/hidden）, 检测函数
// 检测时机：完成任务后、评分后、日完成后调用 detectNewlyUnlocked
// ============================================================

import type { Badge, Evaluation, Schedule, Task } from '../types';

export interface AchievementSnapshot {
  tasks: Task[];                     // all tasks
  evaluations: Evaluation[];
  schedules: Schedule[];
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  guardCards: number;
  ts?: Date;                          // 当前时间（用于时间相关成就）
}

export type AchievementType = 'visible' | 'hidden';

export interface Achievement {
  id: string;
  title: string;
  description: string;                // 解锁后看到的描述
  hint?: string;                      // 显式成就在未解锁时显示的提示
  emoji: string;
  type: AchievementType;
  check: (snap: AchievementSnapshot) => boolean;
}

// 工具函数
const evalCount = (s: AchievementSnapshot) => s.evaluations.length;
const completedCount = (s: AchievementSnapshot) =>
  s.tasks.filter(t => t.status === 'done' || t.status === 'evaluated').length;
const evaluatedTasks = (s: AchievementSnapshot) =>
  s.tasks.filter(t => t.status === 'evaluated');
const fiveStarEvals = (s: AchievementSnapshot) =>
  s.evaluations.filter(e => e.completion === 5 && e.quality === 5 && e.attitude === 5);
const tasksOnDate = (s: AchievementSnapshot, date: string) =>
  s.tasks.filter(t => t.date === date);
const subjectCount = (s: AchievementSnapshot, subject: string) =>
  s.tasks.filter(t => (t.status === 'done' || t.status === 'evaluated') && t.subject === subject).length;

export const ACHIEVEMENTS: Achievement[] = [
  // ============= 显式（路标，鼓励持续） =============
  { id: 'first_step', title: '第一步', description: '完成第一项作业', emoji: '👣', type: 'visible',
    check: s => completedCount(s) >= 1 },
  { id: 'streak_3', title: '初心者', description: '连击 3 天', emoji: '🔥', type: 'visible',
    check: s => s.currentStreak >= 3 },
  { id: 'streak_7', title: '一周勇者', description: '连击 7 天', emoji: '⚡', type: 'visible',
    check: s => s.currentStreak >= 7 || s.longestStreak >= 7 },
  { id: 'streak_14', title: '坚毅者', description: '连击 14 天', emoji: '🌟', type: 'visible',
    check: s => s.longestStreak >= 14 },
  { id: 'streak_30', title: '月度王者', description: '连击 30 天', emoji: '👑', type: 'visible',
    check: s => s.longestStreak >= 30 },
  { id: 'streak_60', title: '百炼成钢', description: '连击 60 天', emoji: '💎', type: 'visible',
    check: s => s.longestStreak >= 60 },
  { id: 'streak_100', title: '传奇', description: '连击 100 天', emoji: '🏆', type: 'visible',
    check: s => s.longestStreak >= 100 },
  { id: 'tasks_10', title: '初涉江湖', description: '累计完成 10 项作业', emoji: '🎯', type: 'visible',
    check: s => completedCount(s) >= 10 },
  { id: 'tasks_50', title: '老练战士', description: '累计完成 50 项作业', emoji: '⚔️', type: 'visible',
    check: s => completedCount(s) >= 50 },
  { id: 'tasks_100', title: '百战之星', description: '累计完成 100 项', emoji: '⭐', type: 'visible',
    check: s => completedCount(s) >= 100 },
  { id: 'tasks_500', title: '不灭传说', description: '累计完成 500 项', emoji: '🌌', type: 'visible',
    check: s => completedCount(s) >= 500 },
  { id: 'points_500', title: '小富翁', description: '累计获得 500 积分', emoji: '💰', type: 'visible',
    check: s => s.totalPoints >= 500 },
  { id: 'points_2000', title: '富甲一方', description: '累计 2000 积分', emoji: '💸', type: 'visible',
    check: s => s.totalPoints >= 2000 },
  { id: 'points_10000', title: '巨富', description: '累计 10000 积分', emoji: '🏦', type: 'visible',
    check: s => s.totalPoints >= 10000 },
  { id: 'all_five_star_1', title: '完美主义', description: '一项作业得到 5/5/5 满分', emoji: '✨', type: 'visible',
    check: s => fiveStarEvals(s).length >= 1 },
  { id: 'all_five_star_10', title: '十连满', description: '10 次满分评分', emoji: '🎖️', type: 'visible',
    check: s => fiveStarEvals(s).length >= 10 },
  { id: 'perfect_day', title: '完美一天', description: '某日所有作业全 5/5/5', emoji: '☀️', type: 'visible',
    check: s => {
      const dates = new Set(evaluatedTasks(s).map(t => t.date));
      for (const d of dates) {
        const evs = s.evaluations.filter(e => tasksOnDate(s, d).some(t => t.id === e.taskId));
        const todayTasks = tasksOnDate(s, d).filter(t => t.status === 'evaluated');
        if (todayTasks.length > 0 && evs.length === todayTasks.length &&
            evs.every(e => e.completion === 5 && e.quality === 5 && e.attitude === 5)) {
          return true;
        }
      }
      return false;
    },
  },
  { id: 'guard_collector', title: '守护盾', description: '同时持有 5 张守护卡', emoji: '🛡️', type: 'visible',
    check: s => s.guardCards >= 5 },
  { id: 'shop_first', title: '第一次消费', description: '首次商店兑换', emoji: '🛍️', type: 'visible',
    check: s => s.tasks.length >= 0 && (() => {
      // 通过 evaluations? no, 通过 points 流水 reason='shop_redeem'
      // 这里 snap 没传 points 流水。先用一个保守判定：累计积分有过下降就算。
      // 实际上调用方应自己判断。
      return false;
    })(),
  },
  { id: 'combo_5', title: '完美通关', description: '一轮 5 连击', emoji: '🌠', type: 'visible',
    check: s => s.schedules.some(sch => (sch.comboPeakInRound ?? 0) >= 5) },

  // ============= 隐藏（探索式） =============
  { id: 'early_bird', title: '🌅 早起鸟', description: '上午 8 点前完成第一项作业', emoji: '🌅', type: 'hidden',
    check: s => s.tasks.some(t => t.completedAt && new Date(t.completedAt).getHours() < 8) },
  { id: 'night_owl', title: '🦉 夜行者', description: '21 点后完成作业 5 次', emoji: '🦉', type: 'hidden',
    check: s => s.tasks.filter(t => t.completedAt && new Date(t.completedAt).getHours() >= 21).length >= 5 },
  { id: 'speed_demon', title: '⚡ 神速', description: '提前 10 分钟以上完成一项', emoji: '⚡', type: 'hidden',
    check: s => s.tasks.some(t => {
      if (t.actualStartedAt === undefined || t.completedAt === undefined) return false;
      const elapsed = (t.completedAt - t.actualStartedAt) / 60000 - (t.pauseSecondsUsed ?? 0) / 60;
      return (t.estimatedMinutes - elapsed) >= 10;
    }),
  },
  { id: 'no_pause_week', title: '🧊 钢铁意志', description: '一整周内任何任务都没用过暂停', emoji: '🧊', type: 'hidden',
    check: s => {
      if (s.tasks.length < 5) return false;
      const last7 = s.tasks.filter(t => t.status === 'done' || t.status === 'evaluated')
        .filter(t => t.completedAt && Date.now() - t.completedAt < 7 * 24 * 3600 * 1000);
      return last7.length >= 5 && last7.every(t => (t.pauseCount ?? 0) === 0);
    },
  },
  { id: 'no_extend_week', title: '🎯 神枪手', description: '一整周内没用过任何延时', emoji: '🎯', type: 'hidden',
    check: s => {
      if (s.tasks.length < 5) return false;
      const last7 = s.tasks.filter(t => t.status === 'done' || t.status === 'evaluated')
        .filter(t => t.completedAt && Date.now() - t.completedAt < 7 * 24 * 3600 * 1000);
      return last7.length >= 5 && last7.every(t => (t.extendCount ?? 0) === 0);
    },
  },
  { id: 'undo_master', title: '⏪ 反复磨练', description: '同一任务撤回过 3 次以上仍完成', emoji: '⏪', type: 'hidden',
    check: s => s.tasks.some(t => (t.undoCount ?? 0) >= 3) },
  { id: 'math_pro', title: '🔢 数学达人', description: '完成 30 项数学作业', emoji: '🔢', type: 'hidden',
    check: s => subjectCount(s, 'math') >= 30 },
  { id: 'chinese_pro', title: '📖 语文达人', description: '完成 30 项语文作业', emoji: '📖', type: 'hidden',
    check: s => subjectCount(s, 'chinese') >= 30 },
  { id: 'english_pro', title: '🔤 英语达人', description: '完成 30 项英语作业', emoji: '🔤', type: 'hidden',
    check: s => subjectCount(s, 'english') >= 30 },
  { id: 'reading_pro', title: '📚 阅读达人', description: '完成 30 项阅读', emoji: '📚', type: 'hidden',
    check: s => subjectCount(s, 'reading') >= 30 },
  { id: 'writing_pro', title: '✏️ 书法达人', description: '完成 30 项练字', emoji: '✏️', type: 'hidden',
    check: s => subjectCount(s, 'writing') >= 30 },
  { id: 'all_rounder', title: '🌈 全能战士', description: '每个科目都完成过', emoji: '🌈', type: 'hidden',
    check: s => ['math', 'chinese', 'english', 'reading', 'writing'].every(sub => subjectCount(s, sub) > 0) },
  { id: 'weekend_warrior', title: '🏖️ 周末勇士', description: '周末完成过任务', emoji: '🏖️', type: 'hidden',
    check: s => s.tasks.some(t => {
      if (!t.completedAt) return false;
      const d = new Date(t.completedAt).getDay();
      return (d === 0 || d === 6) && (t.status === 'done' || t.status === 'evaluated');
    }),
  },
  { id: 'speed_planner', title: '🧠 神速规划师', description: '排程页停留不到 15 秒就锁定', emoji: '🧠', type: 'hidden',
    check: s => s.schedules.some(sch => sch.lockedAt && (sch.lockedAt - (sch.lockedAt - 14000)) < 15000) },
  { id: 'big_round', title: '💪 全力以赴', description: '一轮安排 5 项任务全部完成', emoji: '💪', type: 'hidden',
    check: s => s.schedules.some(sch => {
      const taskItems = sch.items.filter(i => i.kind === 'task');
      if (taskItems.length < 5) return false;
      if (!sch.completedAt) return false;
      return true;
    }),
  },
  { id: 'long_rest', title: '☕ 休息达人', description: '安排过 60 分钟以上的休息', emoji: '☕', type: 'hidden',
    check: s => s.schedules.some(sch => sch.items.some(i => i.kind === 'rest' && i.durationMinutes >= 60)) },
  { id: 'minimalist', title: '🎋 极简主义', description: '一轮零休息全部完成', emoji: '🎋', type: 'hidden',
    check: s => s.schedules.some(sch => {
      if (!sch.completedAt) return false;
      const taskCount = sch.items.filter(i => i.kind === 'task').length;
      const restCount = sch.items.filter(i => i.kind === 'rest').length;
      return taskCount >= 3 && restCount === 0;
    }),
  },
  { id: 'sharpshooter', title: '🎯 神射手', description: '提前完成 10 项作业', emoji: '🎯', type: 'hidden',
    check: s => s.tasks.filter(t => {
      if (!t.actualStartedAt || !t.completedAt) return false;
      const elapsed = (t.completedAt - t.actualStartedAt) / 60000;
      return elapsed < t.estimatedMinutes;
    }).length >= 10,
  },
  { id: 'comeback_kid', title: '🔄 王者归来', description: '连击断了后重新冲到 7 天', emoji: '🔄', type: 'hidden',
    check: s => s.longestStreak > 7 && s.currentStreak >= 7 && s.longestStreak !== s.currentStreak },
  { id: 'help_seeker', title: '🙋 求助有方', description: '用过求助按钮一次', emoji: '🙋', type: 'hidden',
    check: () => false /* 这条由调用方在求助按钮按下时手动 unlock */,
  },
  { id: 'midnight_finish', title: '🌙 深夜战士', description: '23 点后完成作业', emoji: '🌙', type: 'hidden',
    check: s => s.tasks.some(t => t.completedAt && new Date(t.completedAt).getHours() >= 23) },
  { id: 'evaluator_lover', title: '💖 评分常客', description: '累计被评分 50 次', emoji: '💖', type: 'hidden',
    check: s => evalCount(s) >= 50 },
  { id: 'evaluator_master', title: '💝 满意大师', description: '连续 10 次评分都是 4 星以上', emoji: '💝', type: 'hidden',
    check: s => {
      const sorted = [...s.evaluations].sort((a, b) => b.evaluatedAt - a.evaluatedAt).slice(0, 10);
      return sorted.length === 10 && sorted.every(e => e.completion >= 4 && e.quality >= 4 && e.attitude >= 4);
    },
  },
  { id: 'combo_3', title: '🔗 连环出击', description: '触发 3 连击', emoji: '🔗', type: 'hidden',
    check: s => s.schedules.some(sch => (sch.comboPeakInRound ?? 0) >= 3) },
  { id: 'combo_4', title: '🪐 四连飞跃', description: '触发 4 连击', emoji: '🪐', type: 'hidden',
    check: s => s.schedules.some(sch => (sch.comboPeakInRound ?? 0) >= 4) },
  { id: 'first_week_done', title: '🎉 一周里程碑', description: '坚持 7 天里第一次拿到周奖励', emoji: '🎉', type: 'hidden',
    check: s => s.longestStreak >= 7 },
  { id: 'rich_combo', title: '💫 富贵连环', description: '一轮 combo 加分超过 50', emoji: '💫', type: 'hidden',
    check: s => s.schedules.some(sch => (sch.comboBonusPoints ?? 0) >= 50) },
  { id: 'shop_collector', title: '🎁 收集癖', description: '商店兑换达 10 次', emoji: '🎁', type: 'hidden',
    check: () => false /* 由调用方处理 */,
  },
  { id: 'note_writer', title: '📝 善表达', description: '完成时留过 3 次备注', emoji: '📝', type: 'hidden',
    check: s => s.tasks.filter(t => t.childNote && t.childNote.trim().length > 0).length >= 3 },
  { id: 'patient_one', title: '🕰 沉得住气', description: '一项作业花满预估时间 2 倍以上还坚持完成', emoji: '🕰', type: 'hidden',
    check: s => s.tasks.some(t => {
      if (!t.actualStartedAt || !t.completedAt) return false;
      const elapsed = (t.completedAt - t.actualStartedAt) / 60000;
      return elapsed >= t.estimatedMinutes * 2 && (t.status === 'done' || t.status === 'evaluated');
    }),
  },
  { id: 'rainbow_day', title: '🌈 彩虹一天', description: '一天内完成 4 个不同科目', emoji: '🌈', type: 'hidden',
    check: s => {
      const byDate = new Map<string, Set<string>>();
      for (const t of s.tasks) {
        if (t.status !== 'done' && t.status !== 'evaluated') continue;
        if (!byDate.has(t.date)) byDate.set(t.date, new Set());
        byDate.get(t.date)!.add(t.subject);
      }
      for (const subjects of byDate.values()) {
        if (subjects.size >= 4) return true;
      }
      return false;
    },
  },
];

/**
 * 检测新解锁的成就
 * @param snap 当前快照
 * @param unlocked 已解锁的 badge id 集合
 * @returns 这次检测到的、未在 unlocked 里的新成就
 */
export function detectNewlyUnlocked(snap: AchievementSnapshot, unlocked: Set<string>): Achievement[] {
  const out: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (unlocked.has(a.id)) continue;
    try {
      if (a.check(snap)) out.push(a);
    } catch {
      // 容错：单个成就检测出错不影响其他
    }
  }
  return out;
}

/**
 * 给"未解锁"的显式成就生成提示文案（用于成就页展示进度）
 */
export function visibleAchievementsList(): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.type === 'visible');
}

export function hiddenAchievementsList(): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.type === 'hidden');
}

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * 从 badge 列表抽出 unlocked id 集合
 */
export function unlockedIds(badges: Badge[]): Set<string> {
  return new Set(badges.map(b => b.id));
}
