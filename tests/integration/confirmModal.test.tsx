// ============================================================
// 自定义 ConfirmModal 集成测试
// 替代原生 window.confirm — 大号弹窗 / 多 tone / Promise API
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { useAppStore } from '../../src/store/useAppStore';

vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([])),
  messages: {},
}));
vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));

function renderModal() {
  return render(<ConfirmModal />);
}

beforeEach(() => {
  // 清掉 store 状态
  useAppStore.setState({ confirm: null });
});

describe('ConfirmModal · 渲染 / 关闭', () => {
  it('CM1: 默认不显示（store.confirm = null）', () => {
    renderModal();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('CM2: 调用 confirmModal 后弹出，含标题 / body / 取消 + 确定按钮', async () => {
    renderModal();
    const { confirmModal } = useAppStore.getState();
    act(() => {
      // 不 await，让弹窗先显示
      confirmModal({ title: '撤回这一项？', body: '会回到待开始' });
    });
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('撤回这一项？')).toBeInTheDocument();
      expect(screen.getByText('会回到待开始')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument();
    });
  });
});

describe('ConfirmModal · Promise resolve', () => {
  it('CM3: 点"确定"→ Promise resolve(true) + 弹窗消失', async () => {
    renderModal();
    const { confirmModal } = useAppStore.getState();
    let resolved: boolean | undefined;
    act(() => {
      confirmModal({ title: 'X' }).then(r => { resolved = r; });
    });
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await waitFor(() => {
      expect(resolved).toBe(true);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('CM4: 点"取消"→ Promise resolve(false)', async () => {
    renderModal();
    const { confirmModal } = useAppStore.getState();
    let resolved: boolean | undefined;
    act(() => {
      confirmModal({ title: 'X' }).then(r => { resolved = r; });
    });
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => {
      expect(resolved).toBe(false);
    });
  });

  it('CM5: 按 ESC → resolve(false)，按 Enter → resolve(true)', async () => {
    renderModal();
    const { confirmModal } = useAppStore.getState();

    let r1: boolean | undefined;
    act(() => { confirmModal({ title: 'esc test' }).then(r => { r1 = r; }); });
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(r1).toBe(false));

    let r2: boolean | undefined;
    act(() => { confirmModal({ title: 'enter test' }).then(r => { r2 = r; }); });
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(r2).toBe(true));
  });

  it('CM6: 点 backdrop（空白处）→ resolve(false)', async () => {
    renderModal();
    const { confirmModal } = useAppStore.getState();
    let resolved: boolean | undefined;
    act(() => { confirmModal({ title: '点背景测试' }).then(r => { resolved = r; }); });
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: '点空白处关闭' }));
    await waitFor(() => expect(resolved).toBe(false));
  });
});

describe('ConfirmModal · 自定义文案 / tone', () => {
  it('CM7: 自定义 confirmLabel / cancelLabel 渲染', async () => {
    renderModal();
    const { confirmModal } = useAppStore.getState();
    act(() => {
      confirmModal({
        title: 'x',
        confirmLabel: '发出求助',
        cancelLabel: '再想想',
      });
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '发出求助' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '再想想' })).toBeInTheDocument();
    });
  });

  it('CM8: 自定义 emoji 渲染', async () => {
    renderModal();
    const { confirmModal } = useAppStore.getState();
    act(() => { confirmModal({ title: 'help', emoji: '🙋' }); });
    await waitFor(() => {
      expect(screen.getByText('🙋')).toBeInTheDocument();
    });
  });

  it('CM9: tone=help / warn / danger 都能正常弹（验证不崩溃）', async () => {
    renderModal();
    const { confirmModal, resolveConfirm } = useAppStore.getState();
    for (const tone of ['info', 'warn', 'danger', 'help'] as const) {
      act(() => { confirmModal({ title: `tone=${tone}`, tone }); });
      await waitFor(() => screen.getByText(`tone=${tone}`));
      act(() => resolveConfirm(false));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });
});

describe('ConfirmModal · 串行调用', () => {
  it('CM10: 第二次 confirmModal 覆盖第一次，第一次 promise 不挂起永远（不验证 dangling promise，仅验证 UI）', async () => {
    renderModal();
    const { confirmModal, resolveConfirm } = useAppStore.getState();
    act(() => { confirmModal({ title: '第一个' }); });
    await waitFor(() => screen.getByText('第一个'));

    // 直接覆盖
    act(() => { confirmModal({ title: '第二个' }); });
    await waitFor(() => {
      expect(screen.getByText('第二个')).toBeInTheDocument();
      expect(screen.queryByText('第一个')).toBeNull();
    });

    // 关掉
    act(() => resolveConfirm(true));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
