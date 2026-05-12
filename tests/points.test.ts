import { describe, it, expect } from 'vitest';
import {
  calcFinalPoints,
  attitudeMultiplier,
  totalPoints,
  getRank,
  getNextRank,
  calcGuardCardPrice,
  RANKS,
} from '../src/lib/points';
import type { PointsEntry } from '../src/types';

describe('attitudeMultiplier', () => {
  it('maps 1-5 stars to 0.8-1.2', () => {
    expect(attitudeMultiplier(1)).toBe(0.8);
    expect(attitudeMultiplier(2)).toBeCloseTo(0.9);
    expect(attitudeMultiplier(3)).toBe(1.0);
    expect(attitudeMultiplier(4)).toBeCloseTo(1.1);
    expect(attitudeMultiplier(5)).toBeCloseTo(1.2);
  });

  it('clamps out-of-range inputs', () => {
    expect(attitudeMultiplier(0)).toBe(0.8);
    expect(attitudeMultiplier(-3)).toBe(0.8);
    expect(attitudeMultiplier(99)).toBeCloseTo(1.2);
  });
});

describe('calcFinalPoints', () => {
  it('returns the correct points for perfect scores', () => {
    // 基础 20，5+5=10/10=1.0，态度倍率 1.2
    expect(calcFinalPoints(20, { completion: 5, quality: 5, attitude: 5 })).toBe(24);
  });

  it('returns lower points for poor effort', () => {
    expect(calcFinalPoints(20, { completion: 2, quality: 2, attitude: 1 })).toBe(6);
    // 20 * 0.4 * 0.8 = 6.4 → 6
  });

  it('never returns 0 even with poor attitude', () => {
    expect(calcFinalPoints(50, { completion: 1, quality: 1, attitude: 1 })).toBeGreaterThan(0);
  });

  it('clamps over-range evaluations', () => {
    const ok = calcFinalPoints(10, { completion: 5, quality: 5, attitude: 5 });
    const overshoot = calcFinalPoints(10, { completion: 10, quality: 10, attitude: 10 });
    expect(overshoot).toBe(ok);
  });

  it('is deterministic (regression guard)', () => {
    // 这个测试锁住公式，未来改公式时这个会失败 - 提醒人为 review
    expect(calcFinalPoints(20, { completion: 4, quality: 3, attitude: 4 })).toBe(15);
    expect(calcFinalPoints(30, { completion: 5, quality: 4, attitude: 3 })).toBe(27);
  });

  it('rounds to integer', () => {
    const v = calcFinalPoints(7, { completion: 3, quality: 3, attitude: 3 });
    expect(Number.isInteger(v)).toBe(true);
  });
});

describe('totalPoints', () => {
  it('sums deltas', () => {
    const entries: PointsEntry[] = [
      { id: '1', ts: 0, delta: 10, reason: 'a' },
      { id: '2', ts: 1, delta: -5, reason: 'b' },
      { id: '3', ts: 2, delta: 20, reason: 'c' },
    ];
    expect(totalPoints(entries)).toBe(25);
  });

  it('returns 0 for empty list', () => {
    expect(totalPoints([])).toBe(0);
  });
});

describe('getRank / getNextRank', () => {
  it('returns rookie at 0', () => {
    expect(getRank(0).id).toBe('rookie');
  });

  it('progresses through ranks', () => {
    expect(getRank(199).id).toBe('rookie');
    expect(getRank(200).id).toBe('bronze');
    expect(getRank(600).id).toBe('silver');
    expect(getRank(1500).id).toBe('gold');
    expect(getRank(99999).id).toBe('master');
  });

  it('returns null next rank at max', () => {
    expect(getNextRank(99999)).toBeNull();
  });

  it('returns next rank otherwise', () => {
    expect(getNextRank(100)?.id).toBe('bronze');
  });

  it('RANKS are sorted by threshold', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minPoints).toBeGreaterThan(RANKS[i - 1].minPoints);
    }
  });
});

describe('calcGuardCardPrice', () => {
  it('returns floor when no history', () => {
    expect(calcGuardCardPrice([])).toBe(100);
  });

  it('returns 3x daily average', () => {
    expect(calcGuardCardPrice([100, 100, 100, 100, 100, 100, 100])).toBe(300);
  });

  it('enforces minimum 100', () => {
    expect(calcGuardCardPrice([10, 10, 10])).toBe(100);
  });

  it('handles mixed averages', () => {
    // 平均 50，3x = 150
    expect(calcGuardCardPrice([0, 100, 50])).toBe(150);
  });
});
