// R4.3.0: 技能券引擎测试
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import {
  evaluateAllRules, expireSweep, groupByType, consumeCard,
  CARD_LIFETIME_MS, CARD_SPECS, makeCard,
} from '../src/lib/skillCards';
import { isoWeekString } from '../src/lib/time';
import type { SkillCard, Task, Evaluation } from '../src/types';

const DAY = 24 * 3600 * 1000;

async function reset() {
  await db.delete();
  await db.open();
}

beforeEach(async () => {
  await reset();
});

// ----------------------------------------------------------
describe('CARD_SPECS', () => {
  it('has every type defined', () => {
    expect(CARD_SPECS.guard).toBeDefined();
    expect(CARD_SPECS.pardon).toBeDefined();
    expect(CARD_SPECS.extend).toBeDefined();
    expect(CARD_SPECS.replace).toBeDefined();
    expect(CARD_SPECS.pause).toBeDefined();
    expect(CARD_SPECS.help).toBeDefined();
    expect(CARD_SPECS.skip).toBeDefined();
    expect(CARD_SPECS.mystery).toBeDefined();
  });
});

// ----------------------------------------------------------
describe('makeCard', () => {
  it('creates card with 30-day expiry', () => {
    const t0 = Date.now();
    const card = makeCard({ type: 'replace', source: 'replace-week-2026-W20' }, t0);
    expect(card.type).toBe('replace');
    expect(card.expiresAt - card.earnedAt).toBe(CARD_LIFETIME_MS);
  });
});

// ----------------------------------------------------------
describe('evaluateAllRules — skip card monthly (R5.2.0: replace 删了，skip 保留)', () => {
  it('issues 1 skip card on first run for current month', async () => {
    const r = await evaluateAllRules(db);
    const skip = r.issued.filter(c => c.type === 'skip');
    expect(skip.length).toBe(1);
    expect(skip[0].source).toContain('skip-month-');
  });

  it('is idempotent — second run same month issues nothing', async () => {
    await evaluateAllRules(db);
    const before = await db.skillCards.count();
    const r2 = await evaluateAllRules(db);
    expect(r2.issued).toEqual([]);
    const after = await db.skillCards.count();
    expect(after).toBe(before);
  });

  it('issues a fresh skip card after a month boundary', async () => {
    const m1 = new Date('2026-05-12T10:00:00');
    const m2 = new Date('2026-06-12T10:00:00');
    await evaluateAllRules(db, m1);
    const before = await db.skillCards.count();
    await evaluateAllRules(db, m2);
    const after = await db.skillCards.count();
    expect(after).toBeGreaterThan(before);
  });
});

// ----------------------------------------------------------
describe('evaluateAllRules — guard card per 7-day streak (R5.2.0: pause 删了，guard 替代)', () => {
  async function setStreak(longest: number) {
    await db.streak.put({
      id: 'singleton', currentStreak: longest, longestStreak: longest,
      lastFullDate: null, guardCards: 0, lastWeeklyGiftWeek: null,
    });
  }

  it('issues 0 guard cards when longestStreak < 7', async () => {
    await setStreak(3);
    const r = await evaluateAllRules(db);
    expect(r.issued.filter(c => c.type === 'guard').length).toBe(0);
  });

  it('issues N guard cards when longestStreak crosses N×7', async () => {
    await setStreak(21);
    const r = await evaluateAllRules(db);
    const guard = r.issued.filter(c => c.type === 'guard');
    expect(guard.length).toBe(3);    // floor(21/7) = 3
  });

  it('is idempotent for guard cards', async () => {
    await setStreak(14);
    await evaluateAllRules(db);
    const before = await db.skillCards.where('type').equals('guard').count();
    await evaluateAllRules(db);
    const after = await db.skillCards.where('type').equals('guard').count();
    expect(after).toBe(before);
  });
});

// ----------------------------------------------------------
describe('evaluateAllRules — extend card weekly when ≥3 gold', () => {
  async function seedGoldEvaluatedTask(id: string, when: Date) {
    const ts = when.getTime();
    await db.tasks.add({
      id, title: 'gold-' + id, date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: ts,
      completedAt: ts, evaluationId: 'e_' + id,
      difficulty: 'gold',
    } as Task);
    await db.evaluations.add({
      id: 'e_' + id, taskId: id, basePointsAtEval: 10,
      completion: 5, quality: 5, attitude: 5,
      evaluatedAt: ts, finalPoints: 12,
    } as Evaluation);
  }

  it('issues no extend when fewer than 3 gold this week', async () => {
    const now = new Date('2026-05-13T10:00:00');
    await seedGoldEvaluatedTask('g1', now);
    await seedGoldEvaluatedTask('g2', now);
    const r = await evaluateAllRules(db, now);
    expect(r.issued.filter(c => c.type === 'extend').length).toBe(0);
  });

  it('issues 1 extend when 3 gold this week', async () => {
    const now = new Date('2026-05-13T10:00:00');
    await seedGoldEvaluatedTask('g1', now);
    await seedGoldEvaluatedTask('g2', now);
    await seedGoldEvaluatedTask('g3', now);
    const r = await evaluateAllRules(db, now);
    const extend = r.issued.filter(c => c.type === 'extend');
    expect(extend.length).toBe(1);
    expect(extend[0].source).toBe(`extend-week-${isoWeekString(now)}`);
  });

  it('does not double-issue in same week', async () => {
    const now = new Date('2026-05-13T10:00:00');
    for (const id of ['g1', 'g2', 'g3', 'g4']) await seedGoldEvaluatedTask(id, now);
    await evaluateAllRules(db, now);
    const r2 = await evaluateAllRules(db, now);
    expect(r2.issued.filter(c => c.type === 'extend').length).toBe(0);
  });
});

