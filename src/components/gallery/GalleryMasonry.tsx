// ============================================================
// 瀑布流 — 法则 5.1-5.4
// CSS columns 排列，cards 用 thumbBlob 渲染（瀑布流不渲染大图）
// 单击 → 触发 onOpen
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import type { GalleryImage } from '../../types';

interface Props {
  images: GalleryImage[];
  onOpen: (id: string, index: number) => void;
  /** 末尾插入上传卡（孩子端 + 家长端都能上传） */
  uploadCard?: React.ReactNode;
}

/** 一个瀑布流卡片 —— 内部管理 thumbBlob 的 ObjectURL 生命周期 */
function GalleryCard({
  image,
  onClick,
}: { image: GalleryImage; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(image.thumbBlob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [image.thumbBlob]);

  // 用 ratio 给 img 一个 aspect-ratio，让占位时不会高度抖动
  const aspect = image.ratio > 0 ? image.ratio : 1;

  return (
    <button
      type="button"
      className="gallery-card"
      onClick={onClick}
      aria-label={image.title || '查看作品'}
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
    </button>
  );
}

export function GalleryMasonry({ images, onOpen, uploadCard }: Props) {
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
        />
      ))}
      {uploadCard}
    </div>
  );
}
