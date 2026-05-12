import { describe, it, expect } from 'vitest';
import { earlyBonus, summarizeExecution } from '../src/lib/earlyBonus';

const MIN = 60 * 1000;

describe('earlyBonus', () => {
  it('returns 0 when quality < 4', () => {
    expect(earlyBonus({
      estimatedMinutes: 30,
      actualStartedAt: 0,
      completedAt: 20 * MIN, // 提前 10 分钟
      qualityStars: 3,
    })).toBe(0);
  });

  it('rewards early completion when quality >= 4', () => {
    expect(earlyBonus({
      estimatedMinutes: 30,
      actualStartedAt: 0,
      completedAt: 20 * MIN, // 节省 10 分钟
      qualityStars: 4,
    })).toBe(5); // 10 × 0.5
  });

  it('caps at 10 points', () => {
    expect(earlyBonus({
      estimatedMinutes: 60,
      actualStartedAt: 0,
      completedAt: 10 * MIN, // 节省 50 分钟
      qualityStars: 5,
    })).toBe(10);
  });

  it('returns 0 if not early enough', () => {
    expect(earlyBonus({
      estimatedMinutes: 30,
      actualStartedAt: 0,
      completedAt: 30 * MIN, // 准时
      qualityStars: 5,
    })).toBe(0);
  });

  it('returns 0 if no actualStartedAt', () => {
    expect(earlyBonus({
      estimatedMinutes: 30,
      completedAt: 20 * MIN,
      qualityStars: 5,
    })).toBe(0);
  });

  it('discounts paused time (paused doesn\'t count against early)', () => {
    // estimated 30 min, took 30 min elapsed but 5 min paused → effective 25 min, saved 5
    expect(earlyBonus({
      estimatedMinutes: 30,
      actualStartedAt: 0,
      completedAt: 30 * MIN,
      pauseSecondsUsed: 5 * 60,
      qualityStars: 5,
    })).toBe(3); // round(5 * 0.5) = 3 (2.5 rounds to 3)
  });

  it('returns 0 when overtime even with high quality', () => {
    expect(earlyBonus({
      estimatedMinutes: 30,
      actualStartedAt: 0,
      completedAt: 40 * MIN,
      qualityStars: 5,
    })).toBe(0);
  });
});

describe('summarizeExecution', () => {
  it('summarizes a normal task', () => {
    const s = summarizeExecution({
      estimatedMinutes: 30,
      actualStartedAt: 0,
      completedAt: 25 * MIN,
      pauseSecondsUsed: 60, // 1 min
      pauseCount: 1,
      extendCount: 0,
      undoCount: 0,
    });
    expect(s.elapsedMinutes).toBe(25);
    expect(s.effectiveMinutes).toBe(24);
    expect(s.savedMinutes).toBe(6);
    expect(s.isOnTime).toBe(true);
  });

  it('flags as NOT on time when extension used', () => {
    const s = summarizeExecution({
      estimatedMinutes: 30,
      actualStartedAt: 0,
      completedAt: 25 * MIN,
      extendCount: 1,
      extendMinutesTotal: 5,
    });
    expect(s.isOnTime).toBe(false);
  });

  it('reports zero stats when no execution data', () => {
    const s = summarizeExecution({ estimatedMinutes: 30 });
    expect(s.elapsedMinutes).toBe(0);
    expect(s.effectiveMinutes).toBe(0);
  });
});
