// ============================================================
// R4.3.0: Mastery framing 文案生成
//
// 用途：商店兑换瞬间弹一句具体反馈，把"你赚了 N 分扣了 N 分"换成
// "你这周完成了 X 个任务，最难的是周三的应用题"。
//
// 哲学（kid-rewards skill, principles.md #10 Dweck mastery）：
// performance 框架长期削弱挑战意愿；mastery 框架强化"我做到了什么"
// 身份认同。
//
// 4 个模板 + 实时数据填充，随机选一个避免每次重复。
// ============================================================

import type { FatboyDB } from '../db';
import type { ShopItem, Task } from '../types';
import { aggregateCounts } from './petStats';

export interface MasteryContext {
  /** 本周已评分任务数 */
  weeklyEvaluated: number;
  /** 本周最难的任务（gold > silver > bronze），含完成度的 tie-break */
  hardestThisWeek?: { title: string; difficulty: 'bronze' | 'silver' | 'gold' };
  /** 当前连击天数 */
  currentStreak: number;
  /** 最近 30 天内 gold 任务数 */
  monthGold: number;
  /** 累计兑换次数（含本次之前） */
  totalRedemptionsBefore: number;
  /** 距今天距离首个 PointsEntry 的天数（含 0） */
  daysSinceStart: number;
}

export async function buildMasteryContext(db: FatboyDB, now: Date = new Date()): Promise<MasteryContext> {
  const allEvalTasks = await db.tasks.where('status').equals('evaluated').toArray();
  const evals = await db.evaluations.toArray();
  const evalById = new Map(evals.map(e => [e.id, e]));
  const counts = aggregateCounts(allEvalTasks, evalById, now);

  const streak = await db.streak.get('singleton');

  // 本周任务（按 completedAt 在 week window 内）
  const weekStart = startOfWeek(now);
  const weekTasks = allEvalTasks.filter(t => (t.completedAt ?? 0) >= weekStart);
  const hardest = pickHardest(weekTasks);

  const allRedemptions = await db.redemptions.count();
  const allPoints = await db.points.toArray();
  const firstTs = allPoints.length > 0 ? Math.min(...allPoints.map(p => p.ts)) : now.getTime();
  const daysSinceStart = Math.max(0, Math.floor((now.getTime() - firstTs) / (24 * 3600 * 1000)));

  return {
    weeklyEvaluated: weekTasks.length,
    hardestThisWeek: hardest,
    currentStreak: streak?.currentStreak ?? 0,
    monthGold: counts.month.gold,
    totalRedemptionsBefore: allRedemptions,
    daysSinceStart,
  };
}

function startOfWeek(now: Date): number {
  const day = now.getDay() || 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function pickHardest(tasks: Task[]): MasteryContext['hardestThisWeek'] {
  if (tasks.length === 0) return undefined;
  const order: Record<string, number> = { bronze: 1, silver: 2, gold: 3 };
  let best: Task | undefined;
  let bestRank = 0;
  for (const t of tasks) {
    const d = (t.difficulty ?? 'bronze') as 'bronze' | 'silver' | 'gold';
    const rank = order[d];
    if (rank > bestRank) { bestRank = rank; best = t; }
  }
  if (!best) return undefined;
  return { title: best.title, difficulty: (best.difficulty ?? 'bronze') as 'bronze' | 'silver' | 'gold' };
}

// ------------------------------------------------------------
// 4 个模板 — 每个有触发条件，从适用的里面随机挑
// ------------------------------------------------------------

export interface MasteryTemplate {
  id: string;
  /** 该模板能否在当前 context 下用 */
  applicable: (ctx: MasteryContext) => boolean;
  render: (ctx: MasteryContext, item: ShopItem) => string;
}

export const MASTERY_TEMPLATES: MasteryTemplate[] = [
  {
    id: 'weekly-hardest',
    applicable: (c) => c.weeklyEvaluated > 0 && !!c.hardestThisWeek,
    render: (c, item) => {
      const dLabel = c.hardestThisWeek!.difficulty === 'gold' ? '金' :
                     c.hardestThisWeek!.difficulty === 'silver' ? '银' : '铜';
      return `这周你完成了 ${c.weeklyEvaluated} 个任务，最难的是「${c.hardestThisWeek!.title}」（${dLabel}）。这份 ${item.name} 是它换来的。`;
    },
  },
  {
    id: 'streak-stable',
    applicable: (c) => c.currentStreak >= 3,
    render: (c, item) => `你已经连击 ${c.currentStreak} 天了——稳得很。${item.name} 是这份坚持的奖励。`,
  },
  {
    id: 'month-gold',
    applicable: (c) => c.monthGold >= 1,
    render: (c, item) => `这个月你的金任务做了 ${c.monthGold} 个。${item.name} 是它换来的。`,
  },
  {
    id: 'journey',
    applicable: (c) => c.daysSinceStart >= 1,
    render: (c, item) =>
      `从你开始用「闯关」到现在 ${c.daysSinceStart} 天了，这是第 ${c.totalRedemptionsBefore + 1} 个奖励。`,
  },
];

/**
 * 从适用模板里随机挑一个；都不适用时返回 fallback
 */
export function pickMasteryFlavor(
  ctx: MasteryContext,
  item: ShopItem,
  rng: () => number = Math.random,
): string {
  const applicable = MASTERY_TEMPLATES.filter(t => t.applicable(ctx));
  if (applicable.length === 0) {
    return `${item.name} 是你赚来的——好好享用。`;
  }
  const t = applicable[Math.floor(rng() * applicable.length)];
  return t.render(ctx, item);
}
