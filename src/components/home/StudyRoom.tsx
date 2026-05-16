// ============================================================
// 肥仔的画廊 · R5.8.0
//
// R5.8.0 升级:
//   - 上传编辑器(4 画框形状 × 2 大小 + 旋转 + 平移 + 5 字段表单)
//   - Lightbox 动作菜单(取下/换画框/换描述/关闭)
//   - 管理模式 toggle(顶栏)—— 切到管理时卡片角标 × 按钮
//   - 双端可删(去掉 isParentSide 门禁,二次确认护栏依然在)
//   - 瀑布流 salon-hang 层次感(大/小画框 + 微旋转 + 留白)
//
// 设计参考:.claude/skills/gallery-design/SKILL.md
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { sounds } from '../../lib/sounds';
import { seedGalleryIfEmpty } from '../../lib/gallerySeed';
import { compressWithTransform } from '../../lib/imageCompress';
import { GalleryMasonry } from '../gallery/GalleryMasonry';
import { GalleryLightbox } from '../gallery/GalleryLightbox';
import { GalleryUploadCard } from '../gallery/GalleryUploadCard';
import { DeleteConfirmModal } from '../gallery/DeleteConfirmModal';
import { GalleryUploadEditor, type UploadResult } from '../gallery/GalleryUploadEditor';
import { EditDescriptionDialog } from '../gallery/EditDescriptionDialog';
import type { GalleryImage } from '../../types';
import '../../styles/gallery.css';

