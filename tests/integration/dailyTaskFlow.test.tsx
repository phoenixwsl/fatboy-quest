// ============================================================
// R5.6.0: 家长加每日任务 → 孩子端当场可见
//   DT1: 加 daily 定义 + generateTodayDailyTasks → 今天生成实例
//   DT2: 仅加 daily 定义，渲染 HomePage → 兜底 useEffect 物化 → 标题可见
//   DT3: weekly 定义不会被 daily 物化误生成
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db, initializeDB } from '../../src/db';
import { HomePage } from '../../src/pages/HomePage';
import { generateTodayDailyTasks } from '../../src/lib/recurrence';
import { resetDB, seedSetupComplete, today } from './helpers';

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

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/schedule" element={<div data-testid="schedule-page">S</div>} />
        <Route path="/quest" element={<div data-testid="quest-page">Q</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const dailyDef = (over: any = {}) => ({
  id: 'def_' + Math.random().toString(36).slice(2, 8),
  title: '每日跳绳',
  subject: 'sport',
  basePoints: 15,
  estimatedMinutes: 10,
  type: 'daily',
  active: true,
  isRequired: true,
  createdAt: Date.now(),
  ...over,
});

describe('DT · 每日任务家长加 → 孩子端可见', () => {
  it('DT1: 加 daily 定义 + generateTodayDailyTasks → 今天生成实例', async () => {
    await db.taskDefinitions.add(dailyDef({ title: '每日口算' }) as any);

    const n = await generateTodayDailyTasks(db as any);

    expect(n).toBe(1);
    const tasks = await db.tasks.where({ date: today }).toArray();
    expect(tasks.some(t => t.title === '每日口算' && t.status === 'pending')).toBe(true);
  });

  it('DT2: 仅加 daily 定义，渲染 HomePage → 兜底物化 → 标题可见', async () => {
    await db.taskDefinitions.add(dailyDef({ title: '每日朗读' }) as any);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('每日朗读')).toBeTruthy();
    });
  });

  it('DT3: weekly 定义不会被 daily 物化误生成', async () => {
    await db.taskDefinitions.add(dailyDef({ title: '周末画画', type: 'weekly', isRequired: undefined }) as any);

    const n = await generateTodayDailyTasks(db as any);

    expect(n).toBe(0);
    const tasks = await db.tasks.where({ date: today }).toArray();
    expect(tasks.length).toBe(0);
  });
});
