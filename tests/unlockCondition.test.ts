// ============================================================
// R4.0.0: UnlockCondition 抽象的单元测试
// 测纯函数 evaluateCondition / describeCondition / 辅助谓词
// 不依赖 DB
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  describeCondition,
  emptyContext,
  isPerfectEval,
  isLongTask,
  LONG_TASK_MIN_MS,
  type UnlockCondition,
  type UnlockContext,
} from '../src/lib/unlockCondition';

function ctx(over: Partial<UnlockContext> = {}): UnlockContext {
  const base = emptyContext();
  return { ...base, ...over };
}

describe('isPerfectEval', () => {
  it('three fives = perfect', () => {
    expect(isPerfectEval({ completion: 5, quality: 5, attitude: 5 })).toBe(true);
  });
  it('four-five-five is not perfect', () => {
    expect(isPerfectEval({ completion: 4, quality: 5, attitude: 5 })).toBe(false);
    expect(isPerfectEval({ completion: 5, quality: 4, attitude: 5 })).toBe(false);
    expect(isPerfectEval({ completion: 5, quality: 5, attitude: 4 })).toBe(false);
  });
});

describe('isLongTask', () => {
  it('treats >= 30min as long', () => {
    const start = 1_700_000_000_000;
    expect(isLongTask({ actualStartedAt: start, completedAt: start + LONG_TASK_MIN_MS })).toBe(true);
    expect(isLongTask({ actualStartedAt: start, completedAt: start + LONG_TASK_MIN_MS + 1 })).toBe(true);
  });
  it('< 30min not long', () => {
    const start = 1_700_000_000_000;
    expect(isLongTask({ actualStartedAt: start, completedAt: start + LONG_TASK_MIN_MS - 1 })).toBe(false);
  });
  it('missing fields → not long', () => {
    expect(isLongTask({ actualStartedAt: undefined, completedAt: 1 })).toBe(false);
    expect(isLongTask({ actualStartedAt: 1, completedAt: undefined })).toBe(false);
  });
});

describe('evaluateCondition — lifetimePoints', () => {
  const c: UnlockCondition = { kind: 'lifetimePoints', threshold: 1000 };
  it('met when lifetime ≥ threshold', () => {
    expect(evaluateCondition(c, ctx({ lifetimePoints: 1000 }))).toEqual({ met: true, progress: 1000, target: 1000 });
    expect(evaluateCondition(c, ctx({ lifetimePoints: 9999 }))).toEqual({ met: true, progress: 9999, target: 1000 });
  });
  it('not met when below', () => {
    expect(evaluateCondition(c, ctx({ lifetimePoints: 999 }))).toEqual({ met: false, progress: 999, target: 1000 });
  });
  it('clamps negative to 0', () => {
    expect(evaluateCondition(c, ctx({ lifetimePoints: -5 }))).toEqual({ met: false, progress: 0, target: 1000 });
  });
});

describe('evaluateCondition — taskCount with window', () => {
  it('reads correct star + window from context', () => {
    const c: UnlockCondition = { kind: 'taskCount', star: 'gold', count: 3, window: 'week' };
    const got = evaluateCondition(c, ctx({
      byWindow: {
        week:     { none: 0, bronze: 0, silver: 0, gold: 3, long: 0, perfect: 0 },
        month:    { none: 0, bronze: 0, silver: 0, gold: 99, long: 0, perfect: 0 },
        quarter:  { none: 0, bronze: 0, silver: 0, gold: 0, long: 0, perfect: 0 },
        lifetime: { none: 0, bronze: 0, silver: 0, gold: 0, long: 0, perfect: 0 },
      },
    }));
    expect(got).toEqual({ met: true, progress: 3, target: 3 });
  });
  it('different star not counted', () => {
    const c: UnlockCondition = { kind: 'taskCount', star: 'gold', count: 3, window: 'week' };
    const got = evaluateCondition(c, ctx({
      byWindow: {
        week:     { none: 0, bronze: 5, silver: 5, gold: 0, long: 0, perfect: 0 },
        month:    emptyContext().byWindow.month,
        quarter:  emptyContext().byWindow.quarter,
        lifetime: emptyContext().byWindow.lifetime,
      },
    }));
    expect(got.met).toBe(false);
    expect(got.progress).toBe(0);
  });
});

describe('evaluateCondition — longTask & perfectTask', () => {
  it('long task by lifetime window', () => {
    const c: UnlockCondition = { kind: 'longTask', count: 10, window: 'lifetime' };
    const got = evaluateCondition(c, ctx({
      byWindow: { ...emptyContext().byWindow, lifetime: { none: 0, bronze: 0, silver: 0, gold: 0, long: 12, perfect: 0 } },
    }));
    expect(got).toEqual({ met: true, progress: 12, target: 10 });
  });
  it('perfect task by month window', () => {
    const c: UnlockCondition = { kind: 'perfectTask', count: 5, window: 'month' };
    const got = evaluateCondition(c, ctx({
      byWindow: { ...emptyContext().byWindow, month: { none: 0, bronze: 0, silver: 0, gold: 0, long: 0, perfect: 4 } },
    }));
    expect(got).toEqual({ met: false, progress: 4, target: 5 });
  });
});

describe('evaluateCondition — streak', () => {
  it('streak threshold', () => {
    const c: UnlockCondition = { kind: 'streak', days: 7 };
    expect(evaluateCondition(c, ctx({ currentStreak: 7 })).met).toBe(true);
    expect(evaluateCondition(c, ctx({ currentStreak: 6 })).met).toBe(false);
  });
});

describe('evaluateCondition — composite (AND)', () => {
  it('all met → met=true, progress=count(met)', () => {
    const c: UnlockCondition = {
      kind: 'composite',
      all: [
        { kind: 'lifetimePoints', threshold: 100 },
        { kind: 'streak', days: 3 },
      ],
    };
    const got = evaluateCondition(c, ctx({ lifetimePoints: 200, currentStreak: 5 }));
    expect(got).toEqual({ met: true, progress: 2, target: 2 });
  });
  it('partial → met=false, progress=count(met)', () => {
    const c: UnlockCondition = {
      kind: 'composite',
      all: [
        { kind: 'lifetimePoints', threshold: 100 },
        { kind: 'streak', days: 3 },
      ],
    };
    const got = evaluateCondition(c, ctx({ lifetimePoints: 200, currentStreak: 0 }));
    expect(got).toEqual({ met: false, progress: 1, target: 2 });
  });
});

describe('describeCondition', () => {
  it('renders lifetimePoints', () => {
    expect(describeCondition({ kind: 'lifetimePoints', threshold: 3000 })).toBe('累计积分 3000');
  });
  it('renders taskCount with window', () => {
    expect(describeCondition({ kind: 'taskCount', star: 'gold', count: 5, window: 'month' }))
      .toBe('本月完成 5 个金任务');
  });
  it('renders longTask', () => {
    expect(describeCondition({ kind: 'longTask', count: 3, window: 'week' }))
      .toBe('本周完成 3 个长任务（≥30 分钟）');
  });
  it('renders perfectTask', () => {
    expect(describeCondition({ kind: 'perfectTask', count: 5, window: 'lifetime' }))
      .toBe('累计完成 5 个完美任务');
  });
  it('renders streak', () => {
    expect(describeCondition({ kind: 'streak', days: 7 })).toBe('连击 7 天');
  });
  it('renders composite as joined', () => {
    expect(describeCondition({
      kind: 'composite',
      all: [
        { kind: 'streak', days: 3 },
        { kind: 'lifetimePoints', threshold: 500 },
      ],
    })).toBe('连击 3 天 + 累计积分 500');
  });
});