// ----------------------------------------------------------
describe('evaluateAllRules — mystery card per quarter', () => {
  it('issues nothing when no evaluated tasks this quarter', async () => {
    const r = await evaluateAllRules(db);
    expect(r.issued.filter(c => c.type === 'mystery').length).toBe(0);
  });

  it('issues 1 mystery when at least one evaluated task this quarter', async () => {
    const now = new Date('2026-05-15T10:00:00');
    await db.tasks.add({
      id: 't1', title: 'a', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: now.getTime(),
      completedAt: now.getTime(), difficulty: 'bronze',
    } as Task);
    const r = await evaluateAllRules(db, now);
    expect(r.issued.filter(c => c.type === 'mystery').length).toBe(1);
  });
});

// ----------------------------------------------------------
describe('expireSweep', () => {
  it('removes expired unused cards', async () => {
    const now = Date.now();
    await db.skillCards.bulkAdd([
      { id: 'c1', type: 'extend', source: 's1', earnedAt: now - 60 * DAY, expiresAt: now - 30 * DAY },
      { id: 'c2', type: 'extend', source: 's2', earnedAt: now,            expiresAt: now + 10 * DAY },
    ] as SkillCard[]);
    const removed = await expireSweep(db);
    expect(removed).toBe(1);
    const left = await db.skillCards.toArray();
    expect(left).toHaveLength(1);
    expect(left[0].id).toBe('c2');
  });

  it('does not remove already-used cards even if expired', async () => {
    const now = Date.now();
    await db.skillCards.add({
      id: 'used', type: 'extend', source: 's', earnedAt: now - 60 * DAY,
      expiresAt: now - 30 * DAY, usedAt: now - 31 * DAY,
    } as SkillCard);
    const removed = await expireSweep(db);
    expect(removed).toBe(0);
  });
});

// ----------------------------------------------------------
describe('groupByType', () => {
  it('groups by type, excludes used + expired', async () => {
    const now = Date.now();
    const cards: SkillCard[] = [
      { id: 'a', type: 'extend', source: 's1', earnedAt: now, expiresAt: now + 10 * DAY },
      { id: 'b', type: 'extend', source: 's2', earnedAt: now, expiresAt: now + 10 * DAY },
      { id: 'c', type: 'replace', source: 's3', earnedAt: now, expiresAt: now + 10 * DAY },
      { id: 'd', type: 'extend', source: 's4', earnedAt: now, expiresAt: now + 10 * DAY, usedAt: now },  // used
      { id: 'e', type: 'extend', source: 's5', earnedAt: now, expiresAt: now - 1 },  // expired
    ];
    const inv = groupByType(cards, now);
    expect(inv.byType.extend.length).toBe(2);
    expect(inv.byType.replace.length).toBe(1);
    expect(inv.total).toBe(3);
  });
});

// ----------------------------------------------------------
describe('consumeCard', () => {
  it('returns null when no card available', async () => {
    const r = await consumeCard(db, 'extend');
    expect(r).toBeNull();
  });

  it('consumes the soonest-to-expire card first', async () => {
    const now = Date.now();
    await db.skillCards.bulkAdd([
      { id: 'a', type: 'extend', source: 's1', earnedAt: now, expiresAt: now + 20 * DAY },
      { id: 'b', type: 'extend', source: 's2', earnedAt: now, expiresAt: now + 5 * DAY },  // 优先用这个
    ] as SkillCard[]);
    const r = await consumeCard(db, 'extend', 'task-x');
    expect(r?.id).toBe('b');
    const cardB = await db.skillCards.get('b');
    expect(cardB?.usedAt).toBeDefined();
    expect(cardB?.consumedRefId).toBe('task-x');
  });

  it('skips already-used cards', async () => {
    const now = Date.now();
    await db.skillCards.bulkAdd([
      { id: 'a', type: 'extend', source: 's1', earnedAt: now, expiresAt: now + 20 * DAY, usedAt: now - 1000 },
      { id: 'b', type: 'extend', source: 's2', earnedAt: now, expiresAt: now + 30 * DAY },
    ] as SkillCard[]);
    const r = await consumeCard(db, 'extend');
    expect(r?.id).toBe('b');
  });
});
