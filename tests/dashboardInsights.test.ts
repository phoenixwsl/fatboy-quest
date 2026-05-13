// R2.4.4 单元测试：3 个洞察纯函数
import { describe, it, expect } from 'vitest';
import {
  streakTrend, weeklyPointsTrend, lowestEfficiencySubject,
} from '../src/lib/dashboardInsights';
import type { StreakState, PointsEntry, Task } from '../src/types';
import { addDays } from '../src/lib/time';

const today = '2026-05-13';
const ts = (d: string) => new Date(d).getTime();

describe('streakTrend', () => {
  it('无 streak → fresh', () => {
    expect(streakTrend(undefined, today).status).toBe('fresh');
  });
  it('currentStreak = 0 → fresh', () => {
    expect(streakTrend({ id: 'singleton', currentStreak: 0 } as StreakState, today).status).toBe('fresh');
  });
  it('昨天 fullDate → growing', () => {
    const s = { id: 'singleton', currentStreak: 5, longestStreak: 7, lastFullDate: addDays(today, -1) } as StreakState;
    expect(streakTrend(s, today).status).toBe('growing');
    expect(streakTrend(s, today).current).toBe(5);
  });
  it('lastFullDate 是今天 → growing', () => {
    const s = { id: 'singleton', currentStreak: 3, longestStreak: 5, lastFullDate: today } as StreakState;
    expect(streakTrend(s, today).status).toBe('growing');
  });
  it('lastFullDate 距今 ≥ 2 天 → broken', () => {
    const s = { id: 'singleton', currentStreak: 3, longestStreak: 5, lastFullDate: addDays(today, -3) } as StreakState;
    expect(streakTrend(s, today).status).toBe('broken');
  });
});

describe('weeklyPointsTrend', () => {
  it('双周都 0 → flat', () => {
    const r = weeklyPointsTrend([], today);
    expect(r.thisWeek).toBe(0);
    expect(r.lastWeek).toBe(0);
    expect(r.direction).toBe('flat');
  });

  it('本周高于上周 → up + delta + pct', () => {
    const points: PointsEntry[] = [
      // 上周（13 - 7 天前）
      { id: 'a', ts: ts(addDays(today, -10)), delta: 50, reason: 'evaluated' },
      // 本周（6 - 0 天前）
      { id: 'b', ts: ts(addDays(today, -3)), delta: 100, reason: 'evaluated' },
    ];
    const r = weeklyPointsTrend(points, today);
    expect(r.thisWeek).toBe(100);
    expect(r.lastWeek).toBe(50);
    expect(r.direction).toBe('up');
    expect(r.delta).toBe(50);
    expect(r.pct).toBe(100);
  });

  it('忽略负 delta（扣分不计入本周积分）', () => {
    const points: PointsEntry[] = [
      { id: 'a', ts: ts(addDays(today, -2)), delta: 100, reason: 'evaluated' },
      { id: 'b', ts: ts(addDays(today, -2)), delta: -10, reason: 'shop_redeem' as any },
    ];
    const r = weeklyPointsTrend(points, today);
    expect(r.thisWeek).toBe(100);
  });
});

describe('lowestEfficiencySubject', () => {
  it('数据不足 → null', () => {
    expect(lowestEfficiencySubject([], 14, today)).toBeNull();
  });

  it('选样本数 ≥ 2 且 actual/est 最大的学科', () => {
    const mkTask = (over: Partial<Task>): Task => ({
      id: 'x' + Math.random(), title: 'x', date: today,
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: Date.now(),
      actualStartedAt: ts(today) - 60_000 * 30,
      completedAt: ts(today),
      ...over,
    } as Task);

    // 数学 2 个：用了 30min 估 10min → ratio 3
    // 语文 2 个：用了 12min 估 10min → ratio 1.2
    const tasks: Task[] = [
      mkTask({ subject: 'math',
        actualStartedAt: ts(today) - 60_000 * 30, completedAt: ts(today),
      }),
      mkTask({ subject: 'math',
        actualStartedAt: ts(today) - 60_000 * 30, completedAt: ts(today),
      }),
      mkTask({ subject: 'chinese',
        actualStartedAt: ts(today) - 60_000 * 12, completedAt: ts(today),
      }),
      mkTask({ subject: 'chinese',
        actualStartedAt: ts(today) - 60_000 * 12, completedAt: ts(today),
      }),
    ];
    const r = lowestEfficiencySubject(tasks, 14, today);
    expect(r?.subject).toBe('math');
    expect(r!.ratio).toBeGreaterThan(2);
  });

  it('单样本不参与计算', () => {
    const tasks: Task[] = [{
      id: 't', title: 't', date: today,
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 0,
      actualStartedAt: ts(today) - 60_000 * 30, completedAt: ts(today),
    } as Task];
    expect(lowestEfficiencySubject(tasks, 14, today)).toBeNull();
  });
});
