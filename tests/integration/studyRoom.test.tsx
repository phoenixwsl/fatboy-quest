// ============================================================
// 书房（StudyRoomPage）集成测试
//
// 覆盖：
//   SR1: 页面渲染基础元素（标题、科比海报、桌前肥仔、积分）
//   SR8: 积分徽章显示外面同款 total 数字
//   SR9: 返回按钮触发 navigate(-1)
//   SR10: 商店按钮跳转 /shop
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
  it('SR1: 渲染基础元素 — 标题 / 科比海报 / 桌前问候 / 商店按钮', async () => {
    renderStudyRoom();

    await waitFor(() => {
      expect(screen.getByText('肥仔的书房')).toBeTruthy();
    });

    // 科比海报
    expect(screen.getByAltText('偶像海报')).toBeTruthy();

    // 商店按钮 + 返回按钮
    expect(screen.getByText(/装饰商店/)).toBeTruthy();
    expect(screen.getByText('← 返回')).toBeTruthy();

    // 桌前问候（包含 childName "肥仔"）
    const greeting = await screen.findByText(/肥仔$/);
    expect(greeting).toBeTruthy();
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
  it('SR9: 点返回按钮 → 返回上一页', async () => {
    renderStudyRoom();
    await screen.findByText('← 返回');

    fireEvent.click(screen.getByText('← 返回'));

    await waitFor(() => {
      expect(screen.getByTestId('prev-page')).toBeTruthy();
    });
  });

  it('SR10: 点商店按钮 → 跳到 /shop', async () => {
    renderStudyRoom();
    await screen.findByText(/装饰商店/);

    fireEvent.click(screen.getByText(/装饰商店/));

    await waitFor(() => {
      expect(screen.getByTestId('shop-page')).toBeTruthy();
    });
  });
});
