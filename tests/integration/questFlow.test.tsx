// ============================================================
// 关键回归测试：schedule → quest 的渲染路径
// 这一类测试本来从 R1 就应该有，R2.2.x 的"点进闯关空白"事故
// 就是因为只有纯函数 unit test，没有集成测试。
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../src/db';
import { QuestPage } from '../../src/pages/QuestPage';
import { todayString } from '../../src/lib/time';

// 屏蔽真实 Bark 推送（不联网）
vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve()),
  messages: {},
}));

// 屏蔽 sounds（无 Web Audio）
vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));

// 缩短 framer-motion 时序，避免动画把 DOM 推迟
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const passthrough = (tag: string) =>
    React.forwardRef<any, any>(({ children, layoutId: _l, layout: _lay,
      initial: _i, animate: _a, exit: _e, transition: _t, whileTap: _wt,
      whileHover: _wh, variants: _v, ...rest }, ref) =>
      React.createElement(tag, { ref, ...rest }, children));
  const motion: any = new Proxy({}, { get: (_, k: string) => passthrough(k) });
  return {
    motion,
    AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
  };
});

async function resetDB() {
  await db.delete();
  await db.open();
}

function renderQuest() {
  return render(
    <MemoryRouter initialEntries={['/quest']}>
      <QuestPage />
    </MemoryRouter>,
  );
}

const today = todayString();

const scheduledTask = (over: any = {}) => ({
  id: 'task_raz',
  title: 'raz阅读',
  date: today,
  basePoints: 0,
  estimatedMinutes: 10,
  subject: 'reading' as const,
  status: 'scheduled' as const,
  createdAt: Date.now(),
  ...over,
});

const lockedSchedule = (taskIds: string[]) => ({
  id: 'sch_today',
  date: today,
  round: 1,
  items: taskIds.map((tid, i) => ({
    kind: 'task' as const, taskId: tid,
    startMinute: 480 + i * 30, durationMinutes: 25,
  })),
  lockedAt: Date.now(),
});

