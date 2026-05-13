// ============================================================
// 集成测试共享工具
// ============================================================
import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '../../src/db';
import { todayString } from '../../src/lib/time';

// ---------- 全局 Mock 区域 ----------
// 调用者在文件顶部 vi.mock(...) 即可应用以下默认实现

export const mockBark = () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([{ ok: true }])),
  messages: {
    taskDone: vi.fn((p: any) => ({ title: `done:${p.taskTitle}`, body: '' })),
    help: vi.fn((c: string, t: string) => ({ title: `help:${c}-${t}`, body: '' })),
    redeem: vi.fn((p: any) => ({ title: `redeem:${p.itemName}`, body: '' })),
    streakBreakAlert: vi.fn(() => ({ title: 'streak', body: '' })),
  },
});

export const mockSounds = () => ({
  sounds: {
    play: vi.fn(),
    setEnabled: vi.fn(),
    setPack: vi.fn(),
  },
  syncFromSettings: vi.fn(),
});

// framer-motion 在 jsdom 里动画会拖时序，简化掉
export const mockFramerMotion = async () => {
  const React = await import('react');
  const passthrough = (tag: string) =>
    React.forwardRef<any, any>(({
      children, layoutId: _l, layout: _lay,
      initial: _i, animate: _a, exit: _e, transition: _t,
      whileTap: _wt, whileHover: _wh, variants: _v,
      ...rest
    }, ref) => React.createElement(tag, { ref, ...rest }, children));
  const motion: any = new Proxy({}, { get: (_, k: string) => passthrough(k) });
  return {
    motion,
    AnimatePresence: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
    useMotionValue: (v: any) => ({ get: () => v, set: vi.fn() }),
    useTransform: () => ({ get: () => 0 }),
  };
};

// ---------- DB 工具 ----------
export async function resetDB() {
  await db.delete();
  await db.open();
}

/** 设置一个"已完成 setup"的环境，方便测非 setup 流程的页面 */
export async function seedSetupComplete(overrides: Partial<any> = {}) {
  await db.settings.put({
    id: 'singleton',
    schemaVersion: 5,
    setupComplete: true,
    childName: '肥仔',
    pin: '1234',
    securityQuestion: 'q?',
    securityAnswer: 'hashed',
    themeId: 'space',
    notificationsEnabled: false,
    soundEnabled: true,
    soundPack: 'default',
    childCanAddTasks: true,
    childMaxPointsPerTask: 20,
    helpButtonEnabled: true,
    warnMinutesBeforeEnd: 3,
    restEndSoundLeadSec: 60,
    idleNagEnabled: false,
    weekendModeEnabled: false,
    adhdFriendlyMode: true,
    unevaluatedNotifyMinutes: 45,
    eveningSummaryHour: 21,
    eveningSummaryMinute: 30,
    streakAlertHour: 19,
    streakAlertMinute: 30,
    sundayRitualHour: 21,
    sundayRitualMinute: 0,
    developerMode: false,
    dailyPointsGoal: 0,
    ...overrides,
  } as any);
  await db.pet.put({
    id: 'singleton', name: '肥仔', skinId: 'default',
    unlockedSkins: ['default'], level: 1, exp: 0,
    evolutionStage: 1, equippedAccessories: [],
  } as any);
  await db.streak.put({
    id: 'singleton', currentStreak: 0, longestStreak: 0,
    lastFullDate: null, guardCards: 0, lastWeeklyGiftWeek: null,
  } as any);
}

// ---------- Fixtures ----------
export const today = todayString();

export const makeTask = (over: any = {}) => ({
  id: 'task_' + Math.random().toString(36).slice(2, 8),
  title: 'raz 阅读',
  date: today,
  basePoints: 20,
  estimatedMinutes: 10,
  subject: 'reading',
  status: 'pending',
  createdAt: Date.now(),
  ...over,
});

export const makeSchedule = (over: any = {}) => ({
  id: 'sch_' + Math.random().toString(36).slice(2, 8),
  date: today,
  round: 1,
  items: [],
  lockedAt: Date.now(),
  ...over,
});

export const makeShopItem = (over: any = {}) => ({
  id: 'shop_' + Math.random().toString(36).slice(2, 8),
  name: '看动画 10 分钟',
  emoji: '📺',
  costPoints: 30,
  stockPerWeek: 3,
  redeemedThisWeek: 0,
  weekKey: null,
  enabled: true,
  ...over,
});

// ---------- 渲染辅助 ----------
export function renderAt(path: string, ui: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
    </MemoryRouter>,
  );
}
