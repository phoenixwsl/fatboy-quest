// ============================================================
// R5.2.0: 技能券引擎（精简到 4 种）
//
// 设计原则：
//   1. 技能券一律"行为解锁"，不可买（anti-pattern B2）
//   2. 引擎幂等：source 字段是确定性 key
//   3. 4 种：guard / skip / mystery / extend
//   4. 删了：pardon（豁免券机制全删）/ replace / pause / help
//   5. 30 天过期（earnedAt + 30d），expireSweep 在启动时跑
// ============================================================

import type { FatboyDB } from '../db';
import type { SkillCard, SkillCardType } from '../types';
import { isoWeekString } from './time';
import { buildUnlockContext } from './petStats';
import { newId } from './ids';

export const CARD_LIFETIME_MS = 30 * 24 * 3600 * 1000;

// ------------------------------------------------------------
// 卡片描述（UI 用）
// ------------------------------------------------------------

export interface CardSpec {
  emoji: string;
  label: string;
  desc: string;
}

// R5.2.0: 4 种券。pardon/replace/pause/help 全删
export const CARD_SPECS: Record<SkillCardType, CardSpec> = {
  guard:   { emoji: '🛡️', label: '守护卡', desc: '抵 1 次连击中断' },
  extend:  { emoji: '⏱️', label: '延时券', desc: '任务超时缓冲 5 分钟' },
  skip:    { emoji: '⏭️', label: '跳过券', desc: '跳过 1 个非必做任务' },
  mystery: { emoji: '🎁', label: '神秘券', desc: '抽 1 次盲盒' },
  // === 以下已删，保留 spec 仅为兼容老类型字段读取（不再发新卡）===
  pardon:  { emoji: '🌤️', label: '豁免券（已停用）', desc: '机制已下线' },
  replace: { emoji: '🔄', label: '替换券（已停用）', desc: '机制已下线' },
  pause:   { emoji: '⏸️', label: '暂停券（已停用）', desc: '机制已下线' },
  help:    { emoji: '🆘', label: '求助券（已停用）', desc: '机制已下线' },
};

// ------------------------------------------------------------
// 规则：纯函数 → 列出"理想应有的卡片"，引擎对照实际卡补差
// 每张卡的 source 是 deterministic key，幂等保证
// ------------------------------------------------------------

export interface IdealCard {
  type: SkillCardType;
  source: string;
}

export interface RuleContext {
  now: Date;
  longestStreak: number;
  lifetimePoints: number;
  /** 本周 gold 任务数 */
  goldThisWeek: number;
  /** 本季度有评分任务（用于 mystery 简化判断） */
  hasEvaluatedThisQuarter: boolean;
}

interface Rule {
  type: SkillCardType;
  computeIdeals: (ctx: RuleContext) => IdealCard[];
}

export const SKILL_CARD_RULES: Rule[] = [
  // R5.2.0: 4 种券规则
  // guard: 每完成 7 日连击发 1 张（基于 longestStreak / 7）
  {
    type: 'guard',
    computeIdeals: (ctx) => {
      const n = Math.floor(ctx.longestStreak / 7);
      return Array.from({ length: n }, (_, i) => ({
        type: 'guard' as const,
        source: `guard-streak-${(i + 1) * 7}d`,
      }));
    },
  },
  // extend: 本周 gold ≥ 3 → 1 张本周专属
  {
    type: 'extend',
    computeIdeals: (ctx) => {
      if (ctx.goldThisWeek < 3) return [];
      const w = isoWeekString(ctx.now);
      return [{ type: 'extend', source: `extend-week-${w}` }];
    },
  },
  // skip: 每月自动 +1
  {
    type: 'skip',
    computeIdeals: (ctx) => {
      const ym = `${ctx.now.getFullYear()}-${String(ctx.now.getMonth() + 1).padStart(2, '0')}`;
      return [{ type: 'skip', source: `skip-month-${ym}` }];
    },
  },
  // mystery: 每季度，且本季度有任务评分过
  {
    type: 'mystery',
    computeIdeals: (ctx) => {
      if (!ctx.hasEvaluatedThisQuarter) return [];
      const y = ctx.now.getFullYear();
      const q = Math.floor(ctx.now.getMonth() / 3) + 1;
      return [{ type: 'mystery', source: `mystery-quarter-${y}Q${q}` }];
    },
  },
  // R5.2.0 删：replace / pause / pardon / help 不再发新卡
];

