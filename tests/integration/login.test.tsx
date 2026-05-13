// ============================================================
// 登录 / 首次设置流程集成测试
// 覆盖：SetupWizard 4 步 + ParentGate PIN 校验 + 忘记 PIN 重置
// ============================================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db, hashAnswer, initializeDB } from '../../src/db';
import { SetupWizard } from '../../src/pages/SetupWizard';
import { ParentGate } from '../../src/pages/ParentGate';
import { resetDB, seedSetupComplete } from './helpers';

vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([{ ok: true }])),
  messages: { taskDone: vi.fn(), help: vi.fn(), redeem: vi.fn(), streakBreakAlert: vi.fn() },
}));
vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));
// 注意：这里**不** mock framer-motion。SetupWizard 用 motion.div + key={step}
// 来切换步骤，mock 会破坏 key reconciliation 导致 step 转换失效。
// jsdom 里 framer-motion 直接用没问题（动画退化为瞬时）。

describe('L · SetupWizard 首次设置流程', () => {
  beforeEach(async () => {
    await resetDB();
    await initializeDB(); // 创建默认 settings 单例（setupComplete=false）
  });

  it('L1: setupComplete=false 时，settings 的 setupComplete 字段必须为 false 触发引导', async () => {
    const s = await db.settings.get('singleton');
    expect(s?.setupComplete).toBe(false);
  });

  it('L2: SetupWizard 完整提交 → settings 更新 + pet 创建 + setupComplete=true', async () => {
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // step 0: 昵称
    fireEvent.change(screen.getByPlaceholderText(/例如：肥仔/), { target: { value: '小肥' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));

    // step 1: 蛋仔
    fireEvent.change(await screen.findByPlaceholderText(/给蛋仔起个名字/), { target: { value: '小蛋' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));

    // step 2: PIN —— 注意 React 受控 input 顺序，先填密保再填 PIN 不会有差异
    const pinInput = await screen.findByPlaceholderText(/设置 4 位 PIN/);
    const pinConfirm = screen.getByPlaceholderText(/再输一次/);
    const qInput = screen.getByPlaceholderText(/密保问题/);
    const aInput = screen.getByPlaceholderText(/密保答案/);
    fireEvent.change(pinInput, { target: { value: '5678' } });
    fireEvent.change(pinConfirm, { target: { value: '5678' } });
    fireEvent.change(qInput, { target: { value: '我妈妈的小名是？' } });
    fireEvent.change(aInput, { target: { value: '小明' } });

    // 不能用 getByRole('button', { name: /下一步/ }) — 有 "上一步" 也会匹配
    // 用 exact name
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));

    // step 3: 找 "开始闯关"
    fireEvent.click(await screen.findByRole('button', { name: /开始闯关/ }));

    await waitFor(async () => {
      const s = await db.settings.get('singleton');
      expect(s?.setupComplete).toBe(true);
      expect(s?.childName).toBe('小肥');
      expect(s?.pin).toBe('5678');
      expect(s?.securityAnswer).toBe(hashAnswer('小明'));
    });

    const pet = await db.pet.get('singleton');
    expect(pet?.name).toBe('小蛋');
  });

  it('L5: setup 完成后路由跳转到首页（HomePage 占位）', async () => {
    render(
      <MemoryRouter initialEntries={['/setup']}>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/" element={<div data-testid="home">HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/例如：肥仔/), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
    fireEvent.change(await screen.findByPlaceholderText(/给蛋仔起个名字/), { target: { value: 'P' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
    fireEvent.change(await screen.findByPlaceholderText(/设置 4 位 PIN/), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText(/再输一次/), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText(/密保答案/), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
    fireEvent.click(await screen.findByRole('button', { name: /开始闯关/ }));

    await waitFor(() => {
      expect(screen.getByTestId('home')).toBeInTheDocument();
    });
  });
});

describe('L · ParentGate PIN 门禁', () => {
  beforeEach(async () => {
    await resetDB();
    await seedSetupComplete({
      pin: '1234',
      securityQuestion: '密保问题',
      securityAnswer: hashAnswer('答案'),
    });
  });

  function renderGate() {
    return render(
      <MemoryRouter initialEntries={['/parent']}>
        <Routes>
          <Route path="/parent" element={<ParentGate />} />
          <Route path="/parent/dashboard" element={<div data-testid="dashboard">DASH</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('L6: 正确 PIN → 跳 dashboard；错误 PIN → 显示错误 + 清空输入', async () => {
    renderGate();

    const pinInput = await screen.findByPlaceholderText(/输入 4 位 PIN/);
    fireEvent.change(pinInput, { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: /确定/ }));

    await waitFor(() => {
      expect(screen.getByText(/PIN 错误/)).toBeInTheDocument();
    });
    expect((pinInput as HTMLInputElement).value).toBe('');

    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /确定/ }));

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('L8: 忘记 PIN → 答对密保 + 输入新 PIN → settings.pin 更新', async () => {
    renderGate();
    fireEvent.click(await screen.findByRole('button', { name: /忘记 PIN/ }));

    // ParentGate 切到忘记 PIN 表单，包含密保答案 + 新 PIN
    // 由于内部 input 没明确的 placeholder，找输入框时按顺序拿
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);

    // 找到 password 类型的 input（新 PIN）
    const allInputs = document.querySelectorAll('input');
    // 密保答案是 type=text，新 PIN 是 type=password 或 inputMode=numeric
    let answerEl: HTMLInputElement | undefined;
    let newPinEl: HTMLInputElement | undefined;
    allInputs.forEach((el) => {
      if (el.type === 'password' || el.inputMode === 'numeric') newPinEl = el as HTMLInputElement;
      else if (el.type === 'text') answerEl = el as HTMLInputElement;
    });
    expect(answerEl).toBeDefined();
    expect(newPinEl).toBeDefined();

    // Mock window.alert (ParentGate 用了 alert)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    fireEvent.change(answerEl!, { target: { value: '答案' } });
    fireEvent.change(newPinEl!, { target: { value: '9999' } });
    const resetBtns = screen.getAllByRole('button');
    const resetBtn = resetBtns.find(b => /重置|确定/.test(b.textContent ?? '') && b.textContent !== '确定');
    // 应有一个"重置 PIN"按钮
    const finalBtn = resetBtns.find(b => b.textContent?.includes('重置')) ?? resetBtn;
    if (finalBtn) fireEvent.click(finalBtn);

    await waitFor(async () => {
      const s = await db.settings.get('singleton');
      expect(s?.pin).toBe('9999');
    });

    alertSpy.mockRestore();
  });

  it('L10: PIN 重置后旧 PIN 失效，新 PIN 生效', async () => {
    // 直接改 DB 模拟重置完成
    await db.settings.update('singleton', { pin: '9999' });

    renderGate();
    const pinInput = await screen.findByPlaceholderText(/输入 4 位 PIN/);

    // 旧 PIN 应该失败
    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /确定/ }));
    await waitFor(() => {
      expect(screen.getByText(/PIN 错误/)).toBeInTheDocument();
    });

    // 新 PIN 通过
    fireEvent.change(pinInput, { target: { value: '9999' } });
    fireEvent.click(screen.getByRole('button', { name: /确定/ }));
    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });
});
