// ============================================================
// R5.2.0: 里程碑引擎（Badge）
//
// Badge 是一次性成就：达成一次永久解锁，重复触发不重发。
// 与卡牌（CollectibleCard，可重复堆叠）、券（SkillCard，消费品）正交。
//
// 触发：evaluate.ts、streak.ts、ShopPage.redeem、LevelUpWatcher 各自调用对应 check 函数
// 数据：复用现有 db.badges 表（id 唯一即天然幂等）
// 奖励：rewardTitle 触发时写入 Pet.unlockedTitles（其他 reward R5.3+ 实施）
// ============================================================

import type { FatboyDB } from '../db';
import type { Badge, Task, Evaluation } from '../types';
import { isPerfectEval, isLongTask } from './unlockCondition';

export interface BadgeSpec {
  emoji: string;
  name: string;
  description: string;
  /** 解锁的称号（写入 Pet.unlockedTitles） */
  rewardTitle?: string;
  /** 解锁的皮肤 id（R5.3+ 真实施） */
  rewardSkin?: string;
  /** 解锁的主题 id（R5.3+ 真实施） */
  rewardTheme?: string;
  /** 类别（用于成就馆分组）*/
  category: 'first' | 'streak' | 'level';
}

// ============================================================
// Catalog（首批 12 种）
// ============================================================
export const BADGE_CATALOG: Record<string, BadgeSpec> = {
  // === 里程碑：第一次系列 ===
  'first-perfect': {
    emoji: '💯', name: '第一个完美任务',
    description: '你第一次拿到三维全 5',
    rewardTitle: '完美初体验',
    category: 'first',
  },
  'first-redemption': {
    emoji: '🎁', name: '第一次兑换',
    description: '你第一次在商店换到东西',
    rewardTitle: '购物达人',
    category: 'first',
  },
  'first-gold-task': {
    emoji: '🥇', name: '第一个金任务',
    description: '你第一次完成 3 星难度任务',
    rewardTitle: '挑战者',
    category: 'first',
  },
  'first-long-task': {
    emoji: '🎯', name: '第一个长任务',
    description: '你第一次专注 30 分钟以上',
    rewardTitle: '小专注王',
    category: 'first',
  },

  // === 里程碑：连击系列 ===
  'streak-7': {
    emoji: '🔥', name: '连击 7 日',
    description: '连续 7 天都达标',
    rewardTitle: '小坚持',
    category: 'streak',
  },
  'streak-14': {
    emoji: '🔥🔥', name: '连击 14 日',
    description: '连续 14 天都达标',
    rewardTitle: '坚持者',
    rewardSkin: 'streak-14-skin',
    category: 'streak',
  },
  'streak-30': {
    emoji: '🔥🔥🔥', name: '连击 30 日',
    description: '连续 30 天都达标，了不起',
    rewardTitle: '月亮坚持者',
    rewardTheme: 'streak-30-theme',
    category: 'streak',
  },
  'streak-100': {
    emoji: '👑', name: '百日连击王',
    description: '100 天，时间的朋友',
    rewardTitle: '时间的朋友',
    category: 'streak',
  },

  // === 里程碑：等级系列（与 levels.ts 联动） ===
  'level-up-2': { emoji: '⬆️',  name: '升级 Lv 2', description: '累计 500 终身积分', rewardTitle: '坚持的肥仔', category: 'level' },
  'level-up-3': { emoji: '⬆️⬆️', name: '升级 Lv 3', description: '累计 2000 终身积分', rewardTitle: '闯关熟练工', category: 'level' },
  'level-up-4': { emoji: '⬆️⬆️⬆️', name: '升级 Lv 4', description: '累计 5000 终身积分', rewardTitle: '任务征服者', category: 'level' },
  'level-up-5': { emoji: '🏆', name: '升级 Lv 5', description: '累计 10000 终身积分', rewardTitle: '长跑者', category: 'level' },
  'level-up-6': { emoji: '👑', name: '升级 Lv 6', description: '累计 20000 终身积分', rewardTitle: '时间的朋友', category: 'level' },
};