// ------------------------------------------------------------
// 引擎：扫一遍所有规则，补差
// ------------------------------------------------------------

export interface EvaluationResult {
  issued: SkillCard[];
}

export async function evaluateAllRules(
  db: FatboyDB,
  now: Date = new Date(),
): Promise<EvaluationResult> {
  const ctx = await buildEngineContext(db, now);
  const allExisting = await db.skillCards.toArray();
  const existingSources = new Set(allExisting.map(c => c.source));

  const issued: SkillCard[] = [];
  for (const rule of SKILL_CARD_RULES) {
    for (const ideal of rule.computeIdeals(ctx)) {
      if (existingSources.has(ideal.source)) continue;
      const card = makeCard(ideal, now.getTime());
      await db.skillCards.add(card);
      issued.push(card);
    }
  }
  return { issued };
}

export function makeCard(ideal: IdealCard, earnedAt: number): SkillCard {
  return {
    id: newId('sk'),
    type: ideal.type,
    source: ideal.source,
    earnedAt,
    expiresAt: earnedAt + CARD_LIFETIME_MS,
  };
}

// ------------------------------------------------------------
// 上下文构建
// ------------------------------------------------------------

export async function buildEngineContext(
  db: FatboyDB,
  now: Date = new Date(),
): Promise<RuleContext> {
  const unlockCtx = await buildUnlockContext(db, now);
  const streak = await db.streak.get('singleton');
  return {
    now,
    longestStreak: streak?.longestStreak ?? 0,
    lifetimePoints: unlockCtx.lifetimePoints,
    goldThisWeek: unlockCtx.byWindow.week.gold,
    hasEvaluatedThisQuarter:
      unlockCtx.byWindow.quarter.bronze +
      unlockCtx.byWindow.quarter.silver +
      unlockCtx.byWindow.quarter.gold > 0,
  };
}

// ------------------------------------------------------------
// 过期清理（启动时跑一次）
// 已使用的卡保留作为审计；未使用且 expiresAt < now 的删
// ------------------------------------------------------------

export async function expireSweep(db: FatboyDB, now: number = Date.now()): Promise<number> {
  const expired = await db.skillCards
    .filter(c => !c.usedAt && c.expiresAt < now)
    .toArray();
  if (expired.length === 0) return 0;
  await db.skillCards.bulkDelete(expired.map(c => c.id));
  return expired.length;
}

// ------------------------------------------------------------
// 库存查询：未使用 + 未过期，按 type 分组
// ------------------------------------------------------------

export interface CardInventory {
  byType: Record<SkillCardType, SkillCard[]>;
  total: number;
}

export function groupByType(cards: SkillCard[], now: number = Date.now()): CardInventory {
  const byType = {} as Record<SkillCardType, SkillCard[]>;
  for (const t of Object.keys(CARD_SPECS) as SkillCardType[]) byType[t] = [];
  let total = 0;
  for (const c of cards) {
    if (c.usedAt) continue;
    if (c.expiresAt < now) continue;
    byType[c.type].push(c);
    total++;
  }
  return { byType, total };
}

// ------------------------------------------------------------
// 使用一张卡：标 usedAt（不真删，留审计）
// ------------------------------------------------------------

export async function consumeCard(
  db: FatboyDB,
  type: SkillCardType,
  refId?: string,
  now: number = Date.now(),
): Promise<SkillCard | null> {
  const candidates = await db.skillCards
    .where('type').equals(type)
    .filter(c => !c.usedAt && c.expiresAt > now)
    .toArray();
  // 优先用快过期的
  candidates.sort((a, b) => a.expiresAt - b.expiresAt);
  const card = candidates[0];
  if (!card) return null;
  await db.skillCards.update(card.id, { usedAt: now, consumedRefId: refId });
  return card;
}
