// ============================================================
// 画廊（原 StudyRoomPage，R5.7.0 改为画廊）集成测试
//
// 覆盖：
//   G1: 页面渲染基础元素（标题 = "肥仔的画廊"，返回按钮，瀑布流容器）
//   G2: 数据库有图时渲染为卡片
//   G3: 孩子端不显示"取下"按钮 (路径 /home)
//   G4: 家长端显示"取下"按钮 (路径 /parent/gallery)
//   G5: 点击 "取下" → 弹二次确认 modal ("再想想" + "取下")
//   G6: 确认 "取下" → 从 DB 删除
//   G7: 取消 ("再想想") → 不删除
//   G8: 返回按钮触发 navigate(-1)
//   G9: 100 张上限 — UploadCard 显示 disabled
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../../src/db';
import { StudyRoomPage } from '../../src/pages/StudyRoomPage';
import { GALLERY_MAX_IMAGES } from '../../src/types';
import type { GalleryImage } from '../../src/types';
import { resetDB, seedSetupComplete } from './helpers';

vi.mock('../../src/lib/sounds', () => ({
  sounds: { play: vi.fn(), setEnabled: vi.fn(), setPack: vi.fn() },
  syncFromSettings: vi.fn(),
}));

// gallerySeed 会尝试 fetch + canvas，jsdom 都不行 — 静默 mock
vi.mock('../../src/lib/gallerySeed', () => ({
  seedGalleryIfEmpty: vi.fn(() => Promise.resolve()),
}));

function makeImg(id: string, overrides: Partial<GalleryImage> = {}): GalleryImage {
  const fullBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
  const thumbBlob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
  return {
    id,
    fullBlob,
    thumbBlob,
    width: 1200,
    height: 800,
    ratio: 1.5,
    uploadedBy: 'child',
    uploadedAt: Date.now(),
    title: `图片 ${id}`,
    ...overrides,
  };
}

beforeEach(async () => {
  await resetDB();
  await seedSetupComplete({ childName: '肥仔' });
});

