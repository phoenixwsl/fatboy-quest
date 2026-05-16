// ============================================================
// 瀑布流 — gallery-design 法则 5.1-5.4
//
// R5.8.0 升级（用户反馈"现在太规整了"）：
//   - 每张卡片基于 image.id 算 stable hash → 旋转/宽度/对齐/阴影/间距微变
//   - 调性参考 Cosmos.so / Apple Memories（留白呼吸，不 Pinterest 填满）
//   - 管理模式（parent + manageMode=true）下,卡片右上角 × 删除按钮
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { GalleryImage } from '../../types';
import { layoutVariance } from '../../lib/galleryLayout';

interface Props {
  images: GalleryImage[];
  onOpen: (id: string, index: number) => void;
  /** 末尾插入上传卡（孩子端 + 家长端都能上传） */
  uploadCard?: React.ReactNode;
  /** 管理模式：true 时每张卡显示角标 × 删除按钮（仅家长） */
  manageMode?: boolean;
  /** 点 × 删除按钮时回调；仅当 manageMode=true 时使用 */
  onRequestDelete?: (id: string) => void;
}

/** 一个瀑布流卡片 —— 内部管理 thumbBlob 的 ObjectURL 生命周期 */
function GalleryCard({
  image,
  onClick,
  manageMode,
  onRequestDelete,
}: {
  image: GalleryImage;
  onClick: () => void;
  manageMode?: boolean;
  onRequestDelete?: (id: string) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(image.thumbBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [image.thumbBlob]);

  // 用 ratio 给 img 一个 aspect-ratio，让占位时不会高度抖动
  const aspect = image.ratio > 0 ? image.ratio : 1;

  // 基于 id + displaySize 的稳定微变量
  const v = useMemo(
    () => layoutVariance(image.id, image.displaySize ?? 'large'),
    [image.id, image.displaySize],
  );

  const cardStyle: React.CSSProperties = {
    width: `${Math.round(v.widthPct * 100)}%`,
    padding: `${v.framePadding}px`,
    marginBottom: `${v.marginBottom}px`,
    transform: v.rotation ? `rotate(${v.rotation}deg)` : undefined,
    boxShadow: `0 4px 12px oklch(0.3 0.02 50 / ${v.shadowAlpha})`,
  };

  return (
    <button
      type="button"
      className="gallery-card"
      onClick={onClick}
      aria-label={image.title || '查看作品'}
      data-align={v.align}
      style={cardStyle}
    >
      {url ? (
        <img
          src={url}
          alt={image.title || ''}
          className="gallery-card-img"
          style={{ aspectRatio: aspect }}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div
          className="gallery-card-img"
          style={{ aspectRatio: aspect }}
          aria-hidden
        />
      )}
      {image.title && (
        <div className="gallery-card-caption">{image.title}</div>
      )}
      {manageMode && onRequestDelete && (
        <span
          className="gallery-card-delete-corner"
          role="button"
          tabIndex={0}
          aria-label={`取下 ${image.title || '此作品'}`}
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(image.id);
          }}
        >
          <X size={14} strokeWidth={2} />
        </span>
      )}
    </button>
  );
}

export function GalleryMasonry({
  images, onOpen, uploadCard, manageMode, onRequestDelete,
}: Props) {
  // images 按上传时间倒序（最新挂的在最前）
  const sorted = useMemo(
    () => [...images].sort((a, b) => b.uploadedAt - a.uploadedAt),
    [images],
  );

  return (
    <div className="gallery-masonry" role="list">
      {sorted.map((img, idx) => (
        <GalleryCard
          key={img.id}
          image={img}
          onClick={() => onOpen(img.id, idx)}
          manageMode={manageMode}
          onRequestDelete={onRequestDelete}
        />
      ))}
      {uploadCard}
    </div>
  );
}
