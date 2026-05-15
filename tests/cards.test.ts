// R5.2.0: 卡牌引擎测试
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import {
  CARD_CATALOG, issueCard, groupCards,
  checkAndIssueFocus, checkAndIssuePerfectDay, checkAndIssueWeekendWarrior,
  checkAndIssueEarlyBird, checkAndIssueNightOwl, checkAndIssueRainbowDay, checkAndIssueMarathon,
} from '../src/lib/cards';
import type { CollectibleCard, Task, Evaluation } from '../src/types';

async function reset() {
  await db.delete();
  await db.open();
}

beforeEach(async () => {
  await reset();
});

describe('CARD_CATALOG', () => {
  it('has 7 card types (R5.4.0: +4 new)', () => {
    expect(Object.keys(CARD_CATALOG)).toHaveLength(7);
    expect(CARD_CATALOG.focus).toBeDefined();
    expect(CARD_CATALOG['perfect-day']).toBeDefined();
    expect(CARD_CATALOG['weekend-warrior']).toBeDefined();
    expect(CARD_CATALOG['early-bird']).toBeDefined();
    expect(CARD_CATALOG['night-owl']).toBeDefined();
    expect(CARD_CATALOG['rainbow-day']).toBeDefined();
    expect(CARD_CATALOG.marathon).toBeDefined();
  });
});

describe('issueCard', () => {
  it('issues a card with id + earnedAt', async () => {
    const card = await issueCard(db, 'focus');
    expect(card).not.toBeNull();
    expect(card!.type).toBe('focus');
    expect(card!.id).toMatch(/^card_/);
    expect(card!.earnedAt).toBeGreaterThan(0);
  });

  it('oncePerDay: same day → second issue returns null', async () => {
    const day = new Date('2026-05-15T10:00:00').getTime();
    const a = await issueCard(db, 'focus', { oncePerDay: true, now: day });
    expect(a).not.toBeNull();
    const b = await issueCard(db, 'focus', { oncePerDay: true, now: day + 1000 });
    expect(b).toBeNull();
  });

  it('oncePerDay: next day allows new issue', async () => {
    const d1 = new Date('2026-05-15T10:00:00').getTime();
    const d2 = new Date('2026-05-16T10:00:00').getTime();
    await issueCard(db, 'focus', { oncePerDay: true, now: d1 });
    const b = await issueCard(db, 'focus', { oncePerDay: true, now: d2 });
    expect(b).not.toBeNull();
  });
});

describe('checkAndIssueFocus', () => {
  const baseT: Task = {
    id: 't1', title: 'gold long', date: '2026-05-15',
    basePoints: 10, estimatedMinutes: 30,
    subject: 'math', status: 'evaluated', createdAt: 1,
    actualStartedAt: 1_700_000_000_000, completedAt: 1_700_000_000_000 + 30 * 60 * 1000,  // 30 分钟
  } as Task;

  it('issues focus card when actual >= 30min', async () => {
    const card = await checkAndIssueFocus(db, baseT);
    expect(card).not.toBeNull();
    expect(card!.type).toBe('focus');
    expect(card!.context).toBe('t1');
  });

  it('no card if actual < 30min', async () => {
    const t: Task = { ...baseT, completedAt: baseT.actualStartedAt! + 20 * 60 * 1000 };
    const card = await checkAndIssueFocus(db, t);
    expect(card).toBeNull();
  });

  it('only 1 focus card per day', async () => {
    const today = new Date('2026-05-15T10:00:00').getTime();
    const c1 = await checkAndIssueFocus(db, baseT, today);
    expect(c1).not.toBeNull();
    const c2 = await checkAndIssueFocus(db, { ...baseT, id: 't2' }, today + 60000);
    expect(c2).toBeNull();
  });
});

describe('checkAndIssuePerfectDay', () => {
  async function seedTask(id: string, evalDelta: Partial<Evaluation> = {}) {
    await db.tasks.add({
      id, title: id, date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1,
      evaluationId: 'e_' + id,
    } as Task);
    await db.evaluations.add({
      id: 'e_' + id, taskId: id, basePointsAtEval: 10,
      completion: 5, quality: 5, attitude: 5,
      evaluatedAt: 1, finalPoints: 12,
      ...evalDelta,
    } as Evaluation);
  }

  it('issues card when all evaluated are perfect', async () => {
    await seedTask('a');
    await seedTask('b');
    const now = new Date('2026-05-15T20:00:00').getTime();
    const card = await checkAndIssuePerfectDay(db, now);
    expect(card).not.toBeNull();
    expect(card!.type).toBe('perfect-day');
  });

  it('no card if any task is not perfect', async () => {
    await seedTask('a');
    await seedTask('b', { completion: 4 });
    const now = new Date('2026-05-15T20:00:00').getTime();
    const card = await checkAndIssuePerfectDay(db, now);
    expect(card).toBeNull();
  });

  it('no card if no evaluated tasks today', async () => {
    const now = new Date('2026-05-15T20:00:00').getTime();
    const card = await checkAndIssuePerfectDay(db, now);
    expect(card).toBeNull();
  });

  it('only 1 per day', async () => {
    await seedTask('a');
    const now = new Date('2026-05-15T20:00:00').getTime();
    const c1 = await checkAndIssuePerfectDay(db, now);
    expect(c1).not.toBeNull();
    const c2 = await checkAndIssuePerfectDay(db, now + 1000);
    expect(c2).toBeNull();
  });
});

