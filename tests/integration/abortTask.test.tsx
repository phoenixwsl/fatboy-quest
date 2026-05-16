// ============================================================
// R5.6.0: 评分页作废任务（孩子点错了）— 直接删除
//   AB1: abortTask 删任务 + 从 schedule.items 摘掉，其它任务不动
//   AB2: 作废后不在「待评分」查询结果里（Evaluations 用同款 query）
//   AB3: UI — 详情弹窗点「作废」+ 确认 → 任务消失
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db, initializeDB } from '../../src/db';
import { Evaluations } from '../../src/pages/parent/Evaluations';
import { abortTask } from '../../src/lib/evaluate';
import { useAppStore } from '../../src/store/useAppStore';
import { resetDB, seedSetupComplete, makeTask, makeSchedule } from './helpers';

vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([{ ok: true }])),
  messages: {
    taskDone: vi.fn(() => ({ title: '', body: '' })),
    help: vi.fn(), redeem: vi.fn(), streakBreakAlert: vi.fn(),
  },
}));
vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const passthrough = (tag: string) =>
    React.forwardRef<any, any>(({ children, layoutId, layout, initial, animate, exit, transition, whileTap, whileHover, variants, ...rest }: any, ref) =>
      React.createElement(tag, { ref, ...rest }, children));
  const motion: any = new Proxy({}, { get: (_, k: string) => passthrough(k) });
  return {
    motion,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValue: (v: any) => ({ get: () => v, set: vi.fn() }),
    useTransform: () => ({ get: () => 0 }),
  };
});

beforeEach(async () => {
  await resetDB();
  await initializeDB();
  await seedSetupComplete();
});

describe('AB · abortTask 核心逻辑', () => {
  it('AB1: 删任务 + 从 schedule.items 摘掉，其它任务不动', async () => {
    const t1 = makeTask({ id: 'ab_t1', title: '点错的', status: 'done', completedAt: Date.now() });
    const t2 = makeTask({ id: 'ab_t2', title: '正常的', status: 'done', completedAt: Date.now() });
    await db.tasks.bulkPut([t1, t2] as any);
    await db.schedules.put(makeSchedule({
      id: 'ab_sch',
      items: [
        { kind: 'task', taskId: 'ab_t1' },
        { kind: 'task', taskId: 'ab_t2' },
      ],
    }) as any);

    await abortTask(db, 'ab_t1');

    expect(await db.tasks.get('ab_t1')).toBeUndefined();
    expect(await db.tasks.get('ab_t2')).toBeTruthy();
    const sch = await db.schedules.get('ab_sch');
    expect(sch?.items.map((i: any) => i.taskId)).toEqual(['ab_t2']);
  });

  it('AB2: 作废后不在「待评分」查询结果里', async () => {
    await db.tasks.put(makeTask({ id: 'ab_p1', status: 'done', completedAt: Date.now() }) as any);

    await abortTask(db, 'ab_p1');

    const pending = await db.tasks.where({ status: 'done' }).toArray();
    expect(pending.find(t => t.id === 'ab_p1')).toBeUndefined();
  });

  it('AB-noop: 不存在的 taskId → 安全无副作用', async () => {
    await expect(abortTask(db, 'nope')).resolves.toBeUndefined();
  });
});

describe('AB · Evaluations 弹窗作废流程', () => {
  it('AB3: 点详情 → 点作废 → 确认 → 任务从待评分消失', async () => {
    await db.tasks.put(makeTask({
      id: 'ab_ui', title: '孩子点错的任务', status: 'done', completedAt: Date.now(),
    }) as any);

    render(
      <MemoryRouter initialEntries={['/parent/evaluations']}>
        <Routes>
          <Route path="/parent/evaluations" element={<Evaluations />} />
          <Route path="/parent/dashboard" element={<div>DASH</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // 待评分列表里出现
    await waitFor(() => expect(screen.getByText('孩子点错的任务')).toBeTruthy());

    // 打开详情弹窗
    fireEvent.click(screen.getByText('孩子点错的任务'));
    await waitFor(() => expect(screen.getByText(/点错了，作废/)).toBeTruthy());

    // 点作废 → 触发 confirmModal（store）
    fireEvent.click(screen.getByText(/点错了，作废/));
    await waitFor(() => expect(useAppStore.getState().confirm).toBeTruthy());

    // 家长确认
    await act(async () => {
      useAppStore.getState().resolveConfirm(true);
    });

    // 任务被删除，DB 与列表都没了
    await waitFor(() => {
      expect(screen.queryByText('孩子点错的任务')).toBeNull();
    });
    expect(await db.tasks.get('ab_ui')).toBeUndefined();
  });
});
