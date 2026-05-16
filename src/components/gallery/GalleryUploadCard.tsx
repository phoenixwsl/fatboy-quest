// ============================================================
// 上传"+"卡片 — 末尾挂新画
//
// 行为：
//   - 点击 → 触发 <input type="file" accept="image/*"> 唤起相册/相机
//   - 选好图后 → 调 compressForGallery → 写 IndexedDB
//   - 容量到 100 张时 disabled
//   - 错误 toast 走外部（onError prop）
// ============================================================

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { compressForGallery, ImageTooLargeError } from '../../lib/imageCompress';
import { db } from '../../db';
import type { GalleryImage } from '../../types';
import { GALLERY_MAX_IMAGES } from '../../types';

interface Props {
  /** 当前画廊已挂的张数 */
  currentCount: number;
  /** 上传者 */
  uploadedBy: 'parent' | 'child';
  /** 上传者名字（用作 artist 字段默认值） */
  defaultArtist?: string;
  /** 出错时回报上层 toast */
  onError?: (msg: string) => void;
  /** 上传成功后回调（可选） */
  onUploaded?: (id: string) => void;
}

function newId() {
  return 'gal_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function GalleryUploadCard({
  currentCount, uploadedBy, defaultArtist, onError, onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const isFull = currentCount >= GALLERY_MAX_IMAGES;
  const remaining = GALLERY_MAX_IMAGES - currentCount;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      // 一次可能选多张，但要尊重 100 张上限
      const slots = GALLERY_MAX_IMAGES - currentCount;
      const toProcess = Array.from(files).slice(0, slots);
      for (const file of toProcess) {
        try {
          const { fullBlob, thumbBlob, width, height, ratio } =
            await compressForGallery(file);
          const img: GalleryImage = {
            id: newId(),
            fullBlob, thumbBlob, width, height, ratio,
            uploadedBy,
            uploadedAt: Date.now(),
            artist: uploadedBy === 'child' ? defaultArtist : undefined,
            year: new Date().getFullYear(),
          };
          await db.galleryImages.add(img);
          onUploaded?.(img.id);
        } catch (e) {
          if (e instanceof ImageTooLargeError) {
            onError?.(e.message);
          } else {
            onError?.('图片处理失败，换一张试试');
          }
        }
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div
      className="gallery-upload-card"
      onClick={() => !isFull && !busy && inputRef.current?.click()}
      role="button"
      tabIndex={isFull || busy ? -1 : 0}
      aria-disabled={isFull || busy}
      aria-label={isFull ? '画廊已满' : '挂一幅新画'}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Plus size={28} strokeWidth={1.5} />
      {busy ? (
        <span>正在挂画…</span>
      ) : isFull ? (
        <span>画廊已满，请家长取下几张老作品再来</span>
      ) : remaining <= 10 ? (
        <span>挂一幅新画（还能挂 {remaining} 张）</span>
      ) : (
        <span>挂一幅新画</span>
      )}
    </div>
  );
}
