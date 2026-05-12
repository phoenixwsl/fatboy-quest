import { describe, it, expect } from 'vitest';
import {
  shouldShowEveningSummary, shouldShowSundayRitual, shouldShowStreakAlert, ritualLogId,
} from '../src/lib/ritualTriggers';
import type { Settings, RitualLog } from '../src/types';

const defaultSettings: Settings = {
  id: 'singleton',
  schemaVersion: 4,
  pin: '', securityQuestion: '', securityAnswer: '',
  themeId: 'space', notificationsEnabled: false,
  childName: '肥仔', setupComplete: true,
  eveningSummaryHour: 21, eveningSummaryMinute: 30,
  sundayRitualHour: 21, sundayRitualMinute: 0,
  streakAlertHour: 19, streakAlertMinute: 30,
};

describe('shouldShowEveningSummary', () => {
  // Tuesday 2026-05-12
  it('returns false before configured time', () => {
    expect(shouldShowEveningSummary(new Date('2026-05-12T20:00'), defaultSettings, [])).toBe(false);
  });
  it('returns true at/after configured time on weekday', () => {
    expect(shouldShowEveningSummary(new Date('2026-05-12T21:30'), defaultSettings, [])).toBe(true);
    expect(shouldShowEveningSummary(new Date('2026-05-12T22:00'), defaultSettings, [])).toBe(true);
  });
  it('returns false on Sunday (replaced by sunday ritual)', () => {
    expect(shouldShowEveningSummary(new Date('2026-05-10T22:00'), defaultSettings, [])).toBe(false);
  });
  it('returns false if already shown today', () => {
    const logs: RitualLog[] = [{
      id: ritualLogId('evening-summary', '2026-05-12'),
      kind: 'evening-summary', date: '2026-05-12', shownAt: 0,
    }];
    expect(shouldShowEveningSummary(new Date('2026-05-12T22:00'), defaultSettings, logs)).toBe(false);
  });
});

describe('shouldShowSundayRitual', () => {
  it('returns false on weekdays', () => {
    expect(shouldShowSundayRitual(new Date('2026-05-12T22:00'), defaultSettings, [])).toBe(false);
  });
  it('returns true on Sunday at configured time', () => {
    expect(shouldShowSundayRitual(new Date('2026-05-10T21:00'), defaultSettings, [])).toBe(true);
  });
  it('returns false before configured time on Sunday', () => {
    expect(shouldShowSundayRitual(new Date('2026-05-10T20:00'), defaultSettings, [])).toBe(false);
  });
  it('returns false if already shown', () => {
    const logs: RitualLog[] = [{
      id: ritualLogId('sunday-ritual', '2026-05-10'),
      kind: 'sunday-ritual', date: '2026-05-10', shownAt: 0,
    }];
    expect(shouldShowSundayRitual(new Date('2026-05-10T22:00'), defaultSettings, logs)).toBe(false);
  });
});

describe('shouldShowStreakAlert', () => {
  it('returns false if streak is 0', () => {
    expect(shouldShowStreakAlert(new Date('2026-05-12T20:00'), defaultSettings, [], 0, 0)).toBe(false);
  });
  it('returns false before configured time', () => {
    expect(shouldShowStreakAlert(new Date('2026-05-12T19:00'), defaultSettings, [], 5, 0)).toBe(false);
  });
  it('returns true after time when nothing done', () => {
    expect(shouldShowStreakAlert(new Date('2026-05-12T19:30'), defaultSettings, [], 5, 0)).toBe(true);
    expect(shouldShowStreakAlert(new Date('2026-05-12T20:00'), defaultSettings, [], 5, 0)).toBe(true);
  });
  it('returns false if something already completed', () => {
    expect(shouldShowStreakAlert(new Date('2026-05-12T20:00'), defaultSettings, [], 5, 1)).toBe(false);
  });
  it('returns false if already alerted today', () => {
    const logs: RitualLog[] = [{
      id: ritualLogId('streak-alert', '2026-05-12'),
      kind: 'streak-alert', date: '2026-05-12', shownAt: 0,
    }];
    expect(shouldShowStreakAlert(new Date('2026-05-12T20:00'), defaultSettings, logs, 5, 0)).toBe(false);
  });
});
