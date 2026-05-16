// ============================================================
// EditDescriptionDialog — 轻量描述编辑器 (R5.8.0)
//
// 只改 metadata 字段(title/artist/year/medium/caption),不动 Blob。
// 不复用 UploadEditor 因为没有 crop/rotation 操作,UI 更轻。
// ============================================================

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { GalleryImage } from '../../types';

interface Props {
  image: GalleryImage | null;
  onCancel: () => void;
  onSave: (patch: {
    title?: string;
    artist?: string;
    year?: number;
    medium?: string;
    caption?: string;
  }) => void | Promise<void>;
}

export function EditDescriptionDialog({ image, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(image?.title ?? '');
  const [artist, setArtist] = useState(image?.artist ?? '');
  const [year, setYear] = useState(image?.year?.toString() ?? '');
  const [medium, setMedium] = useState(image?.medium ?? '');
  const [caption, setCaption] = useState(image?.caption ?? '');

  useEffect(() => {
    if (image) {
      setTitle(image.title ?? '');
      setArtist(image.artist ?? '');
      setYear(image.year?.toString() ?? '');
      setMedium(image.medium ?? '');
      setCaption(image.caption ?? '');
    }
  }, [image]);

  useEffect(() => {
    if (!image) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [image, onCancel]);

  if (!image) return null;

  function handleSave() {
    const yearNum = parseInt(year, 10);
    onSave({
      title: title.trim() || undefined,
      artist: artist.trim() || undefined,
      year: Number.isFinite(yearNum) && yearNum > 0 ? yearNum : undefined,
      medium: medium.trim() || undefined,
      caption: caption.trim().slice(0, 80) || undefined,
    });
  }

  return (
    <div
      className="gallery-upload-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="gallery-upload-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}
      >
        <div className="gallery-upload-header">
          <span className="gallery-upload-title">换个描述</span>
          <button
            type="button"
            aria-label="取消"
            className="gallery-upload-close"
            onClick={onCancel}
          >
            <X size={18} />
          </button>
        </div>

        <p className="gallery-upload-hint" style={{ textAlign: 'left' }}>
          全部可不填,留空就是空白。
        </p>

        <div className="gallery-upload-form">
          <label className="gallery-upload-field">
            <span className="gallery-upload-field-label">作品名</span>
            <input
              className="gallery-upload-field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="（可不填）"
              maxLength={40}
            />
          </label>
          <label className="gallery-upload-field">
            <span className="gallery-upload-field-label">作者</span>
            <input
              className="gallery-upload-field-input"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="（可不填）"
              maxLength={20}
            />
          </label>
          <label className="gallery-upload-field">
            <span className="gallery-upload-field-label">年份</span>
            <input
              type="number"
              className="gallery-upload-field-input"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={`${new Date().getFullYear()}`}
            />
          </label>
          <label className="gallery-upload-field">
            <span className="gallery-upload-field-label">媒介</span>
            <input
              className="gallery-upload-field-input"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="蜡笔画 / 照片 / iPad 涂鸦 …"
              maxLength={20}
            />
          </label>
          <label className="gallery-upload-field">
            <span className="gallery-upload-field-label">说明</span>
            <textarea
              className="gallery-upload-field-input"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="（≤ 80 字）"
              maxLength={80}
              rows={2}
            />
          </label>
        </div>

        <div className="gallery-upload-actions">
          <button
            type="button"
            className="gallery-upload-btn-secondary"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            type="button"
            className="gallery-upload-btn-primary"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
