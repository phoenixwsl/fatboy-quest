// R4.0.0: 6 级终身积分等级
import { describe, it, expect } from 'vitest';
import { LEVELS, getLevelFromLifetime, getNextLevel } from '../src/lib/levels';

describe('LEVELS const', () => {
  it('has 6 levels in ascending threshold', () => {
    expect(LEVELS).toHaveLength(6);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].threshold).toBeGreaterThan(LEVELS[i - 1].threshold);
    }
  });
  it('first level threshold is 0', () => {
    expect(LEVELS[0].threshold).toBe(0);
  });
});

describe('getLevelFromLifetime', () => {
  it('maps to correct level by threshold', () => {
    expect(getLevelFromLifetime(0).level).toBe(1);
    expect(getLevelFromLifetime(499).level).toBe(1);
    expect(getLevelFromLifetime(500).level).toBe(2);
    expect(getLevelFromLifetime(1999).level).toBe(2);
    expect(getLevelFromLifetime(2000).level).toBe(3);
    expect(getLevelFromLifetime(5000).level).toBe(4);
    expect(getLevelFromLifetime(10000).level).toBe(5);
    expect(getLevelFromLifetime(20000).level).toBe(6);
    expect(getLevelFromLifetime(99999).level).toBe(6);
  });
  it('clamps negative to level 1', () => {
    expect(getLevelFromLifetime(-100).level).toBe(1);
  });
});

describe('getNextLevel', () => {
  it('returns next level when not max', () => {
    expect(getNextLevel(0)?.level).toBe(2);
    expect(getNextLevel(500)?.level).toBe(3);
    expect(getNextLevel(10000)?.level).toBe(6);
  });
  it('returns null at max', () => {
    expect(getNextLevel(20000)).toBeNull();
    expect(getNextLevel(99999)).toBeNull();
  });
});

describe('LEVEL titles are mastery-oriented (anti-pattern C3 check)', () => {
  it('no titles contain performance words like "满分" or "第一"', () => {
    for (const lv of LEVELS) {
      expect(lv.title).not.toMatch(/满分|第一|最强|王者/);
    }
  });
});
