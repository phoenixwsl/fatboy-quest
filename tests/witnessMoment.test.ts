// R4.4.0: 见证奖励 — CRUD + groupByMonth + 推送
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import {
  createWitnessMoment, groupByMonth, exportMonthAsText,
  buildOtherParentNotification, deleteWitnessMoment, WITNESS_EMOJIS,
} from '../src/lib/witnessMoment';
import type { WitnessMoment, BarkRecipient } from '../src/types';

async function reset() {
  await db.delete();
  await db.open();
}

const mom: BarkRecipient = {
  id: 'preset-mom', label: '妈妈', emoji: '👩',
  serverUrl: 'https://api.day.app', key: 'mom-key',
  subTaskDone: true, subRoundDone: true, subMilestone: true,
  subPendingReview: true, subWeeklyReport: true,
  enabled: true,
};
const dad: BarkRecipient = {
  id: 'preset-dad', label: '爸爸', emoji: '👨',
  serverUrl: 'https://api.day.app', key: 'dad-key',
  subTaskDone: true, subRoundDone: true, subMilestone: true,
  subPendingReview: true, subWeeklyReport: true,
  enabled: true,
};

beforeEach(async () => {
  await reset();
});

describe('createWitnessMoment', () => {
  it('writes a moment to db with id + ts + label', async () => {
    const m = await createWitnessMoment(db, { text: '主动让妹妹', emoji: '🌟', from: mom });
    expect(m.id).toMatch(/^wit_/);
    expect(m.fromRecipientId).toBe('preset-mom');
    expect(m.fromLabel).toBe('妈妈');
    expect(m.text).toBe('主动让妹妹');
    const all = await db.witnessMoments.toArray();
    expect(all).toHaveLength(1);
  });

  it('trims whitespace', async () => {
    const m = await createWitnessMoment(db, { text: '  hello  ', emoji: '✨', from: mom });
    expect(m.text).toBe('hello');
  });
});

describe('WITNESS_EMOJIS', () => {
  it('has 8 options', () => {
    expect(WITNESS_EMOJIS).toHaveLength(8);
  });
});

describe('groupByMonth', () => {
  function moment(over: Partial<WitnessMoment>): WitnessMoment {
    return {
      id: 'w_' + Math.random(), ts: Date.now(),
      text: 'x', emoji: '🌟',
      fromRecipientId: 'preset-mom', fromLabel: '妈妈',
      ...over,
    };
  }

  it('groups by year-month, newest first', () => {
    const moments = [
      moment({ ts: new Date('2026-05-15').getTime() }),
      moment({ ts: new Date('2026-05-01').getTime() }),
      moment({ ts: new Date('2026-04-20').getTime() }),
      moment({ ts: new Date('2026-04-10').getTime() }),
    ];
    const groups = groupByMonth(moments);
    expect(groups).toHaveLength(2);
    expect(groups[0].monthKey).toBe('2026-05');
    expect(groups[0].moments).toHaveLength(2);
    expect(groups[0].monthLabel).toBe('2026 年 5 月');
    expect(groups[1].monthKey).toBe('2026-04');
  });

  it('handles empty input', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('within a group, moments are sorted newest-first', () => {
    const moments = [
      moment({ id: 'a', ts: new Date('2026-05-01').getTime() }),
      moment({ id: 'c', ts: new Date('2026-05-15').getTime() }),
      moment({ id: 'b', ts: new Date('2026-05-08').getTime() }),
    ];
    const [g] = groupByMonth(moments);
    expect(g.moments.map(m => m.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('exportMonthAsText', () => {
  it('renders month + entries + count', () => {
    const group = {
      monthKey: '2026-05',
      monthLabel: '2026 年 5 月',
      moments: [
        { id: 'a', ts: new Date('2026-05-15T10:00').getTime(), text: '让妹妹', emoji: '🌟', fromRecipientId: 'preset-mom', fromLabel: '妈妈' },
      ],
    };
    const txt = exportMonthAsText(group, '肥仔');
    expect(txt).toContain('肥仔的温柔时刻');
    expect(txt).toContain('2026 年 5 月');
    expect(txt).toContain('让妹妹');
    expect(txt).toContain('妈妈见证');
    expect(txt).toContain('共 1 个时刻');
  });
});

describe('buildOtherParentNotification', () => {
  it('targets the OTHER parent (mom records → dad notified)', async () => {
    const m = await createWitnessMoment(db, { text: 'hi', emoji: '🌟', from: mom });
    const notif = buildOtherParentNotification(m, [mom, dad], '肥仔');
    expect(notif).not.toBeNull();
    expect(notif!.recipients.map(r => r.id)).toEqual(['preset-dad']);
    expect(notif!.title).toContain('妈妈见证');
    expect(notif!.body).toBe('hi');
  });

  it('returns null when only one parent exists', async () => {
    const m = await createWitnessMoment(db, { text: 'hi', emoji: '🌟', from: mom });
    expect(buildOtherParentNotification(m, [mom], '肥仔')).toBeNull();
  });

  it('skips disabled recipients', async () => {
    const m = await createWitnessMoment(db, { text: 'hi', emoji: '🌟', from: mom });
    const dadDisabled: BarkRecipient = { ...dad, enabled: false };
    expect(buildOtherParentNotification(m, [mom, dadDisabled], '肥仔')).toBeNull();
  });
});

describe('deleteWitnessMoment', () => {
  it('removes a moment', async () => {
    const m = await createWitnessMoment(db, { text: 'x', emoji: '🌟', from: mom });
    await deleteWitnessMoment(db, m.id);
    expect(await db.witnessMoments.count()).toBe(0);
  });
});
