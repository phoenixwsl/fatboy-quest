import { describe, it, expect } from 'vitest';
import { extractTemplates, canUndoCompletion, canChildDeleteTask } from '../src/lib/templates';
import type { Task } from '../src/types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't_' + Math.random(),
  title: '数学口算',
  description: 'P12',
  date: '2026-05-12',
  basePoints: 20,
  estimatedMinutes: 25,
  subject: 'math',
  status: 'pending',
  createdAt: 1000,
  ...overrides,
});

describe('extractTemplates', () => {
  it('returns empty for no tasks', () => {
    expect(extractTemplates([])).toEqual([]);
  });

  it('returns unique templates by title', () => {
    const tasks = [
      makeTask({ title: '数学口算', createdAt: 1 }),
      makeTask({ title: '语文阅读', createdAt: 2 }),
      makeTask({ title: '数学口算', createdAt: 3 }),
    ];
    const tpl = extractTemplates(tasks);
    expect(tpl).toHaveLength(2);
    expect(tpl.find(t => t.title === '数学口算')?.useCount).toBe(2);
    expect(tpl.find(t => t.title === '语文阅读')?.useCount).toBe(1);
  });

  it('sorts by useCount desc, then lastUsedAt desc', () => {
    const tasks = [
      makeTask({ title: 'A', createdAt: 1 }),
      makeTask({ title: 'A', createdAt: 2 }),
      makeTask({ title: 'A', createdAt: 3 }),
      makeTask({ title: 'B', createdAt: 5 }),
      makeTask({ title: 'C', createdAt: 4 }),
    ];
    const tpl = extractTemplates(tasks);
    expect(tpl[0].title).toBe('A');
    expect(tpl[1].title).toBe('B');
    expect(tpl[2].title).toBe('C');
  });

  it('uses latest task params as template', () => {
    const tasks = [
      makeTask({ title: 'X', basePoints: 10, estimatedMinutes: 15, createdAt: 1 }),
      makeTask({ title: 'X', basePoints: 30, estimatedMinutes: 45, createdAt: 2 }),
    ];
    const [tpl] = extractTemplates(tasks);
    expect(tpl.basePoints).toBe(30);
    expect(tpl.estimatedMinutes).toBe(45);
  });

  it('respects limit', () => {
    const tasks = Array.from({ length: 30 }, (_, i) => makeTask({ title: `T${i}`, createdAt: i }));
    expect(extractTemplates(tasks, new Set(), 10)).toHaveLength(10);
  });

  it('ignores empty / whitespace titles', () => {
    const tasks = [
      makeTask({ title: '  ', createdAt: 1 }),
      makeTask({ title: '正常', createdAt: 2 }),
    ];
    expect(extractTemplates(tasks)).toHaveLength(1);
  });

  it('trims titles for grouping', () => {
    const tasks = [
      makeTask({ title: ' 数学 ', createdAt: 1 }),
      makeTask({ title: '数学', createdAt: 2 }),
    ];
    const tpl = extractTemplates(tasks);
    expect(tpl).toHaveLength(1);
    expect(tpl[0].useCount).toBe(2);
  });

  it('filters out hidden titles', () => {
    const tasks = [
      makeTask({ title: '数学', createdAt: 1 }),
      makeTask({ title: '语文', createdAt: 2 }),
      makeTask({ title: '英语', createdAt: 3 }),
    ];
    const hidden = new Set(['语文']);
    const tpl = extractTemplates(tasks, hidden);
    // useCount 都是 1，按 lastUsedAt 倒序 → 英语(3) 在前，数学(1) 在后
    expect(tpl.map(t => t.title)).toEqual(['英语', '数学']);
  });

  it('marks templates touched by child', () => {
    const tasks = [
      makeTask({ title: 'X', createdBy: 'parent', createdAt: 1 }),
      makeTask({ title: 'X', createdBy: 'child', createdAt: 2 }),
    ];
    const [tpl] = extractTemplates(tasks);
    expect(tpl.fromChild).toBe(true);
  });
});

describe('canUndoCompletion', () => {
  it('allows undo when status=done', () => {
    expect(canUndoCompletion({ status: 'done' })).toBe(true);
  });
  it('disallows undo when evaluated', () => {
    expect(canUndoCompletion({ status: 'evaluated' })).toBe(false);
  });
  it('disallows undo for other statuses', () => {
    expect(canUndoCompletion({ status: 'pending' })).toBe(false);
    expect(canUndoCompletion({ status: 'scheduled' })).toBe(false);
    expect(canUndoCompletion({ status: 'inProgress' })).toBe(false);
  });
});

describe('canChildDeleteTask', () => {
  it('allows child to delete own pending task', () => {
    expect(canChildDeleteTask({ status: 'pending', createdBy: 'child' })).toBe(true);
  });
  it('allows child to delete own done (un-evaluated) task', () => {
    expect(canChildDeleteTask({ status: 'done', createdBy: 'child' })).toBe(true);
  });
  it('disallows after evaluation', () => {
    expect(canChildDeleteTask({ status: 'evaluated', createdBy: 'child' })).toBe(false);
  });
  it('disallows for parent-added tasks', () => {
    expect(canChildDeleteTask({ status: 'pending', createdBy: 'parent' })).toBe(false);
  });
});