/** 渲染指定路径 — '/home' (孩子端) 或 '/parent/gallery' (家长端) */
function renderAt(path: '/home' | '/parent/gallery') {
  return render(
    <MemoryRouter initialEntries={['/back', path]} initialIndex={1}>
      <Routes>
        <Route path="/home" element={<StudyRoomPage />} />
        <Route path="/parent/gallery" element={<StudyRoomPage />} />
        <Route path="/back" element={<div data-testid="prev-page">PREV</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('G · 画廊页基础渲染', () => {
  it('G1: 标题 = "肥仔的画廊"，返回按钮，瀑布流容器存在', async () => {
    renderAt('/home');
    await waitFor(() => {
      expect(screen.getByText('肥仔的画廊')).toBeTruthy();
    });
    expect(screen.getByText('← 返回')).toBeTruthy();
    expect(document.querySelector('.gallery-masonry')).toBeTruthy();
  });

  it('G1.1: 画廊空时显示空态文案', async () => {
    renderAt('/home');
    await waitFor(() => {
      expect(screen.getByText(/画廊还空着/)).toBeTruthy();
    });
  });

  it('G2: DB 有图时渲染为卡片', async () => {
    await db.galleryImages.bulkAdd([
      makeImg('a', { title: '向日葵' }),
      makeImg('b', { title: '中秋全家福' }),
    ]);
    renderAt('/home');

    await waitFor(() => {
      expect(screen.getByText('向日葵')).toBeTruthy();
      expect(screen.getByText('中秋全家福')).toBeTruthy();
    });
  });
});

describe('G · Lightbox 动作菜单（R5.8.0 双端可删）', () => {
  it('G3: 孩子端打开 lightbox,显示"取下/换画框/换描述"', async () => {
    await db.galleryImages.add(makeImg('a', { title: '向日葵' }));
    renderAt('/home');

    await waitFor(() => expect(screen.getByText('向日葵')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('向日葵'));

    await waitFor(() => {
      expect(document.querySelector('.gallery-lightbox-backdrop')).toBeTruthy();
    });

    // R5.8.0 后双端都能看到三个动作
    expect(screen.getByText('取下')).toBeTruthy();
    expect(screen.getByText('换描述')).toBeTruthy();
    // 换画框对老图(无 originalBlob)是 disabled,但按钮存在
    expect(screen.getByText('换画框')).toBeTruthy();
  });

  it('G4: 家长端 lightbox 同样显示三个动作(行为统一)', async () => {
    await db.galleryImages.add(makeImg('a', { title: '向日葵' }));
    renderAt('/parent/gallery');

    await waitFor(() => expect(screen.getByText('向日葵')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('向日葵'));

    await waitFor(() => {
      expect(screen.getByText('取下')).toBeTruthy();
      expect(screen.getByText('换描述')).toBeTruthy();
      expect(screen.getByText('换画框')).toBeTruthy();
    });
  });
});

describe('G · 删除流程', () => {
  it('G5: 点"取下" → 弹二次确认 modal', async () => {
    await db.galleryImages.add(makeImg('a', { title: '向日葵' }));
    renderAt('/parent/gallery');

    await waitFor(() => expect(screen.getByText('向日葵')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('向日葵'));

    await waitFor(() => screen.getByText('取下'));
    fireEvent.click(screen.getByText('取下'));

    await waitFor(() => {
      // modal 上既有"再想想"也有"取下"按钮
      expect(screen.getByText('再想想')).toBeTruthy();
      // confirmation 文案
      expect(screen.getByText(/不可恢复/)).toBeTruthy();
    });
  });

  it('G6: 确认"取下" → DB 真删', async () => {
    await db.galleryImages.add(makeImg('a', { title: '向日葵' }));
    renderAt('/parent/gallery');

    await waitFor(() => expect(screen.getByText('向日葵')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('向日葵'));
    await waitFor(() => screen.getByText('取下'));

    // 第一次点是 lightbox 的"取下"按钮
    fireEvent.click(screen.getByText('取下'));

    // 等 modal 弹出 — 现在屏幕上有 2 个"取下"（lightbox + modal 内）
    await waitFor(() => screen.getByText('再想想'));
    // 在 modal 里再点"取下"（取所有"取下"中的最后一个）
    const takeDownButtons = screen.getAllByText('取下');
    fireEvent.click(takeDownButtons[takeDownButtons.length - 1]);

    await waitFor(async () => {
      const remaining = await db.galleryImages.toArray();
      expect(remaining).toHaveLength(0);
    });
  });

  it('G7: 取消"再想想" → 不删', async () => {
    await db.galleryImages.add(makeImg('a', { title: '向日葵' }));
    renderAt('/parent/gallery');

    await waitFor(() => expect(screen.getByText('向日葵')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('向日葵'));
    await waitFor(() => screen.getByText('取下'));
    fireEvent.click(screen.getByText('取下'));
    await waitFor(() => screen.getByText('再想想'));

    fireEvent.click(screen.getByText('再想想'));

    await waitFor(() => {
      expect(screen.queryByText('再想想')).toBeNull();
    });
    const remaining = await db.galleryImages.toArray();
    expect(remaining).toHaveLength(1);
  });
});

describe('G · 导航', () => {
  it('G8: 点返回按钮 → 返回上一页', async () => {
    renderAt('/home');
    await screen.findByText('← 返回');
    fireEvent.click(screen.getByText('← 返回'));
    await waitFor(() => {
      expect(screen.getByTestId('prev-page')).toBeTruthy();
    });
  });
});

describe('G · 容量上限', () => {
  it('G9: 100 张时上传卡 disabled', async () => {
    // 塞 100 张
    const imgs = Array.from({ length: GALLERY_MAX_IMAGES }, (_, i) =>
      makeImg(`g${i}`),
    );
    await db.galleryImages.bulkAdd(imgs);

    renderAt('/home');

    await waitFor(() => {
      expect(screen.getByText(/画廊已满/)).toBeTruthy();
    });

    // upload card 的 role=button 应该 aria-disabled="true"
    const uploadCard = document.querySelector('.gallery-upload-card');
    expect(uploadCard?.getAttribute('aria-disabled')).toBe('true');
  });

  it('G9.1: 90-99 张时显示剩余张数', async () => {
    const imgs = Array.from({ length: 92 }, (_, i) => makeImg(`g${i}`));
    await db.galleryImages.bulkAdd(imgs);

    renderAt('/home');

    await waitFor(() => {
      expect(screen.getByText(/还能挂 8 张/)).toBeTruthy();
    });
  });
});
