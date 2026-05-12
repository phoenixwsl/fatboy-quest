// 回归测试：RestBlock 之前因 useEffect deps 含不稳定 callback 导致 setInterval
// 反复重建、倒计时永远不前进。这里验证：
//   1. 渲染不崩
//   2. 计时确实在前进（关键 regression）
//   3. 父组件高频重渲染（变化的 callback 引用）不会破坏计时
// 注：R1.3 起 onComplete 只在用户点"结束休息"时触发，不在倒计时归零时触发
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import React from 'react';
import { RestBlock } from '../src/components/RestBlock';

describe('RestBlock regression: timer must tick down', () => {
  beforeEach(() => { vi.useFakeTimers({ now: 1_700_000_000_000 }); });
  afterEach(() => { vi.useRealTimers(); cleanup(); });

  it('renders without crashing', () => {
    const { container } = render(
      React.createElement(RestBlock, { durationMinutes: 1, startedAt: Date.now(), onComplete: () => {} }),
    );
    expect(container.textContent).toContain('休息');
  });

  it('countdown text updates as time advances (regression check)', () => {
    const startedAt = Date.now();
    const { container } = render(
      React.createElement(RestBlock, { durationMinutes: 1, startedAt, onComplete: () => {} }),
    );
    const initialText = container.textContent;
    act(() => { vi.advanceTimersByTime(20_000); });
    const laterText = container.textContent;
    // 文案应该已经变了（关键检查：timer 真的在跑）
    expect(laterText).not.toBe(initialText);
  });

  it('shows "休息结束啦" state after duration elapses', () => {
    const startedAt = Date.now();
    const { container } = render(
      React.createElement(RestBlock, { durationMinutes: 1, startedAt, onComplete: () => {} }),
    );
    act(() => { vi.advanceTimersByTime(65_000); });
    expect(container.textContent).toContain('休息结束');
  });

  it('survives parent re-renders with new onComplete reference each render', () => {
    // 模拟父组件每次 render 创造新的 onComplete 引用（这正是导致原 bug 的场景）
    const startedAt = Date.now();
    function Wrapper() {
      return React.createElement(RestBlock, {
        durationMinutes: 1,
        startedAt,
        onComplete: () => {},  // 每次新引用
      });
    }
    const { container, rerender } = render(React.createElement(Wrapper));
    const before = container.textContent;
    for (let i = 0; i < 10; i++) {
      act(() => { vi.advanceTimersByTime(1_000); });
      rerender(React.createElement(Wrapper));
    }
    const after = container.textContent;
    // 10 秒过去文案应该变了
    expect(after).not.toBe(before);
  });
});