describe('QuestPage 渲染（核心 happy path 回归）', () => {
  beforeEach(resetDB);

  it('已锁定时间轴 + 1 个 scheduled 任务 → 显示任务标题和"我要开始"', async () => {
    await db.tasks.put(scheduledTask());
    await db.schedules.put(lockedSchedule(['task_raz']));

    renderQuest();

    await waitFor(() => {
      expect(screen.getAllByText('raz阅读').length).toBeGreaterThan(0);
      expect(screen.getByText(/我要开始/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('没有任何 schedule → 渲染 fallback（不是空白页）', async () => {
    renderQuest();
    await waitFor(() => {
      expect(screen.getByText(/这里没有进行中的闯关/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /去规划/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /回首页/ })).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('schedule 存在但 completedAt 已设 → 应当 fallback（被视为完成）', async () => {
    await db.tasks.put(scheduledTask({ status: 'evaluated' }));
    await db.schedules.put({
      ...lockedSchedule(['task_raz']),
      completedAt: Date.now(),
    });
    renderQuest();
    await waitFor(() => {
      expect(screen.getByText(/这里没有进行中的闯关/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('inProgress 任务（已点开始）→ 显示倒计时面板，不是空白', async () => {
    await db.tasks.put(scheduledTask({
      status: 'inProgress',
      actualStartedAt: Date.now() - 30000,
    }));
    await db.schedules.put(lockedSchedule(['task_raz']));

    renderQuest();
    await waitFor(() => {
      expect(screen.getAllByText('raz阅读').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    // 倒计时区或完成按钮——总之不能空白
    expect(screen.queryByText(/我要开始/)).toBeNull();
  });

  it('所有任务都 done → 显示"这一轮全部击败"，不是空白', async () => {
    await db.tasks.put(scheduledTask({ status: 'done', completedAt: Date.now() }));
    // schedule lockedAt 设置，但 completedAt 没设置 — 因为孩子端打完最后一项才会写
    await db.schedules.put(lockedSchedule(['task_raz']));

    renderQuest();
    await waitFor(() => {
      expect(screen.getByText(/全部击败/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('多任务时间轴（task + task）→ 第一个 scheduled 是 active，第二个还在排队', async () => {
    await db.tasks.bulkPut([
      scheduledTask({ id: 't1', title: 'task A' }),
      scheduledTask({ id: 't2', title: 'task B' }),
    ]);
    await db.schedules.put(lockedSchedule(['t1', 't2']));
    renderQuest();
    await waitFor(() => {
      expect(screen.getAllByText('task A').length).toBeGreaterThan(0);
      expect(screen.getAllByText('task B').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  // R2.2.5 回归：撤回完成的任务后，重新进闯关应当看到任务（不能"显示没有任务"）
  it('完成 → 撤回后再进闯关：应当显示"我要开始"，不是"全部击败"', async () => {
    // 起始状态：1 个 done 任务 + schedule 已 completed（模拟刚完成全部）
    await db.tasks.put(scheduledTask({
      id: 'task_raz', status: 'done', completedAt: Date.now() - 60_000,
    }));
    await db.schedules.put({
      ...lockedSchedule(['task_raz']),
      completedAt: Date.now() - 60_000,
    });

    // 模拟 HomePage 的"撤回"：status → scheduled，schedule.completedAt 清空
    await db.tasks.update('task_raz', {
      status: 'scheduled',
      completedAt: undefined,
      undoCount: 1,
    });
    await db.schedules.update('sch_today', {
      completedAt: undefined,
      comboPeakInRound: undefined,
      comboBonusPoints: undefined,
      reportShownAt: undefined,
    });

    renderQuest();
    // 撤回后应该重新显示"我要开始"按钮，而不是空白或"全部击败"
    await waitFor(() => {
      expect(screen.getByText(/我要开始/)).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.queryByText(/全部击败/)).toBeNull();
    expect(screen.queryByText(/这里没有进行中的闯关/)).toBeNull();
  });

  it('多任务 + 撤回中间一个：QuestPage 正确选中被撤回的任务', async () => {
    // 模拟 3 个任务的时间轴，全部完成后用户撤回中间那个
    await db.tasks.bulkPut([
      scheduledTask({ id: 't1', title: 'task A', status: 'evaluated', completedAt: Date.now() - 90_000 }),
      scheduledTask({ id: 't2', title: 'task B', status: 'done', completedAt: Date.now() - 60_000 }),
      scheduledTask({ id: 't3', title: 'task C', status: 'evaluated', completedAt: Date.now() - 30_000 }),
    ]);
    await db.schedules.put({
      ...lockedSchedule(['t1', 't2', 't3']),
      completedAt: Date.now() - 30_000,
    });

    // 撤回中间的 task B（HomePage 版本：status → scheduled）
    await db.tasks.update('t2', { status: 'scheduled', completedAt: undefined });
    await db.schedules.update('sch_today', { completedAt: undefined });

    renderQuest();
    // QuestPage 应当跳过 t1 / t3（evaluated）找到 t2（scheduled）作为 active
    await waitFor(() => {
      expect(screen.getByText(/我要开始/)).toBeInTheDocument();
      expect(screen.getAllByText('task B').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('已 evaluated 的任务不能撤回 — 但若 schedule.completedAt 被人为清掉，QuestPage 仍渲染"全部击败"而不是空白', async () => {
    await db.tasks.put(scheduledTask({
      status: 'evaluated', completedAt: Date.now() - 60_000,
    }));
    // 模拟用户用了"仅重置当前任务状态"按钮，把 schedule.completedAt 清了
    // 但 evaluated 任务不会被重置（reset 逻辑只动 scheduled/inProgress）
    await db.schedules.put({
      ...lockedSchedule(['task_raz']),
      // completedAt 缺失
    });

    renderQuest();
    // 没有任何活动任务（全 evaluated），应该看到"全部击败"
    await waitFor(() => {
      expect(screen.getByText(/全部击败/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  // R2.2.6 回归：今天有 2 个 lockedAt && !completedAt 的 schedule —
  // 一个含全 evaluated 任务，一个含活跃 scheduled 任务
  // QuestPage 必须选择含活跃任务的那个（不能因为 id/round 顺序选错）
  it('R2.2.6: 多 schedule — 必须选含活跃任务的那个，不能选全 evaluated 的', async () => {
    // 故意让"全 evaluated 的 schedule" id 字典序更大
    // （触发 reverse().sortBy('round') 的弱点：DESC by id 时它排在前）
    await db.tasks.put(scheduledTask({
      id: 't_raz', title: 'raz阅读',
      status: 'evaluated', completedAt: Date.now() - 600_000,
    }));
    await db.schedules.put({
      id: 'zzz_old_all_evaluated',      // 字典序大
      date: today, round: 1,
      items: [{ kind: 'task', taskId: 't_raz', startMinute: 0, durationMinutes: 10 }],
      lockedAt: Date.now() - 700_000,
      // completedAt 被某次撤回级联清掉
    } as any);

    await db.tasks.put(scheduledTask({
      id: 't_shen', title: '神机妙算', status: 'scheduled',
    }));
    await db.schedules.put({
      id: 'aaa_with_active_task',        // 字典序小
      date: today, round: 1,
      items: [{ kind: 'task', taskId: 't_shen', startMinute: 30, durationMinutes: 25 }],
      lockedAt: Date.now() - 60_000,
    } as any);

    renderQuest();

    await waitFor(() => {
      expect(screen.getByText(/我要开始/)).toBeInTheDocument();
      expect(screen.getAllByText('神机妙算').length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    expect(screen.queryByText(/全部击败/)).toBeNull();
  });

  // R2.2.8 回归：ScoreDetail 应包含**所有今日完成的任务**，包括不在当前 schedule.items 里的
  it('R2.2.8 ScoreDetail: 跨 schedule 的已完成任务也要显示在得分明细里', async () => {
    // 当前 schedule 含一个 scheduled 任务（让 QuestPage 选中它）
    await db.tasks.put(scheduledTask({
      id: 't_active', title: '当前任务', status: 'scheduled',
    }));
    await db.schedules.put({
      id: 'sch_active', date: today, round: 1,
      items: [{ kind: 'task', taskId: 't_active', startMinute: 0, durationMinutes: 25 }],
      lockedAt: Date.now(),
    } as any);

    // 另一个 schedule 含已 evaluated 的任务（不应该在当前 schedule.items 里）
    await db.tasks.put(scheduledTask({
      id: 't_done_other', title: '早上完成的任务',
      status: 'evaluated', completedAt: Date.now() - 60_000,
    }));
    await db.schedules.put({
      id: 'sch_done', date: today, round: 1,
      items: [{ kind: 'task', taskId: 't_done_other', startMinute: 0, durationMinutes: 10 }],
      lockedAt: Date.now() - 70_000,
      completedAt: Date.now() - 60_000,
    } as any);

    renderQuest();
    await waitFor(() => {
      // 当前任务
      expect(screen.getAllByText('当前任务').length).toBeGreaterThan(0);
      // 早上完成的任务也必须出现（即使不在 sch_active.items 里）
      expect(screen.getByText('早上完成的任务')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('schedule 卡死（任务全 done 但 completedAt 未写）→ 自愈应该修复，不渲染空白', async () => {
    await db.tasks.bulkPut([
      scheduledTask({ id: 't1', status: 'done', completedAt: Date.now() }),
      scheduledTask({ id: 't2', status: 'evaluated', completedAt: Date.now() }),
    ]);
    await db.schedules.put(lockedSchedule(['t1', 't2']));
    renderQuest();
    // 不强求 heal 的具体效果，只验证不会整页空白
    await waitFor(() => {
      expect(
        screen.queryByText(/全部击败/) || screen.queryByText(/这里没有进行中的闯关/),
      ).toBeTruthy();
    }, { timeout: 3000 });
  });
});
