import { describe, it, expect } from 'vitest';
import { dailyPoints, subjectDistribution, timeAccuracy, ratingSnapshot } from '../src/lib/charts';
import type { Evaluation, PointsEntry, Task } from '../src/types';

const dayMs = 86400000;
function tsFor(dateStr: string, hour = 12): number {
  return new Date(dateStr + `T${String(hour).padStart(2, '0')}:00:00`).getTime();
}

describe('dailyPoints', () => {
  it('returns N days of buckets', () => {
    const buckets = dailyPoints([], 14, '2026-05-12');
    expect(buckets).toHaveLength(14);
    expect(buckets[buckets.length - 1].date).toBe('2026-05-12');
  });

  it('sums earned vs spent per day', () => {
    const entries: PointsEntry[] = [
      { id: '1', ts: tsFor('2026-05-12'), delta: 30, reason: 'a' },
      { id: '2', ts: tsFor('2026-05-12'), delta: -10, reason: 'spend' },
      { id: '3', ts: tsFor('2026-05-11'), delta: 20, reason: 'a' },
    ];
    const buckets = dailyPoints(entries, 3, '2026-05-12');
    expect(buckets[2]).toMatchObject({ date: '2026-05-12', earned: 30, spent: 10 });
    expect(buckets[1]).toMatchObject({ date: '2026-05-11', earned: 20, spent: 0 });
    expect(buckets[0]).toMatchObject({ date: '2026-05-10', earned: 0, spent: 0 });
  });
});

describe('subjectDistribution', () => {
  const mk = (subject: Task['subject'], date: string, minutes: number, status: Task['status'] = 'evaluated'): Task => ({
    id: Math.random().toString(),
    title: 'X', date, basePoints: 20, estimatedMinutes: minutes,
    subject, status, createdAt: 0,
  });

  it('aggregates by subject', () => {
    const tasks = [
      mk('math', '2026-05-10', 30),
      mk('math', '2026-05-11', 25),
      mk('chinese', '2026-05-10', 40),
    ];
    const dist = subjectDistribution(tasks, 30, '2026-05-12');
    const math = dist.find(d => d.subject === 'math');
    expect(math?.minutes).toBe(55);
    expect(math?.count).toBe(2);
    expect(dist[0].subject).toBe('math');      // math=55 排第一
    expect(dist[1].subject).toBe('chinese');   // chinese=40 排第二
  });

  it('excludes pending / scheduled tasks', () => {
    const tasks = [
      mk('math', '2026-05-10', 30, 'pending'),
      mk('math', '2026-05-11', 25, 'evaluated'),
    ];
    const dist = subjectDistribution(tasks, 30, '2026-05-12');
    expect(dist.find(d => d.subject === 'math')?.minutes).toBe(25);
  });

  it('excludes tasks outside window', () => {
    const tasks = [
      mk('math', '2026-04-01', 30),   // older than 30 days from 2026-05-12
      mk('math', '2026-05-10', 20),
    ];
    const dist = subjectDistribution(tasks, 30, '2026-05-12');
    expect(dist[0].minutes).toBe(20);
  });
});

describe('timeAccuracy', () => {
  const mk = (date: string, est: number, startMs: number, endMs: number, pauseSec = 0): Task => ({
    id: Math.random().toString(),
    title: 'X', date, basePoints: 20, estimatedMinutes: est,
    subject: 'math', status: 'evaluated', createdAt: 0,
    actualStartedAt: startMs, completedAt: endMs, pauseSecondsUsed: pauseSec,
  });

  it('returns ratio per task', () => {
    // 用真实 ts 偏移避免 0 = falsy 问题，并保证 completedAt 顺序与预期一致
    const baseA = new Date('2026-05-10T10:00:00').getTime();
    const baseB = new Date('2026-05-11T10:00:00').getTime();
    const tasks = [
      mk('2026-05-10', 30, baseA, baseA + 30 * 60 * 1000),   // ratio 1.0
      mk('2026-05-11', 30, baseB, baseB + 15 * 60 * 1000),   // ratio 0.5
    ];
    const out = timeAccuracy(tasks, 30, '2026-05-12');
    expect(out).toHaveLength(2);
    expect(out[0].ratio).toBeCloseTo(1.0);
    expect(out[1].ratio).toBeCloseTo(0.5);
  });

  it('discounts paused time', () => {
    const tasks = [mk('2026-05-10', 30, 0, 30 * 60 * 1000, 5 * 60)]; // 25 effective
    const [a] = timeAccuracy(tasks, 30, '2026-05-12');
    expect(a.ratio).toBeCloseTo(25 / 30);
  });

  it('excludes tasks without actualStartedAt', () => {
    const t: Task = {
      id: 'x', title: 'X', date: '2026-05-10', basePoints: 20, estimatedMinutes: 30,
      subject: 'math', status: 'evaluated', createdAt: 0,
    };
    expect(timeAccuracy([t], 30, '2026-05-12')).toHaveLength(0);
  });
});

describe('ratingSnapshot', () => {
  const mkEv = (c: number, q: number, a: number, ts: number): Evaluation => ({
    id: 'ev_' + ts, taskId: 't_' + ts, basePointsAtEval: 20,
    completion: c, quality: q, attitude: a, evaluatedAt: ts, finalPoints: 20,
  });

  it('returns zeros for no evaluations', () => {
    const { current, previous } = ratingSnapshot([], 10);
    expect(current.count).toBe(0);
    expect(previous.count).toBe(0);
  });

  it('averages latest N as current', () => {
    const evs = [
      mkEv(5, 5, 5, 100),
      mkEv(3, 3, 3, 200),
      mkEv(4, 4, 4, 300),
    ];
    const { current } = ratingSnapshot(evs, 2);
    // latest 2: ts=300 (4,4,4) and ts=200 (3,3,3) → avg 3.5
    expect(current.completion).toBeCloseTo(3.5);
    expect(current.count).toBe(2);
  });
});
