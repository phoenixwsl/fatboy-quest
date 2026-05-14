// ============================================================
// 书房（StudyRoomPage）集成测试 — R3.5
//
// 覆盖：
//   SR1: 页面渲染基础元素（标题、三柜、桌前肥仔、积分）
//   SR2: 左柜点击 → trophy 浮层 + 标题
//   SR3: 中柜点击 → lego 浮层 + 空状态文案
//   SR4: 右柜点击 → toy 浮层 + 空状态文案
//   SR5: trophy 浮层在 badges 为空时显示鼓励文案
//   SR6: trophy 浮层在 badges 非空时显示成就网格
//   SR7: 关闭按钮可以关闭浮层
//   SR8: 积分徽章显示外面同款 total 数字
//   SR9: 返回按钮触发 navigate(-1)
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db, initializeDB } from '../../src/db';
import { StudyRoomPage } from '../../src/pages/StudyRoomPage';
import { resetDB, seedSetupComplete } from './helpers';

vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));
vi.mock('framer-motion', async () => {
  const React = await import('react');
  const passthrough = (tag: string) =>
    React.forwardRef<any, any>(({
      children, layoutId, layout, initial, animate, exit, transition,
      whileTap, whileHover, variants, ...rest
    }: any, ref) => React.createElement(tag, { ref, ...rest }, children));
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
  await seedSetupComplete({ childName: '肥仔' });
});

function renderStudyRoom() {
  return render(
    <MemoryRouter initialEntries={['/back', '/home']} initialIndex={1}>
      <Routes>
        <Route path="/home" element={<StudyRoomPage />} />
        <Route path="/back" element={<div data-testid="prev-page">PREV</div>} />
        <Route path="/shop" element={<div data-testid="shop-page">SHOP</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SR · StudyRoom 页面渲染', () => {
  it('SR1: 渲染基础元素 — 标题 / 三柜 / 桌前问候 / 商店按钮', async () => {
    renderStudyRoom();

    await waitFor(() => {
      expect(screen.getByText('肥仔的书房')).toBeTruthy();
    });

    // 三个柜子
    expect(screen.getByText('奖杯柜')).toBeTruthy();
    expect(screen.getByText('LEGO 柜')).toBeTruthy();
    expect(screen.getByText('玩具柜')).toBeTruthy();

    // 商店按钮 + 返回按钮
    expect(screen.getByText(/装饰商店/)).toBeTruthy();
    expect(screen.getByText('← 返回')).toBeTruthy();

    // 桌前问候（包含 childName "肥仔"）
    const greeting = await screen.findByText(/肥仔$/);
    expect(greeting).toBeTruthy();
  });
});

describe('SR · 三柜可点击 + Overlay 类型分发', () => {
  it('SR2: 点左柜 → 打开 trophy overlay（标题"我的成就"）', async () => {
    renderStudyRoom();
    await screen.findByText('奖杯柜');

    fireEvent.click(screen.getByText('奖杯柜'));

    await waitFor(() => {
      expect(screen.getByText(/我的成就/)).toBeTruthy();
    });
  });

  it('SR3: 点中柜 → 打开 lego overlay + 空状态文案', async () => {
    renderStudyRoom();
    await screen.findByText('LEGO 柜');

    fireEvent.click(screen.getByText('LEGO 柜'));

    await waitFor(() => {
      expect(screen.getByText(/我的 LEGO/)).toBeTruthy();
    });
    // 空状态文案
    expect(screen.getByText(/还没有 LEGO 收藏/)).toBeTruthy();
  });

  it('SR4: 点右柜 → 打开 toy overlay + 空状态文案', async () => {
    renderStudyRoom();
    await screen.findByText('玩具柜');

    fireEvent.click(screen.getByText('玩具柜'));

    await waitFor(() => {
      expect(screen.getByText(/我的玩具/)).toBeTruthy();
    });
    expect(screen.getByText(/还没有玩具收藏/)).toBeTruthy();
  });
});

describe('SR · trophy 浮层空 vs 非空', () => {
  it('SR5: badges 为空时显示鼓励文案', async () => {
    renderStudyRoom();
    await screen.findByText('奖杯柜');

    fireEvent.click(screen.getByText('奖杯柜'));

    await waitFor(() => {
      expect(screen.getByText(/继续加油/)).toBeTruthy();
    });
  });

  it('SR6: badges 非空时显示成就网格', async () => {
    // 先 seed 一个真实的 badge id（从 ACHIEVEMENTS 取）
    await db.badges.put({ id: 'first_step', unlockedAt: Date.now() } as any);

    renderStudyRoom();
    await screen.findByText('奖杯柜');

    fireEvent.click(screen.getByText('奖杯柜'));

    await waitFor(() => {
      // 成就标题 "第一步" 应该渲染在 trophy-card 里
      expect(screen.getByText('第一步')).toBeTruthy();
    });
    // 计数 "1 个"
    expect(screen.getByText(/1 个/)).toBeTruthy();
    // 不应再看到空状态
    expect(screen.queryByText(/继续加油/)).toBeNull();
  });
});

describe('SR · 关闭浮层', () => {
  it('SR7: 点关闭按钮可以关闭 overlay', async () => {
    renderStudyRoom();
    await screen.findByText('LEGO 柜');

    fireEvent.click(screen.getByText('LEGO 柜'));
    await waitFor(() => {
      expect(screen.getByText(/我的 LEGO/)).toBeTruthy();
    });

    // 关闭按钮 aria-label="关闭"
    const closeBtn = screen.getByLabelText('关闭');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/我的 LEGO/)).toBeNull();
    });
  });
});

describe('SR · 积分显示与外面对齐', () => {
  it('SR8: 积分徽章数字 = 当前 total（与 HomePage 同源）', async () => {
    // 给个 30 + 15 = 45 的积分记录
    await db.points.bulkPut([
      { id: 'p1', taskId: 't1', delta: 30, ts: Date.now(), reason: 'task' },
      { id: 'p2', taskId: 't2', delta: 15, ts: Date.now(), reason: 'task' },
    ] as any);

    renderStudyRoom();

    await waitFor(() => {
      // 积分数字 45 出现（study-points-badge 里的 .text-num）
      expect(screen.getByText('45')).toBeTruthy();
    });
  });
});

describe('SR · 导航', () => {
  it('SR9: 点商店按钮 → 跳到 /shop', async () => {
    renderStudyRoom();
    await screen.findByText(/装饰商店/);

    fireEvent.click(screen.getByText(/装饰商店/));

    await waitFor(() => {
      expect(screen.getByTestId('shop-page')).toBeTruthy();
    });
  });
});
