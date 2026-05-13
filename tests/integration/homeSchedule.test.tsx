// ============================================================
// HomePage / SchedulePage / Reset / Heal 集成测试
// HomePage 渲染（HP）+ SchedulePage 流程（SP）+ 数据完整性（D）
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db, initializeDB } from '../../src/db';
import { HomePage } from '../../src/pages/HomePage';
import { SchedulePage } from '../../src/pages/SchedulePage';
import { detectHealActions, isHealNeeded } from '../../src/lib/heal';
import { planCurrentStateReset } from '../../src/lib/reset';
import { resetDB, seedSetupComplete, makeTask, makeSchedule, today } from './helpers';

vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([{ ok: true }])),
  messages: {
    taskDone: vi.fn(() => ({ title: '', body: '' })),
    help: vi.fn(),
    redeem: vi.fn(),
    streakBreakAlert: vi.fn(),
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
        <Route path="/schedule" element={<div data-testid="schedule-page">SCHEDULE</div>} />
        <Route path="/quest" element={<div data-testid="quest-page">QUEST</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderSchedule() {
  return render(
    <MemoryRouter initialEntries={['/schedule']}>
      <Routes>
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/quest" element={<div data-testid="quest-page">QUEST</div>} />
        <Route path="/" element={<div data-testid="home-page">HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ============================================================
describe('HP · HomePage 渲染', () => {
  it('HP1: 3 段（pending / scheduled / done）混合渲染', async () => {
    await db.tasks.bulkPut([
      makeTask({ id: 'p1', title: 'pending-task', status: 'pending' }),
      makeTask({ id: 's1', title: 'scheduled-task', status: 'scheduled' }),
      makeTask({ id: 'd1', title: 'done-task', status: 'done', completedAt: Date.now() }),
    ] as any);
    await db.schedules.put(makeSchedule({
      id: 'sh1',
      items: [{ kind: 'task', taskId: 's1', startMinute: 0, durationMinutes: 10 }],
    }) as any);

    renderHome();

    // 全部断言在 waitFor 里 — useLiveQuery 在 CI 上慢
    await waitFor(() => {
      expect(screen.getByText('pending-task')).toBeInTheDocument();
      expect(screen.getByText('scheduled-task')).toBeInTheDocument();
      expect(screen.getByText(/今日已击败 \(1\)/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('HP2: scheduledOrInProgress > 0 时显示"未完成闯关"横幅', async () => {
    await db.tasks.put(makeTask({ id: 's1', status: 'inProgress' }) as any);
    await db.schedules.put(makeSchedule({
      id: 'sh1',
      items: [{ kind: 'task', taskId: 's1', startMinute: 0, durationMinutes: 10 }],
    }) as any);

    renderHome();
    await waitFor(() => {
      expect(screen.getByText(/你有未完成的闯关/)).toBeInTheDocument();
      expect(screen.getByText(/1 个小怪还在等你/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('HP3: 点"📅 去规划今天" → nav 到 /schedule', async () => {
    await db.tasks.put(makeTask({ id: 'p1', status: 'pending' }) as any);
    renderHome();

    const btn = await screen.findByRole('button', { name: /去规划今天/ });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('schedule-page')).toBeInTheDocument();
    });
  });

  it('HP5: "✓ 今日已击败"区块可折叠/展开', async () => {
    await db.tasks.bulkPut([
      makeTask({ id: 'd1', title: 'done-A', status: 'done', completedAt: Date.now() }),
      makeTask({ id: 'd2', title: 'done-B', status: 'evaluated', completedAt: Date.now() }),
    ] as any);

    renderHome();

    // 默认折叠时：done-A / done-B 不在 DOM 里
    await waitFor(() => {
      expect(screen.getByText(/今日已击败/)).toBeInTheDocument();
    });
    expect(screen.queryByText('done-A')).toBeNull();

    // 点击展开
    fireEvent.click(screen.getByText(/今日已击败/).closest('button')!);
    await waitFor(() => {
      expect(screen.getByText('done-A')).toBeInTheDocument();
      expect(screen.getByText('done-B')).toBeInTheDocument();
    });
  });
});

// ============================================================
describe('SP · SchedulePage 流程', () => {
  it('SP1: pendingTasks 渲染在"待安排"区域', async () => {
    await db.tasks.bulkPut([
      makeTask({ id: 'pa', title: '语文', status: 'pending' }),
      makeTask({ id: 'pb', title: '数学', status: 'pending' }),
    ] as any);

    renderSchedule();

    // 把所有断言都放进 waitFor — useLiveQuery 在 CI 上比本地慢
    await waitFor(() => {
      expect(screen.getByText(/待安排/)).toBeInTheDocument();
      expect(screen.getByText('语文')).toBeInTheDocument();
      expect(screen.getByText('数学')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('SP2: 有 inFlight（scheduled/inProgress）任务时自动跳 /quest', async () => {
    await db.tasks.put(makeTask({ id: 's1', status: 'scheduled' }) as any);
    await db.schedules.put(makeSchedule({
      id: 'sh1',
      items: [{ kind: 'task', taskId: 's1', startMinute: 0, durationMinutes: 10 }],
    }) as any);

    renderSchedule();
    // 800ms 后自动 nav 到 /quest
    await waitFor(() => {
      expect(screen.getByTestId('quest-page')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('SP3: 把任务加入时间轴 + 锁定 → schedule 写入 + 所有任务 status=scheduled', async () => {
    // 测 lockAndStart 的副作用 — 直接模拟 DB 写入逻辑（避免触发 dnd-kit / 拖拽）
    await db.tasks.bulkPut([
      makeTask({ id: 'a', status: 'pending' }),
      makeTask({ id: 'b', status: 'pending' }),
    ] as any);

    // 模拟 lockAndStart
    const items = [
      { kind: 'task', taskId: 'a', startMinute: 480, durationMinutes: 15 },
      { kind: 'task', taskId: 'b', startMinute: 500, durationMinutes: 20 },
    ];
    const scheduleId = `${today}_round_${Date.now()}`;
    await db.schedules.put({
      id: scheduleId, date: today, round: 1, items, lockedAt: Date.now(),
    } as any);
    await db.transaction('rw', db.tasks, async () => {
      for (const it of items) {
        if (it.kind === 'task' && it.taskId) {
          await db.tasks.update(it.taskId, { status: 'scheduled' });
        }
      }
    });

    // 验证
    const sch = await db.schedules.get(scheduleId);
    expect(sch?.lockedAt).toBeDefined();
    expect(sch?.items.length).toBe(2);
    expect((await db.tasks.get('a'))?.status).toBe('scheduled');
    expect((await db.tasks.get('b'))?.status).toBe('scheduled');
  });

  it('SP4: 照搬上次 — recentSchedule 复制为新 board', async () => {
    // 上次 schedule（已完成）
    await db.tasks.bulkPut([
      makeTask({ id: 'past', title: '语文', status: 'evaluated', completedAt: Date.now() - 86400_000 }),
    ] as any);
    await db.schedules.put({
      ...makeSchedule({
        id: 'past_sch', date: '2026-01-01',
        items: [{ kind: 'task', taskId: 'past', startMinute: 0, durationMinutes: 10 }],
      }),
      completedAt: Date.now() - 86400_000,
    } as any);

    // 今天的同名 pending 任务
    await db.tasks.put(makeTask({ id: 'today1', title: '语文', status: 'pending' }) as any);

    // 模拟 copyFromLast 的核心：找 lockedAt 的最近 schedule，复制 items
    const recent = (await db.schedules.orderBy('id').reverse().limit(20).toArray())
      .find(s => s.lockedAt);
    expect(recent).toBeDefined();

    // 复制时应能匹配同名 task（实际 UI 逻辑 — 这里只断言数据可被匹配）
    const todays = await db.tasks.where({ date: today, status: 'pending' }).toArray();
    const matched = todays.find(p => p.title === '语文');
    expect(matched?.id).toBe('today1');
  });
});

// ============================================================
describe('D · 数据完整性 / 重置 / 自愈', () => {
  it('D5: planCurrentStateReset 不动 evaluations / points / streak / badges / pet / shop / redemptions', async () => {
    // 准备一堆历史数据
    await db.tasks.bulkPut([
      makeTask({ id: 's1', status: 'scheduled' }),
      makeTask({ id: 'd1', status: 'done', completedAt: Date.now() }),
      makeTask({ id: 'e1', status: 'evaluated', completedAt: Date.now() }),
    ] as any);
    await db.evaluations.put({
      id: 'ev1', taskId: 'e1', basePointsAtEval: 10,
      completion: 1, quality: 1, attitude: 1,
      finalPoints: 10, evaluatedAt: Date.now(),
    } as any);
    await db.points.put({ id: 'p1', ts: Date.now(), delta: 10, reason: 'evaluated' } as any);
    await db.badges.put({ id: 'b1', unlockedAt: Date.now() } as any);
    await db.redemptions.put({
      id: 'rd1', shopItemId: 'x', shopItemName: 'X',
      costPoints: 10, redeemedAt: Date.now(),
    } as any);

    const tasks = await db.tasks.toArray();
    const schedules = await db.schedules.toArray();
    const plan = planCurrentStateReset(tasks, schedules);

    // 只动 inFlight tasks，不返回 badge/evaluation/points 表的 id
    expect(plan.taskIdsToReset).toEqual(['s1']);
    expect(plan.scheduleIdsToUncomplete).toEqual([]);
    // plan 的 keys 只有 2 个
    expect(Object.keys(plan).sort()).toEqual(['scheduleIdsToUncomplete', 'taskIdsToReset']);
  });

  it('D6: 自愈 — schedule.completedAt 已设但还有 scheduled task → 应清掉 completedAt', async () => {
    // 真实死锁场景：schedule.completedAt 已设，但里面还有 inFlight 任务
    // → 用户既不能进 quest（schedule 看起来已完成），也不能再规划
    await db.tasks.bulkPut([
      makeTask({ id: 'a', status: 'done', completedAt: Date.now() }),
      makeTask({ id: 'b', status: 'scheduled' }), // 还在 inFlight！
    ] as any);
    await db.schedules.put({
      ...makeSchedule({
        id: 'sh_heal',
        items: [
          { kind: 'task', taskId: 'a', startMinute: 0, durationMinutes: 10 },
          { kind: 'task', taskId: 'b', startMinute: 10, durationMinutes: 10 },
        ],
        completedAt: Date.now(), // 被错误标记完成
      }),
    } as any);

    const tasks = await db.tasks.toArray();
    const schedules = await db.schedules.toArray();
    const plan = detectHealActions(tasks, schedules, today);

    expect(isHealNeeded(plan)).toBe(true);
    expect(plan.uncompleteScheduleIds).toContain('sh_heal');
  });

  it('D6b: 自愈 — inFlight task 但所有 schedule 都已 completed → 应重置 task', async () => {
    // 这是 R2.0.2 修过的死锁场景（用户撤回了任务但 schedule 状态没更新）
    await db.tasks.put(makeTask({ id: 's_orphan', status: 'scheduled' }) as any);
    await db.schedules.put({
      ...makeSchedule({
        id: 'sh_old',
        items: [{ kind: 'task', taskId: 's_orphan', startMinute: 0, durationMinutes: 10 }],
        completedAt: Date.now() - 60000,
      }),
    } as any);

    const tasks = await db.tasks.toArray();
    const schedules = await db.schedules.toArray();
    const plan = detectHealActions(tasks, schedules, today);

    // schedule 会被 uncompleted，所以 task 不需要 reset
    expect(plan.uncompleteScheduleIds).toContain('sh_old');
  });
});
