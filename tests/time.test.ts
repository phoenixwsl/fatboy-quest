import { describe, it, expect } from 'vitest';
import {
  todayString, addDays, daysBetween, isoWeekString,
  minutesToHHMM, currentMinuteOfDay, formatDuration, formatChineseDate,
} from '../src/lib/time';

describe('todayString', () => {
  it('formats as YYYY-MM-DD', () => {
    const s = todayString(new Date(2026, 4, 12)); // 5 月 12 日
    expect(s).toBe('2026-05-12');
  });

  it('zero-pads month and day', () => {
    const s = todayString(new Date(2026, 0, 1));
    expect(s).toBe('2026-01-01');
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-05-12', 1)).toBe('2026-05-13');
    expect(addDays('2026-05-12', 7)).toBe('2026-05-19');
  });

  it('handles month boundary', () => {
    expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
  });

  it('handles year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles negative', () => {
    expect(addDays('2026-05-12', -1)).toBe('2026-05-11');
  });
});

describe('daysBetween', () => {
  it('returns difference', () => {
    expect(daysBetween('2026-05-12', '2026-05-13')).toBe(1);
    expect(daysBetween('2026-05-12', '2026-05-12')).toBe(0);
    expect(daysBetween('2026-05-12', '2026-05-19')).toBe(7);
  });

  it('handles month boundary', () => {
    expect(daysBetween('2026-05-31', '2026-06-01')).toBe(1);
  });
});

describe('isoWeekString', () => {
  it('returns YYYY-Www format', () => {
    const w = isoWeekString(new Date(2026, 4, 12));
    expect(w).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('same week returns same string', () => {
    const monday = isoWeekString(new Date(2026, 4, 11)); // 周一
    const friday = isoWeekString(new Date(2026, 4, 15)); // 周五
    expect(monday).toBe(friday);
  });

  it('different weeks differ', () => {
    expect(isoWeekString(new Date(2026, 4, 11)))
      .not.toBe(isoWeekString(new Date(2026, 4, 18)));
  });
});

describe('minutesToHHMM', () => {
  it('formats time of day', () => {
    expect(minutesToHHMM(0)).toBe('00:00');
    expect(minutesToHHMM(60)).toBe('01:00');
    expect(minutesToHHMM(8 * 60 + 30)).toBe('08:30');
    expect(minutesToHHMM(23 * 60 + 59)).toBe('23:59');
  });
});

describe('currentMinuteOfDay', () => {
  it('computes minute of day', () => {
    expect(currentMinuteOfDay(new Date(2026, 0, 1, 0, 0))).toBe(0);
    expect(currentMinuteOfDay(new Date(2026, 0, 1, 8, 30))).toBe(510);
    expect(currentMinuteOfDay(new Date(2026, 0, 1, 23, 59))).toBe(1439);
  });
});

describe('formatDuration', () => {
  it('handles minutes only', () => {
    expect(formatDuration(30)).toBe('30 分钟');
  });

  it('handles hours only', () => {
    expect(formatDuration(60)).toBe('1 小时');
    expect(formatDuration(120)).toBe('2 小时');
  });

  it('handles hours + minutes', () => {
    expect(formatDuration(90)).toBe('1 小时 30 分');
  });
});

describe('formatChineseDate', () => {
  it('formats with chinese weekday', () => {
    // 2026-05-12 is Tuesday
    expect(formatChineseDate('2026-05-12')).toContain('周二');
    expect(formatChineseDate('2026-05-12')).toContain('5 月');
    expect(formatChineseDate('2026-05-12')).toContain('12 日');
  });
});
