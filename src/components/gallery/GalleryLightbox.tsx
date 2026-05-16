// ============================================================
// Lightbox — gallery-design skill 第 8 节
//
// 关键约束：
//   - 米白底 + backdrop-blur，NOT 黑底
//   - 美术馆 wall label：title / artist · year / medium / caption
//   - 所有字段 optional，全空就只显示主图
//   - ESC / 单击空白关闭
//   - 左右滑动 / 箭头键翻页
//   - 家长端右上"取下"按钮（远离 close X，法则 9）
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import type { GalleryImage } from '../../types';

interface Props {
  images: GalleryImage[];        // 已排序好的列表（同 masonry 顺序）
  currentId: string | null;
  onClose: () => void;
  onNavigate: (newId: string) => void;
  /** 仅家长端传入，给出"取下"按钮 */
  onRequestDelete?: (id: string) => void;
}

export function GalleryLightbox({
  images, currentId, onClose, onNavigate, onRequestDelete,
}: Props) {
  const current = images.find((i) => i.id === currentId);
  const currentIndex = current ? images.indexOf(current) : -1;

  const [url, setUrl] = useState<string | null>(null);

  // 用 fullBlob 渲染（lightbox 是放大场景）
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

  // 键盘：ESC 关闭，左右翻页
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

  // 简易 swipe（仅触摸）
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

  // 美术馆标签：缺哪行不渲染哪行
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

      {onRequestDelete && (
        <button
          type="button"
          className="gallery-lightbox-delete"
          onClick={(e) => { e.stopPropagation(); onRequestDelete(current.id); }}
        >
          取下
        </button>
      )}

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
    </div>
  );
}
