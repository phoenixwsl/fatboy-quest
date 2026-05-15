// R4.1.0: petStats — derived 任务计数 helper
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import {
  getLifetimePoints, aggregateCounts, buildUnlockContext,
} from '../src/lib/petStats';
import type { Task, Evaluation } from '../src/types';

async function reset() {
  await db.delete();
  await db.open();
}

beforeEach(async () => {
  await reset();
});

describe('getLifetimePoints', () => {
  it('sums only positive deltas', async () => {
    await db.points.bulkAdd([
      { id: 'p1', ts: 1, delta: 100, reason: 'task' },
      { id: 'p2', ts: 2, delta: -30, reason: 'shop_redeem' },
      { id: 'p3', ts: 3, delta: 50,  reason: 'task' },
      { id: 'p4', ts: 4, delta: -20, reason: 'shop_redeem' },
    ]);
    expect(await getLifetimePoints(db)).toBe(150);
  });
  it('returns 0 when no entries', async () => {
    expect(await getLifetimePoints(db)).toBe(0);
  });
});

describe('aggregateCounts (pure)', () => {
  const now = new Date('2026-05-15T12:00:00');  // Friday
  it('counts bronze/silver/gold by lifetime', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'a', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 1, evaluationId: 'e1', completedAt: now.getTime() - 1000, difficulty: 'bronze' },
      { id: 't2', title: 'b', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 2, evaluationId: 'e2', completedAt: now.getTime() - 1000, difficulty: 'silver' },
      { id: 't3', title: 'c', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 3, evaluationId: 'e3', completedAt: now.getTime() - 1000, difficulty: 'gold' },
    ];
    const evals = new Map<string, Evaluation>();
    for (const t of tasks) {
      evals.set(t.evaluationId!, {
        id: t.evaluationId!, taskId: t.id, basePointsAtEval: 10,
        completion: 5, quality: 5, attitude: 5,
        evaluatedAt: t.completedAt!, finalPoints: 10,
      });
    }
    const counts = aggregateCounts(tasks, evals, now);
    expect(counts.lifetime.bronze).toBe(1);
    expect(counts.lifetime.silver).toBe(1);
    expect(counts.lifetime.gold).toBe(1);
    expect(counts.lifetime.perfect).toBe(3);
  });

  it('counts longTask only when actualStartedAt+completedAt span ≥ 30min', () => {
    const ts = now.getTime() - 1000;
    const tasks: Task[] = [
      // 长任务
      { id: 't1', title: 'long', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 1, completedAt: ts, actualStartedAt: ts - 30 * 60 * 1000, difficulty: 'gold' },
      // 短任务
      { id: 't2', title: 'short', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 2, completedAt: ts, actualStartedAt: ts - 5 * 60 * 1000, difficulty: 'bronze' },
      // 缺 actualStartedAt
      { id: 't3', title: 'no-start', date: '2026-05-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 3, completedAt: ts, difficulty: 'bronze' },
    ];
    const counts = aggregateCounts(tasks, new Map(), now);
    expect(counts.lifetime.long).toBe(1);
  });

  it('partitions by week / month / quarter window', () => {
    const tasks: Task[] = [
      // 本周（5/15 周五，本周一是 5/11）
      { id: 'tweek', title: 'w', date: '2026-05-13', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 1, completedAt: new Date('2026-05-13').getTime(), difficulty: 'bronze' },
      // 上周
      { id: 'tlastw', title: 'lw', date: '2026-05-05', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 2, completedAt: new Date('2026-05-05').getTime(), difficulty: 'bronze' },
      // 上季度
      { id: 'told', title: 'old', date: '2026-01-15', basePoints: 10, estimatedMinutes: 10, subject: 'math', status: 'evaluated', createdAt: 3, completedAt: new Date('2026-01-15').getTime(), difficulty: 'bronze' },
    ];
    const counts = aggregateCounts(tasks, new Map(), now);
    expect(counts.week.bronze).toBe(1);
    expect(counts.month.bronze).toBe(2);     // 5/13 + 5/5 都在 5 月
    expect(counts.quarter.bronze).toBe(2);   // Q2 (4-6 月)
    expect(counts.lifetime.bronze).toBe(3);
  });
});

describe('buildUnlockContext', () => {
  it('combines lifetimePoints + streak + counts', async () => {
    await db.points.add({ id: 'p1', ts: 1, delta: 1234, reason: 'task' });
    await db.streak.put({
      id: 'singleton', currentStreak: 5, longestStreak: 10,
      lastFullDate: '2026-05-15', guardCards: 0, lastWeeklyGiftWeek: null,
    });
    await db.tasks.add({
      id: 't1', title: 'gold task', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1,
      completedAt: Date.now(), evaluationId: 'e1',
      difficulty: 'gold',
    } as Task);
    await db.evaluations.add({
      id: 'e1', taskId: 't1', basePointsAtEval: 10,
      completion: 5, quality: 5, attitude: 5,
      evaluatedAt: Date.now(), finalPoints: 12,
    });
    const ctx = await buildUnlockContext(db);
    expect(ctx.lifetimePoints).toBe(1234);
    expect(ctx.currentStreak).toBe(5);
    expect(ctx.byWindow.lifetime.gold).toBe(1);
    expect(ctx.byWindow.lifetime.perfect).toBe(1);
  });
});
