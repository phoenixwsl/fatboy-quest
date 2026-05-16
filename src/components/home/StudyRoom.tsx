// ============================================================
// 肥仔的画廊 · R5.7.0
//
// 重大变更：肥仔之家 → 肥仔的画廊
//   - 原 StudyRoom 整页变成画廊页（保留文件名以减少路由改动）
//   - 删除：装饰场景（向日葵/桌前肥仔/台灯/桌子）、底栏（积分+装饰商店）
//     理由（gallery-design skill 第 9 节）：画廊是"非游戏化清净角落"，
//     不显示积分、不放游戏化入口。装饰商店入口走 HomePage 的"奖励商店"。
//   - 原 center_hero.jpg（科比海报）通过 gallerySeed.ts 转为第一张画廊图，
//     不丢、家长可在 ParentGate 取下。
//
// 设计参考：.claude/skills/gallery-design/SKILL.md
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { sounds } from '../../lib/sounds';
import { seedGalleryIfEmpty } from '../../lib/gallerySeed';
import { GalleryMasonry } from '../gallery/GalleryMasonry';
import { GalleryLightbox } from '../gallery/GalleryLightbox';
import { GalleryUploadCard } from '../gallery/GalleryUploadCard';
import { DeleteConfirmModal } from '../gallery/DeleteConfirmModal';
import '../../styles/gallery.css';

export function StudyRoom() {
  const nav = useNavigate();
  const location = useLocation();
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const images = useLiveQuery(() => db.galleryImages.toArray()) ?? [];

  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const childName = settings?.childName ?? '肥仔';

  // 仅家长路径能删（/parent/* 都算）
  const isParentSide = location.pathname.startsWith('/parent');

  // 首次进入：seed center_hero.jpg
  useEffect(() => {
    seedGalleryIfEmpty();
  }, []);

  // toast 自动消失
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // 排序：按上传时间倒序（masonry 自己也排，这里给 lightbox 用）
  const sortedImages = [...images].sort((a, b) => b.uploadedAt - a.uploadedAt);

  const pendingImage = sortedImages.find((i) => i.id === pendingDelete) ?? null;

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await db.galleryImages.delete(pendingDelete);
    setPendingDelete(null);
    setLightboxId(null); // 删了之后 lightbox 也关
    sounds.play('tap');
  }

  return (
    <div
      className="min-h-full p-4 pb-24"
      style={{ color: 'var(--ink)', background: 'var(--surface-paper)' }}
    >
      {/* 顶栏 —— 法则 8：温度（无 border-bottom） */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => { sounds.play('tap'); nav(-1); }}
          className="px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium active:scale-95 transition-transform"
          style={{
            background: 'var(--paper)',
            color: 'var(--ink)',
            boxShadow: 'var(--shadow-sm)',
          }}
          aria-label="返回"
        >
          ← 返回
        </button>
        <h1
          className="text-lg font-bold"
          style={{
            color: 'var(--ink-strong)',
            fontFamily: 'var(--gallery-caption-font, serif)',
            letterSpacing: '0.04em',
          }}
        >
          {childName}的画廊
        </h1>
        <span className="w-[68px]" aria-hidden />
      </div>

      {/* 瀑布流 + 末尾上传卡 */}
      {images.length === 0 ? (
        <div className="gallery-empty">
          画廊还空着。
          <br />
          挂上你的第一幅画吧。
        </div>
      ) : null}

      <GalleryMasonry
        images={sortedImages}
        onOpen={(id) => setLightboxId(id)}
        uploadCard={
          <GalleryUploadCard
            currentCount={images.length}
            uploadedBy={isParentSide ? 'parent' : 'child'}
            defaultArtist={childName}
            onError={(msg) => setToast(msg)}
          />
        }
      />

      {/* Lightbox */}
      <GalleryLightbox
        images={sortedImages}
        currentId={lightboxId}
        onClose={() => setLightboxId(null)}
        onNavigate={(id) => setLightboxId(id)}
        onRequestDelete={
          isParentSide
            ? (id) => setPendingDelete(id)
            : undefined
        }
      />

      {/* 删除确认 */}
      <DeleteConfirmModal
        image={pendingImage}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* 简易 toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 32,
            transform: 'translateX(-50%)',
            background: 'var(--ink-strong)',
            color: 'var(--surface-paper)',
            padding: '10px 16px',
            borderRadius: 999,
            fontSize: 13,
            fontFamily: 'var(--gallery-caption-font)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 70,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
