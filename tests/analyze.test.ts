import { describe, it, expect } from 'vitest';
import { analyzeWeek } from '../src/lib/analyze';
import type { Task, Evaluation, PointsEntry } from '../src/types';

const today = '2026-05-12';

describe('analyzeWeek', () => {
  it('returns a multi-line text', () => {
    const text = analyzeWeek({
      tasks: [], evaluations: [], points: [], childName: '肥仔', streakDays: 0,
    }, today);
    expect(text).toContain('本周分析');
    expect(text.split('\n').length).toBeGreaterThan(3);
  });

  it('mentions completion delta vs last week', () => {
    const tasks: Task[] = [
      { id: '1', title: 'a', date: '2026-05-08', basePoints: 20, estimatedMinutes: 25, subject: 'math', status: 'evaluated', createdAt: 0 },
      { id: '2', title: 'b', date: '2026-05-09', basePoints: 20, estimatedMinutes: 25, subject: 'math', status: 'evaluated', createdAt: 0 },
    ];
    const text = analyzeWeek({ tasks, evaluations: [], points: [], childName: '肥仔', streakDays: 5 }, today);
    expect(text).toContain('完成 2 项');
  });

  it('mentions strongest subject when evaluations exist', () => {
    const tasks: Task[] = [
      { id: '1', title: 'a', date: '2026-05-10', basePoints: 20, estimatedMinutes: 25, subject: 'english', status: 'evaluated', createdAt: 0 },
    ];
    const evs: Evaluation[] = [
      { id: 'e1', taskId: '1', basePointsAtEval: 20, completion: 5, quality: 5, attitude: 5, evaluatedAt: new Date('2026-05-10').getTime(), finalPoints: 24 },
    ];
    const text = analyzeWeek({ tasks, evaluations: evs, points: [], childName: '肥仔', streakDays: 3 }, today);
    expect(text).toContain('英语');
  });

  it('includes pet commentary', () => {
    const text = analyzeWeek({ tasks: [], evaluations: [], points: [], childName: '小明', streakDays: 0 }, today);
    expect(text).toContain('蛋仔');
    expect(text).toContain('小明');
  });

  it('mentions points trend', () => {
    const points: PointsEntry[] = [
      { id: 'p1', ts: new Date('2026-05-10').getTime(), delta: 50, reason: 'a' },
    ];
    const text = analyzeWeek({ tasks: [], evaluations: [], points, childName: '肥仔', streakDays: 0 }, today);
    expect(text).toContain('50 积分');
  });
});