describe('checkAndIssueWeekendWarrior', () => {
  async function seedDoneTask(id: string, date: string, status: 'done' | 'evaluated' = 'done') {
    await db.tasks.add({
      id, title: id, date,
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status, createdAt: 1,
    } as Task);
  }

  it('issues card on Saturday when all done', async () => {
    const sat = new Date('2026-05-16T20:00:00');  // Saturday
    await seedDoneTask('a', '2026-05-16');
    await seedDoneTask('b', '2026-05-16', 'evaluated');
    const card = await checkAndIssueWeekendWarrior(db, sat.getTime());
    expect(card).not.toBeNull();
    expect(card!.type).toBe('weekend-warrior');
  });

  it('no card on weekday', async () => {
    const wed = new Date('2026-05-13T20:00:00');  // Wednesday
    await seedDoneTask('a', '2026-05-13');
    const card = await checkAndIssueWeekendWarrior(db, wed.getTime());
    expect(card).toBeNull();
  });

  it('no card if some tasks not done', async () => {
    const sat = new Date('2026-05-16T20:00:00');
    await seedDoneTask('a', '2026-05-16');
    await db.tasks.add({
      id: 'b', title: 'b', date: '2026-05-16',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'pending', createdAt: 1,
    } as Task);
    const card = await checkAndIssueWeekendWarrior(db, sat.getTime());
    expect(card).toBeNull();
  });
});

// ============================================================
// R5.4.0: 4 张新卡触发器
// ============================================================
describe('checkAndIssueEarlyBird', () => {
  it('issues card when completedAt < 8:00', async () => {
    const earlyMorning = new Date('2026-05-15T07:30:00').getTime();
    const t: Task = {
      id: 't', title: 'x', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1, completedAt: earlyMorning,
    } as Task;
    const card = await checkAndIssueEarlyBird(db, t, earlyMorning);
    expect(card).not.toBeNull();
    expect(card!.type).toBe('early-bird');
  });
  it('no card when completedAt ≥ 8:00', async () => {
    const morning = new Date('2026-05-15T08:01:00').getTime();
    const t: Task = {
      id: 't', title: 'x', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1, completedAt: morning,
    } as Task;
    expect(await checkAndIssueEarlyBird(db, t, morning)).toBeNull();
  });
});

describe('checkAndIssueNightOwl', () => {
  it('issues card when completedAt ≥ 21:00', async () => {
    const night = new Date('2026-05-15T21:30:00').getTime();
    const t: Task = {
      id: 't', title: 'x', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1, completedAt: night,
    } as Task;
    const card = await checkAndIssueNightOwl(db, t, night);
    expect(card).not.toBeNull();
    expect(card!.type).toBe('night-owl');
  });
  it('no card when completedAt < 21:00', async () => {
    const evening = new Date('2026-05-15T20:59:00').getTime();
    const t: Task = {
      id: 't', title: 'x', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1, completedAt: evening,
    } as Task;
    expect(await checkAndIssueNightOwl(db, t, evening)).toBeNull();
  });
});

describe('checkAndIssueRainbowDay', () => {
  async function seedDoneTask(id: string, subject: any) {
    await db.tasks.add({
      id, title: id, date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject,
      status: 'done', createdAt: 1,
    } as Task);
  }
  it('issues card when ≥ 3 different subjects done', async () => {
    const now = new Date('2026-05-15T20:00:00').getTime();
    await seedDoneTask('a', 'math');
    await seedDoneTask('b', 'chinese');
    await seedDoneTask('c', 'english');
    const card = await checkAndIssueRainbowDay(db, now);
    expect(card).not.toBeNull();
  });
  it('no card when < 3 subjects', async () => {
    const now = new Date('2026-05-15T20:00:00').getTime();
    await seedDoneTask('a', 'math');
    await seedDoneTask('b', 'math');
    expect(await checkAndIssueRainbowDay(db, now)).toBeNull();
  });
});

describe('checkAndIssueMarathon', () => {
  it('issues card when ≥ 5 tasks done in a day', async () => {
    const now = new Date('2026-05-15T20:00:00').getTime();
    for (let i = 0; i < 5; i++) {
      await db.tasks.add({
        id: `t${i}`, title: `t${i}`, date: '2026-05-15',
        basePoints: 10, estimatedMinutes: 10, subject: 'math',
        status: 'done', createdAt: i,
      } as Task);
    }
    const card = await checkAndIssueMarathon(db, now);
    expect(card).not.toBeNull();
    expect(card!.type).toBe('marathon');
  });
  it('no card when < 5 tasks done', async () => {
    const now = new Date('2026-05-15T20:00:00').getTime();
    for (let i = 0; i < 4; i++) {
      await db.tasks.add({
        id: `t${i}`, title: `t${i}`, date: '2026-05-15',
        basePoints: 10, estimatedMinutes: 10, subject: 'math',
        status: 'done', createdAt: i,
      } as Task);
    }
    expect(await checkAndIssueMarathon(db, now)).toBeNull();
  });
});

describe('groupCards', () => {
  it('groups by type', () => {
    const cards: CollectibleCard[] = [
      { id: 'a', type: 'focus', earnedAt: 1 },
      { id: 'b', type: 'focus', earnedAt: 2 },
      { id: 'c', type: 'perfect-day', earnedAt: 3 },
    ];
    const inv = groupCards(cards);
    expect(inv.byType.focus.length).toBe(2);
    expect(inv.byType['perfect-day'].length).toBe(1);
    expect(inv.byType['weekend-warrior'].length).toBe(0);
    expect(inv.total).toBe(3);
  });
});