// ============================================================
// 通用：发一个 badge（幂等 + apply rewardTitle）
// ============================================================
export async function issueBadge(db: FatboyDB, id: string, now: number = Date.now()): Promise<Badge | null> {
  const spec = BADGE_CATALOG[id];
  if (!spec) return null;

  const existing = await db.badges.get(id);
  if (existing) return null;     // 已解锁，幂等返回

  const badge: Badge = { id, unlockedAt: now };
  await db.badges.add(badge);

  // 解锁 reward title → Pet.unlockedTitles
  if (spec.rewardTitle) {
    const pet = await db.pet.get('singleton');
    if (pet) {
      const titles = pet.unlockedTitles ?? [];
      if (!titles.includes(spec.rewardTitle)) {
        await db.pet.update('singleton', {
          unlockedTitles: [...titles, spec.rewardTitle],
        });
      }
    }
  }
  // R5.3+：rewardSkin / rewardTheme 真实施留待后续

  return badge;
}

// ============================================================
// 触发器：evaluate.ts 调用
// ============================================================

/** 第一个完美任务：evaluation 是 perfect + 此 badge 没解锁 */
export async function checkFirstPerfect(db: FatboyDB, evaluation: Pick<Evaluation, 'completion' | 'quality' | 'attitude'>) {
  if (!isPerfectEval(evaluation)) return null;
  return issueBadge(db, 'first-perfect');
}

/** 第一个金任务：task.difficulty === 'gold' */
export async function checkFirstGoldTask(db: FatboyDB, task: Task) {
  if (task.difficulty !== 'gold') return null;
  return issueBadge(db, 'first-gold-task');
}

/** 第一个长任务：实际 ≥ 30min */
export async function checkFirstLongTask(db: FatboyDB, task: Task) {
  if (!isLongTask({ actualStartedAt: task.actualStartedAt, completedAt: task.completedAt })) return null;
  return issueBadge(db, 'first-long-task');
}

/** 第一次兑换：在 ShopPage redeem 后调用 */
export async function checkFirstRedemption(db: FatboyDB) {
  const count = await db.redemptions.count();
  if (count === 0) return null;
  return issueBadge(db, 'first-redemption');
}

/** 连击里程碑：在 streak.ts applyDayComplete 后调用 */
export async function checkStreakMilestones(db: FatboyDB, currentStreak: number) {
  const issued: Badge[] = [];
  const thresholds = [7, 14, 30, 100];
  for (const t of thresholds) {
    if (currentStreak >= t) {
      const id = `streak-${t}`;
      const b = await issueBadge(db, id);
      if (b) issued.push(b);
    }
  }
  return issued;
}

/** 等级里程碑：在 LevelUpWatcher 检测到升级后调用 */
export async function checkLevelMilestone(db: FatboyDB, newLevel: number) {
  const id = `level-up-${newLevel}`;
  return issueBadge(db, id);
}

// ============================================================
// 库存查询（AchievementsPage 用）
// ============================================================

export interface BadgeInventory {
  unlocked: Array<{ id: string; spec: BadgeSpec; unlockedAt: number }>;
  locked: Array<{ id: string; spec: BadgeSpec }>;
  byCategory: Record<BadgeSpec['category'], { unlocked: number; total: number }>;
}

export async function getBadgeInventory(db: FatboyDB): Promise<BadgeInventory> {
  const all = await db.badges.toArray();
  const unlockedSet = new Map(all.map(b => [b.id, b.unlockedAt]));

  const unlocked: BadgeInventory['unlocked'] = [];
  const locked: BadgeInventory['locked'] = [];
  for (const [id, spec] of Object.entries(BADGE_CATALOG)) {
    if (unlockedSet.has(id)) {
      unlocked.push({ id, spec, unlockedAt: unlockedSet.get(id)! });
    } else {
      locked.push({ id, spec });
    }
  }

  const byCategory: BadgeInventory['byCategory'] = {
    first:  { unlocked: 0, total: 0 },
    streak: { unlocked: 0, total: 0 },
    level:  { unlocked: 0, total: 0 },
  };
  for (const spec of Object.values(BADGE_CATALOG)) byCategory[spec.category].total++;
  for (const u of unlocked) byCategory[u.spec.category].unlocked++;

  return { unlocked, locked, byCategory };
}
