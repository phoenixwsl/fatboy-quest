// R4.4.0 集成测：家长记录见证 → 孩子端 StickerWall 显示
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { db } from '../../src/db';
import { StickerWall } from '../../src/pages/StickerWall';
import { createWitnessMoment } from '../../src/lib/witnessMoment';
import {
  resetDB, seedSetupComplete, mockFramerMotion, mockSounds, renderAt,
} from './helpers';
import type { BarkRecipient } from '../../src/types';

vi.mock('framer-motion', async () => mockFramerMotion());
vi.mock('../../src/lib/sounds', () => mockSounds());
vi.mock('../../src/lib/bark', () => ({
  pushToRecipients: vi.fn(() => Promise.resolve([{ ok: true }])),
  messages: { taskDone: vi.fn(() => ({ title: '', body: '' })) },
}));

const mom: BarkRecipient = {
  id: 'preset-mom', label: '妈妈', emoji: '👩',
  serverUrl: 'https://api.day.app', key: 'mom-key',
  subTaskDone: true, subRoundDone: true, subMilestone: true,
  subPendingReview: true, subWeeklyReport: true, enabled: true,
};
const dad: BarkRecipient = {
  id: 'preset-dad', label: '爸爸', emoji: '👨',
  serverUrl: 'https://api.day.app', key: 'dad-key',
  subTaskDone: true, subRoundDone: true, subMilestone: true,
  subPendingReview: true, subWeeklyReport: true, enabled: true,
};

beforeEach(async () => {
  await resetDB();
  await seedSetupComplete();
});

describe('StickerWall · 渲染', () => {
  it('SW1: 空贴纸时显示空状态', async () => {
    renderAt('/stickers', <StickerWall />);
    await waitFor(() => {
      expect(screen.getByText(/还没有写温柔时刻/)).toBeInTheDocument();
    });
  });

  it('SW2: 有贴纸时显示文字 + emoji + 见证人 chip', async () => {
    await db.recipients.bulkPut([mom, dad]);
    await createWitnessMoment(db, { text: '让妹妹先选玩具', emoji: '🌟', from: mom });
    renderAt('/stickers', <StickerWall />);
    await waitFor(() => {
      expect(screen.getByText(/让妹妹先选玩具/)).toBeInTheDocument();
      expect(screen.getByText(/妈妈见证/)).toBeInTheDocument();
    });
  });

  it('SW3: 多月按月分组', async () => {
    await db.recipients.bulkPut([mom]);
    // 直接写 db 用自定义 ts
    await db.witnessMoments.bulkAdd([
      { id: 'a', ts: new Date('2026-05-15').getTime(), text: '五月时刻', emoji: '🌟', fromRecipientId: 'preset-mom', fromLabel: '妈妈' },
      { id: 'b', ts: new Date('2026-04-10').getTime(), text: '四月时刻', emoji: '✨', fromRecipientId: 'preset-mom', fromLabel: '妈妈' },
    ]);
    renderAt('/stickers', <StickerWall />);
    await waitFor(() => {
      expect(screen.getByText(/2026 年 5 月/)).toBeInTheDocument();
      expect(screen.getByText(/2026 年 4 月/)).toBeInTheDocument();
      expect(screen.getByText(/五月时刻/)).toBeInTheDocument();
      expect(screen.getByText(/四月时刻/)).toBeInTheDocument();
    });
  });

  it('SW4: ✓ 端到端 — createWitnessMoment 写入 → useLiveQuery 反应到 UI', async () => {
    await db.recipients.bulkPut([mom]);
    renderAt('/stickers', <StickerWall />);
    // 初始空
    await waitFor(() => {
      expect(screen.getByText(/还没有写温柔时刻/)).toBeInTheDocument();
    });
    // 后端写一条
    await createWitnessMoment(db, { text: '专心做了 30 分钟', emoji: '💪', from: mom });
    await waitFor(() => {
      expect(screen.getByText(/专心做了 30 分钟/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
