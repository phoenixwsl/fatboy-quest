// ============================================================
// galleryImages DB CRUD + v10 migration 测试
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import type { GalleryImage } from '../src/types';
import { GALLERY_MAX_IMAGES } from '../src/types';

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
    ...overrides,
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('galleryImages CRUD', () => {
  it('插入 → 查询', async () => {
    const img = makeImg('g1');
    await db.galleryImages.add(img);
    const got = await db.galleryImages.get('g1');
    expect(got).toBeDefined();
    expect(got!.id).toBe('g1');
    expect(got!.uploadedBy).toBe('child');
  });

  it('删除', async () => {
    await db.galleryImages.add(makeImg('g1'));
    await db.galleryImages.add(makeImg('g2'));
    await db.galleryImages.delete('g1');
    const remaining = await db.galleryImages.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('g2');
  });

  it('按 uploadedAt 倒序排', async () => {
    await db.galleryImages.add(makeImg('a', { uploadedAt: 1000 }));
    await db.galleryImages.add(makeImg('b', { uploadedAt: 3000 }));
    await db.galleryImages.add(makeImg('c', { uploadedAt: 2000 }));
    const all = await db.galleryImages.toArray();
    const sorted = [...all].sort((x, y) => y.uploadedAt - x.uploadedAt);
    expect(sorted.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('按 uploadedBy 过滤', async () => {
    await db.galleryImages.add(makeImg('child1', { uploadedBy: 'child' }));
    await db.galleryImages.add(makeImg('parent1', { uploadedBy: 'parent' }));
    await db.galleryImages.add(makeImg('child2', { uploadedBy: 'child' }));
    const onlyChild = await db.galleryImages.where('uploadedBy').equals('child').toArray();
    expect(onlyChild).toHaveLength(2);
  });

  it('全部 optional 字段都能为 undefined', async () => {
    const minimal = makeImg('minimal');
    await db.galleryImages.add(minimal);
    const got = await db.galleryImages.get('minimal');
    expect(got!.title).toBeUndefined();
    expect(got!.artist).toBeUndefined();
    expect(got!.year).toBeUndefined();
    expect(got!.medium).toBeUndefined();
    expect(got!.caption).toBeUndefined();
  });

  it('支持完整 wall label 元数据', async () => {
    await db.galleryImages.add(makeImg('full', {
      title: '向日葵',
      artist: '肥仔',
      year: 2026,
      medium: '蜡笔画',
      caption: '某天放学画的',
    }));
    const got = await db.galleryImages.get('full');
    expect(got!.title).toBe('向日葵');
    expect(got!.artist).toBe('肥仔');
    expect(got!.year).toBe(2026);
    expect(got!.medium).toBe('蜡笔画');
    expect(got!.caption).toBe('某天放学画的');
  });
});

describe('GALLERY_MAX_IMAGES 常量', () => {
  it('= 100 (硬上限)', () => {
    expect(GALLERY_MAX_IMAGES).toBe(100);
  });
});

describe('schema v10', () => {
  it('galleryImages 表存在', async () => {
    // 如果 schema 没建表，db.galleryImages.toArray() 会抛
    const empty = await db.galleryImages.toArray();
    expect(empty).toEqual([]);
  });

  it('其他老表仍正常（v10 不破坏 v9）', async () => {
    // 关键 v9 表
    expect(await db.tasks.toArray()).toEqual([]);
    expect(await db.cards.toArray()).toEqual([]);
    expect(await db.skillCards.toArray()).toEqual([]);
  });
});
