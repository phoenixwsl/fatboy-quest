// ============================================================
// 删除二次确认 — gallery-design skill 第 7.2 节
//
// 措辞约束：
//   - 用 "取下" 不用 "删除"（拟物化）
//   - 主按钮（默认 focus）是 "再想想"，提高误删摩擦
//   - "取下" 按钮文字红色但底色保持中性，克制不威慑
// ============================================================

import { useEffect, useState } from 'react';
import type { GalleryImage } from '../../types';

interface Props {
  image: GalleryImage | null;     // null 时不渲染
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmModal({ image, onCancel, onConfirm }: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) { setThumbUrl(null); return; }
    const u = URL.createObjectURL(image.thumbBlob);
    setThumbUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  // ESC 取消（防误删）
  useEffect(() => {
    if (!image) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [image, onCancel]);

  if (!image) return null;

  const titlePart = image.title ? `《${image.title}》` : '这幅作品';
  const artistPart = image.artist ?? '肥仔';

  return (
    <div
      className="gallery-delete-modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="gallery-delete-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {thumbUrl && (
          <img
            src={thumbUrl}
            alt=""
            className="gallery-delete-thumb"
          />
        )}
        <p className="gallery-delete-text">
          确定要把{artistPart}的{titlePart}
          <br />
          从画廊里取下吗?
        </p>
        <p className="gallery-delete-sub">取下后不可恢复</p>
        <div className="gallery-delete-actions">
          <button
            type="button"
            className="btn-keep"
            onClick={onCancel}
            autoFocus
          >
            再想想
          </button>
          <button
            type="button"
            className="btn-take-down"
            onClick={onConfirm}
          >
            取下
          </button>
        </div>
      </div>
    </div>
  );
}
