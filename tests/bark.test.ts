import { describe, it, expect, vi } from 'vitest';
import { buildBarkUrl, shouldNotify, pushToRecipients, messages } from '../src/lib/bark';
import type { BarkRecipient } from '../src/types';

const makeRecipient = (overrides: Partial<BarkRecipient> = {}): BarkRecipient => ({
  id: 'r1',
  label: '爸爸',
  emoji: '👨',
  serverUrl: 'https://api.day.app',
  key: 'TESTKEY123',
  subTaskDone: true,
  subRoundDone: true,
  subMilestone: true,
  subPendingReview: true,
  subWeeklyReport: true,
  subHelp: true,
  enabled: true,
  ...overrides,
});

describe('buildBarkUrl', () => {
  it('builds basic URL with title and body', () => {
    const r = makeRecipient();
    const url = buildBarkUrl(r, { title: '完成', body: '数学作业' });
    expect(url).toContain('https://api.day.app/TESTKEY123/');
    expect(url).toContain(encodeURIComponent('完成'));
    expect(url).toContain(encodeURIComponent('数学作业'));
  });

  it('adds query params for group/sound/url', () => {
    const r = makeRecipient();
    const url = buildBarkUrl(r, {
      title: 'a', body: 'b', group: 'fatboy', sound: 'bell', url: 'https://example.com',
    });
    expect(url).toContain('group=fatboy');
    expect(url).toContain('sound=bell');
    expect(url).toContain('url=https');
  });

  it('strips trailing slash from server URL', () => {
    const r = makeRecipient({ serverUrl: 'https://api.day.app/' });
    const url = buildBarkUrl(r, { title: 'a', body: 'b' });
    expect(url).not.toContain('app//TEST');
    expect(url).toContain('app/TESTKEY123');
  });

  it('escapes Chinese characters safely', () => {
    const r = makeRecipient();
    const url = buildBarkUrl(r, { title: '肥仔完成了', body: '数学作业 用时 25 分钟' });
    expect(() => new URL(url)).not.toThrow();
  });
});

describe('shouldNotify', () => {
  it('returns false when recipient disabled', () => {
    const r = makeRecipient({ enabled: false });
    expect(shouldNotify(r, 'taskDone')).toBe(false);
  });
  it('respects per-kind subscriptions', () => {
    const r = makeRecipient({ subTaskDone: false, subRoundDone: true });
    expect(shouldNotify(r, 'taskDone')).toBe(false);
    expect(shouldNotify(r, 'roundDone')).toBe(true);
  });
  it('treats undefined subHelp as enabled (backwards compat for v2 data)', () => {
    const r = makeRecipient({ subHelp: undefined as any });
    expect(shouldNotify(r, 'help')).toBe(true);
  });
});

describe('pushToRecipients', () => {
  it('sends to all matching recipients', async () => {
    const dad = makeRecipient({ id: 'dad', label: '爸爸', key: 'K1' });
    const mom = makeRecipient({ id: 'mom', label: '妈妈', key: 'K2' });
    const calls: string[] = [];
    const fakeFetch = vi.fn(async (url: string) => {
      calls.push(url);
      return { ok: true, status: 200 } as Response;
    });
    const results = await pushToRecipients([dad, mom], 'taskDone',
      { title: 't', body: 'b' }, fakeFetch as any);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.ok)).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('K1');
    expect(calls[1]).toContain('K2');
  });

  it('skips disabled recipients', async () => {
    const dad = makeRecipient({ id: 'dad', enabled: false });
    const mom = makeRecipient({ id: 'mom', key: 'K2' });
    const fakeFetch = vi.fn(async () => ({ ok: true, status: 200 } as Response));
    const results = await pushToRecipients([dad, mom], 'taskDone',
      { title: 't', body: 'b' }, fakeFetch as any);
    expect(results).toHaveLength(1);
    expect(results[0].recipientId).toBe('mom');
  });

  it('handles fetch errors gracefully', async () => {
    const r = makeRecipient();
    const fakeFetch = vi.fn(async () => { throw new Error('Network down'); });
    const results = await pushToRecipients([r], 'taskDone',
      { title: 't', body: 'b' }, fakeFetch as any);
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('Network');
  });

  it('handles non-200 responses', async () => {
    const r = makeRecipient();
    const fakeFetch = vi.fn(async () => ({ ok: false, status: 401 } as Response));
    const results = await pushToRecipients([r], 'taskDone',
      { title: 't', body: 'b' }, fakeFetch as any);
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('401');
  });

  it('filters by notification kind subscription', async () => {
    const dad = makeRecipient({ id: 'dad', subTaskDone: false, subMilestone: true });
    const mom = makeRecipient({ id: 'mom', subTaskDone: true, subMilestone: false });
    const fakeFetch = vi.fn(async () => ({ ok: true, status: 200 } as Response));

    const r1 = await pushToRecipients([dad, mom], 'taskDone',
      { title: 't', body: 'b' }, fakeFetch as any);
    expect(r1.map(x => x.recipientId)).toEqual(['mom']);

    const r2 = await pushToRecipients([dad, mom], 'milestone',
      { title: 't', body: 'b' }, fakeFetch as any);
    expect(r2.map(x => x.recipientId)).toEqual(['dad']);
  });
});

describe('messages (detailed)', () => {
  it('taskDone includes time range and speed mark', () => {
    const start = new Date(2026, 4, 12, 19, 15);
    const end = new Date(2026, 4, 12, 19, 38);
    const m = messages.taskDone({
      childName: '肥仔', taskTitle: '数学作业',
      startedAt: start, completedAt: end,
      estimatedMin: 25, effectiveMin: 23,
    });
    expect(m.title).toContain('肥仔');
    expect(m.title).toContain('数学作业');
    expect(m.body).toContain('19:15');
    expect(m.body).toContain('19:38');
    expect(m.body).toContain('23');           // effective minutes
    expect(m.body).toContain('快');            // speed mark
  });

  it('taskDone marks overtime', () => {
    const m = messages.taskDone({
      childName: 'X', taskTitle: 'Y',
      startedAt: new Date(2026, 0, 1, 10, 0),
      completedAt: new Date(2026, 0, 1, 10, 40),
      estimatedMin: 30, effectiveMin: 40,
    });
    expect(m.body).toContain('慢');
  });

  it('taskDone includes pause/extend extras if any', () => {
    const m = messages.taskDone({
      childName: 'X', taskTitle: 'Y',
      startedAt: new Date(0), completedAt: new Date(60_000),
      estimatedMin: 5, effectiveMin: 1,
      pauseCount: 1, extendCount: 2,
    });
    expect(m.body).toContain('暂停');
    expect(m.body).toContain('延时');
  });

  it('roundDone includes combo tag when 3+', () => {
    const m1 = messages.roundDone('肥仔', 5, 100, 5);
    expect(m1.title).toContain('完美');
    const m2 = messages.roundDone('肥仔', 4, 80, 3);
    expect(m2.title).toContain('3 连击');
    const m3 = messages.roundDone('肥仔', 2, 30, 1);
    expect(m3.title).not.toContain('连击');
  });

  it('milestone includes streak count', () => {
    const m = messages.milestone('肥仔', '蛋仔进化', 30);
    expect(m.title).toContain('30');
    expect(m.body).toContain('进化');
  });

  it('help message contains task title', () => {
    const m = messages.help('肥仔', '难数学');
    expect(m.title).toContain('需要帮助');
    expect(m.body).toContain('难数学');
  });
});
