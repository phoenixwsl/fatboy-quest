// ============================================================
// Lightbox — gallery-design skill 第 8 节
// R5.8.0 升级：单一"取下"按钮 → 4 按钮动作菜单
//   - 取下      → 二次确认 modal
//   - 换画框    → UploadEditor 重压缩(需要 originalBlob,老图禁用)
//   - 换描述    → EditDescriptionDialog
//   - 关闭      → 退出
// 调用方按 callbacks 传 onRequestX,某个 callback 为 undefined 则按钮不出现。
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { X, Trash2, Frame as FrameIcon, Pencil } from 'lucide-react';
import type { GalleryImage } from '../../types';

interface Props {
  images: GalleryImage[];        // 已排序好的列表（同 masonry 顺序）
  currentId: string | null;
  onClose: () => void;
  onNavigate: (newId: string) => void;
  onRequestDelete?: (id: string) => void;
  onRequestReframe?: (id: string) => void;
  onRequestEditDescription?: (id: string) => void;
}

export function GalleryLightbox({
  images, currentId, onClose, onNavigate,
  onRequestDelete, onRequestReframe, onRequestEditDescription,
}: Props) {
  const current = images.find((i) => i.id === currentId);
  const currentIndex = current ? images.indexOf(current) : -1;

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!current) { setUrl(null); return; }
    const u = URL.createObjectURL(current.fullBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [current]);

  const navPrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(images[currentIndex - 1].id);
  }, [currentIndex, images, onNavigate]);

  const navNext = useCallback(() => {
    if (currentIndex >= 0 && currentIndex < images.length - 1) {
      onNavigate(images[currentIndex + 1].id);
    }
  }, [currentIndex, images, onNavigate]);

  useEffect(() => {
    if (!current) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') navPrev();
      else if (e.key === 'ArrowRight') navNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, onClose, navPrev, navNext]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart == null) return;
    const dx = e.changedTouches[0].clientX - touchStart;
    setTouchStart(null);
    if (Math.abs(dx) < 40) return;
    if (dx > 0) navPrev(); else navNext();
  }

  if (!current) return null;

  const artistYearLine =
    current.artist && current.year != null
      ? `${current.artist} · ${current.year}`
      : current.artist
      ? current.artist
      : current.year != null
      ? String(current.year)
      : null;

  const hasLabel =
    !!(current.title || artistYearLine || current.medium || current.caption);

  const canReframe = !!current.originalBlob;

  return (
    <div
      className="gallery-lightbox-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={current.title || '查看作品'}
    >
      <button
        type="button"
        className="gallery-lightbox-close"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="关闭"
      >
        <X size={20} />
      </button>

      <div
        className="gallery-lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="gallery-lightbox-frame">
          {url && (
            <img
              src={url}
              alt={current.title || ''}
              className="gallery-lightbox-img"
              draggable={false}
            />
          )}
        </div>

        {hasLabel && (
          <div className="gallery-wall-label">
            {current.title && (
              <h2 className="gallery-wall-label-title">《{current.title}》</h2>
            )}
            {artistYearLine && (
              <p className="gallery-wall-label-line">{artistYearLine}</p>
            )}
            {current.medium && (
              <p className="gallery-wall-label-medium">{current.medium}</p>
            )}
            {current.caption && (
              <p className="gallery-wall-label-caption">{current.caption}</p>
            )}
          </div>
        )}
      </div>

      {/* 动作菜单 —— 底部居中,4 按钮 */}
      {(onRequestDelete || onRequestReframe || onRequestEditDescription) && (
        <div
          className="gallery-lightbox-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {onRequestEditDescription && (
            <button
              type="button"
              className="gallery-lightbox-action"
              onClick={() => onRequestEditDescription(current.id)}
            >
              <Pencil size={15} /> 换描述
            </button>
          )}
          {onRequestReframe && (
            <button
              type="button"
              className="gallery-lightbox-action"
              onClick={() => canReframe && onRequestReframe(current.id)}
              disabled={!canReframe}
              title={canReframe ? '换个画框' : '老画无法换框（仅 R5.8 后上传的支持）'}
            >
              <FrameIcon size={15} /> 换画框
            </button>
          )}
          {onRequestDelete && (
            <button
              type="button"
              className="gallery-lightbox-action"
              data-tone="danger"
              onClick={() => onRequestDelete(current.id)}
            >
              <Trash2 size={15} /> 取下
            </button>
          )}
        </div>
      )}
    </div>
  );
}
