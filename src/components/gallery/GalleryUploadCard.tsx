// ============================================================
// 上传"+"卡片 — R5.8.0
//
// 新职责:仅触发 file picker,把 File 抛给上层(StudyRoom)。
// 编辑器(crop/frame/metadata)由上层管理。
//
// 上限提示在卡片文案上显示。
// ============================================================

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { GALLERY_MAX_IMAGES } from '../../types';

interface Props {
  /** 当前画廊已挂的张数 */
  currentCount: number;
  /** 文件选好后回调,StudyRoom 接住进入 UploadEditor */
  onFilePicked: (file: File) => void;
}

export function GalleryUploadCard({ currentCount, onFilePicked }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isFull = currentCount >= GALLERY_MAX_IMAGES;
  const remaining = GALLERY_MAX_IMAGES - currentCount;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFilePicked(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      className="gallery-upload-card"
      onClick={() => !isFull && inputRef.current?.click()}
      role="button"
      tabIndex={isFull ? -1 : 0}
      aria-disabled={isFull}
      aria-label={isFull ? '画廊已满' : '挂一幅新画'}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <Plus size={28} strokeWidth={1.5} />
      {isFull ? (
        <span>画廊已满,请取下几张老作品再来</span>
      ) : remaining <= 10 ? (
        <span>挂一幅新画（还能挂 {remaining} 张）</span>
      ) : (
        <span>挂一幅新画</span>
      )}
    </div>
  );
}
