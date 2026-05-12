// 回归测试：RestBlock 之前因 useEffect deps 含不稳定 callback 导致
// setInterval 反复重建，倒计时永远不前进。这里验证：
//   1. onComplete 最终会触发
//   2. 父组件每秒重渲染（变化的 callback 引用）不会破坏计时
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
    expect(container.textContent).toContain('休息中');
  });

  it('onComplete fires when duration elapses', () => {
    const startedAt = Date.now();
    const onComplete = vi.fn();
    render(React.createElement(RestBlock, { durationMinutes: 1, startedAt, onComplete }));
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(61_000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onComplete twice even if timer overshoots', () => {
    const startedAt = Date.now();
    const onComplete = vi.fn();
    render(React.createElement(RestBlock, { durationMinutes: 1, startedAt, onComplete }));
    act(() => { vi.advanceTimersByTime(120_000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('survives parent re-renders with new callback every render', () => {
    // 模拟父组件每次 render 创造新的 onComplete 引用（这正是导致原 bug 的场景）
    const startedAt = Date.now();
    const onCompleteSpy = vi.fn();
    function Wrapper() {
      return React.createElement(RestBlock, {
        durationMinutes: 1,
        startedAt,
        // 新引用 + 转发到稳定的 spy
        onComplete: () => onCompleteSpy(),
      });
    }
    const { rerender } = render(React.createElement(Wrapper));
    // 在 60 秒内每秒触发一次父组件重渲染
    for (let i = 0; i < 60; i++) {
      act(() => { vi.advanceTimersByTime(1_000); });
      rerender(React.createElement(Wrapper));
    }
    // 此时倒计时应已结束
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(onCompleteSpy).toHaveBeenCalled();
  });
});