function newId() {
  return 'gal_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function StudyRoom() {
  const nav = useNavigate();
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const images = useLiveQuery(() => db.galleryImages.toArray()) ?? [];

  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [reframingId, setReframingId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const childName = settings?.childName ?? '肥仔';

  // 首次进入:seed center_hero.jpg
  useEffect(() => { seedGalleryIfEmpty(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const sortedImages = [...images].sort((a, b) => b.uploadedAt - a.uploadedAt);
  const pendingImage = sortedImages.find((i) => i.id === pendingDelete) ?? null;
  const editingDescImage = sortedImages.find((i) => i.id === editingDescId) ?? null;
  const reframingImage = sortedImages.find((i) => i.id === reframingId) ?? null;

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await db.galleryImages.delete(pendingDelete);
    setPendingDelete(null);
    setLightboxId(null);
    sounds.play('tap');
  }

  async function handleSaveDescription(patch: Partial<GalleryImage>) {
    if (!editingDescId) return;
    await db.galleryImages.update(editingDescId, patch);
    setEditingDescId(null);
    sounds.play('tap');
  }

  // 上传新图 —— 走 UploadEditor
  async function handleUploadSubmit(result: UploadResult) {
    if (!uploadingFile) return;
    try {
      const { fullBlob, thumbBlob, originalBlob, width, height, ratio } =
        await compressWithTransform(uploadingFile, {
          rotation: result.rotation,
          frame: result.frame,
          crop: result.crop,
        });
      const newImg: GalleryImage = {
        id: newId(),
        fullBlob,
        thumbBlob,
        originalBlob,
        cropFrame: result.frame,
        rotation: result.rotation,
        displaySize: result.displaySize,
        width, height, ratio,
        uploadedBy: 'child',  // 路径无关,统一标 'child' —— R5.8.0 后已无需区分
        uploadedAt: Date.now(),
        ...result.metadata,
        artist: result.metadata.artist ?? childName,
      };
      await db.galleryImages.add(newImg);
      setUploadingFile(null);
      sounds.play('tap');
    } catch (e: any) {
      setToast(e?.message ?? '图片处理失败,换一张试试');
      throw e;  // 让 editor 回到 meta 步
    }
  }

  // 换画框 —— 走 UploadEditor 但用 originalBlob 当源
  async function handleReframeSubmit(result: UploadResult) {
    if (!reframingImage?.originalBlob) return;
    try {
      const { fullBlob, thumbBlob, originalBlob, width, height, ratio } =
        await compressWithTransform(reframingImage.originalBlob, {
          rotation: result.rotation,
          frame: result.frame,
          crop: result.crop,
        });
      await db.galleryImages.update(reframingImage.id, {
        fullBlob,
        thumbBlob,
        originalBlob,
        cropFrame: result.frame,
        rotation: result.rotation,
        displaySize: result.displaySize,
        width, height, ratio,
        title:   result.metadata.title   ?? reframingImage.title,
        artist:  result.metadata.artist  ?? reframingImage.artist,
        year:    result.metadata.year    ?? reframingImage.year,
        medium:  result.metadata.medium  ?? reframingImage.medium,
        caption: result.metadata.caption ?? reframingImage.caption,
      });
      setReframingId(null);
      setLightboxId(null);  // 退出 lightbox 显示新效果
      sounds.play('tap');
    } catch (e: any) {
      setToast(e?.message ?? '换画框失败,稍后再试');
      throw e;
    }
  }

  return (
    <div
      className="min-h-full p-4 pb-24"
      style={{ color: 'var(--ink)', background: 'var(--surface-paper)' }}
    >
      {/* 顶栏 */}
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
        <button
          type="button"
          className="gallery-manage-toggle"
          data-active={manageMode}
          onClick={() => { sounds.play('tap'); setManageMode((v) => !v); }}
          aria-label={manageMode ? '退出管理' : '进入管理模式'}
        >
          {manageMode ? '完成' : '管理'}
        </button>
      </div>

      {/* 空态 */}
      {images.length === 0 ? (
        <div className="gallery-empty">
          画廊还空着。
          <br />
          挂上你的第一幅画吧。
        </div>
      ) : null}

      {/* 瀑布流 + 末尾上传卡 */}
      <GalleryMasonry
        images={sortedImages}
        onOpen={(id) => setLightboxId(id)}
        manageMode={manageMode}
        onRequestDelete={(id) => setPendingDelete(id)}
        uploadCard={
          <GalleryUploadCard
            currentCount={images.length}
            onFilePicked={(file) => setUploadingFile(file)}
          />
        }
      />

      {/* Lightbox */}
      <GalleryLightbox
        images={sortedImages}
        currentId={lightboxId}
        onClose={() => setLightboxId(null)}
        onNavigate={(id) => setLightboxId(id)}
        onRequestDelete={(id) => setPendingDelete(id)}
        onRequestReframe={(id) => setReframingId(id)}
        onRequestEditDescription={(id) => setEditingDescId(id)}
      />

      {/* 删除确认 */}
      <DeleteConfirmModal
        image={pendingImage}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* 描述编辑 */}
      <EditDescriptionDialog
        image={editingDescImage}
        onCancel={() => setEditingDescId(null)}
        onSave={handleSaveDescription}
      />

      {/* 上传编辑器 —— 新挂画 */}
      {uploadingFile && (
        <GalleryUploadEditor
          source={uploadingFile}
          defaultArtist={childName}
          titleText="挂一幅新画"
          onCancel={() => setUploadingFile(null)}
          onSubmit={handleUploadSubmit}
        />
      )}

      {/* 上传编辑器 —— 换画框(走 originalBlob) */}
      {reframingImage?.originalBlob && (
        <GalleryUploadEditor
          source={reframingImage.originalBlob}
          defaultArtist={childName}
          titleText="换个画框 / 重新构图"
          initial={{
            frame: reframingImage.cropFrame,
            rotation: reframingImage.rotation,
            displaySize: reframingImage.displaySize,
            metadata: {
              title: reframingImage.title,
              artist: reframingImage.artist,
              year: reframingImage.year,
              medium: reframingImage.medium,
              caption: reframingImage.caption,
            },
          }}
          onCancel={() => setReframingId(null)}
          onSubmit={handleReframeSubmit}
        />
      )}

      {/* toast */}
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
            zIndex: 80,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
