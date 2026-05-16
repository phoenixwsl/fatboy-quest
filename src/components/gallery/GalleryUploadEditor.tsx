// ============================================================
// GalleryUploadEditor — 上传/编辑画框 modal (R5.8.0)
//
// 两阶段：
//   1. crop: 选画框形状（4 种）+ 大小（2 档）+ 旋转 + 平移
//   2. meta: 5 个 input (title/artist/year/medium/caption,全 optional)
//
// 调用方传 file(新上传)或 originalBlob(re-edit"换画框")。
// 完成时 onSubmit({transformOptions, displaySize, metadata}) 给 StudyRoom 处理。
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw, X } from 'lucide-react';
import {
  GALLERY_FRAMES, DEFAULT_FRAME, DEFAULT_DISPLAY_SIZE,
  type GalleryFrame, type GalleryDisplaySize,
} from '../../types';

type Rotation = 0 | 90 | 180 | 270;

export interface UploadMetadata {
  title?: string;
  artist?: string;
  year?: number;
  medium?: string;
  caption?: string;
}

export interface UploadResult {
  frame: GalleryFrame;
  rotation: Rotation;
  displaySize: GalleryDisplaySize;
  crop?: { x: number; y: number; w: number; h: number };  // 相对旋转后的图（像素）
  metadata: UploadMetadata;
}

interface Props {
  /** 源 — File（新上传）或 Blob（re-edit 来自 originalBlob） */
  source: File | Blob;
  /** 编辑现有图时,把它当前状态传进来作为初始值 */
  initial?: {
    frame?: GalleryFrame;
    rotation?: Rotation;
    displaySize?: GalleryDisplaySize;
    metadata?: UploadMetadata;
  };
  /** 默认上传者名字(artist 字段) */
  defaultArtist?: string;
  /** 取消 */
  onCancel: () => void;
  /** 完成上传 / 编辑 */
  onSubmit: (result: UploadResult) => void | Promise<void>;
  /** 标题文字('上传画作' / '换画框 / 重新构图') */
  titleText?: string;
}

function frameRatio(frame: GalleryFrame): number {
  switch (frame) {
    case '1:1': return 1;
    case '4:5': return 4 / 5;
    case '4:3': return 4 / 3;
    case '3:4': return 3 / 4;
  }
}

/** 把 normalized pan offset (-1..1) 转为 source 像素中的 crop 区域 */
function computeCrop(
  imgW: number, imgH: number,
  frame: GalleryFrame,
  pan: { x: number; y: number },  // -1..1, 0 = 居中
): { x: number; y: number; w: number; h: number } {
  const r = frameRatio(frame);
  const srcRatio = imgW / imgH;
  let cropW: number, cropH: number;
  if (srcRatio > r) {
    cropH = imgH;
    cropW = cropH * r;
  } else {
    cropW = imgW;
    cropH = cropW / r;
  }
  // pan: x = -1 表示完全偏左,x = 1 表示完全偏右
  const maxOffsetX = imgW - cropW;
  const maxOffsetY = imgH - cropH;
  const x = (maxOffsetX / 2) + (pan.x * maxOffsetX / 2);
  const y = (maxOffsetY / 2) + (pan.y * maxOffsetY / 2);
  return {
    x: Math.max(0, Math.min(imgW - cropW, x)),
    y: Math.max(0, Math.min(imgH - cropH, y)),
    w: cropW,
    h: cropH,
  };
}

export function GalleryUploadEditor({
  source, initial, defaultArtist, onCancel, onSubmit, titleText,
}: Props) {
  const [step, setStep] = useState<'crop' | 'meta' | 'submitting'>('crop');
  const [frame, setFrame] = useState<GalleryFrame>(initial?.frame ?? DEFAULT_FRAME);
  const [rotation, setRotation] = useState<Rotation>(initial?.rotation ?? 0);
  const [displaySize, setDisplaySize] = useState<GalleryDisplaySize>(
    initial?.displaySize ?? DEFAULT_DISPLAY_SIZE,
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // metadata 表单
  const [title, setTitle] = useState(initial?.metadata?.title ?? '');
  const [artist, setArtist] = useState(initial?.metadata?.artist ?? defaultArtist ?? '');
  const [year, setYear] = useState(
    initial?.metadata?.year?.toString() ?? new Date().getFullYear().toString(),
  );
  const [medium, setMedium] = useState(initial?.metadata?.medium ?? '');
  const [caption, setCaption] = useState(initial?.metadata?.caption ?? '');

  // 源图 URL（preview canvas 用）
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(source);
    setSrcUrl(u);
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [source]);

  // ESC 取消
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  // 拖拽 pan
  const panRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    panRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!panRef.current) return;
    const dx = (e.clientX - panRef.current.startX) / 200;  // 拖 200px ≈ 1 unit
    const dy = (e.clientY - panRef.current.startY) / 200;
    // 拖右 → 显示图片更左部分 → pan.x 变小（负）
    const nx = Math.max(-1, Math.min(1, panRef.current.baseX - dx));
    const ny = Math.max(-1, Math.min(1, panRef.current.baseY - dy));
    setPan({ x: nx, y: ny });
  }
  function onPointerUp() {
    panRef.current = null;
  }

  // 预览 canvas 上画当前 crop 后的图
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // 旋转后的尺寸（pan/crop 基于旋转后图算）
  const rotatedSize = useMemo(() => {
    if (!imgSize) return null;
    const swap = rotation === 90 || rotation === 270;
    return swap
      ? { w: imgSize.h, h: imgSize.w }
      : { w: imgSize.w, h: imgSize.h };
  }, [imgSize, rotation]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !srcUrl || !imgSize || !rotatedSize) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const crop = computeCrop(rotatedSize.w, rotatedSize.h, frame, pan);
      // 显示尺寸:适合预览框,但保持画框比例
      const PREVIEW_LONG = 380;
      const r = frameRatio(frame);
      const dispW = r >= 1 ? PREVIEW_LONG : PREVIEW_LONG * r;
      const dispH = r >= 1 ? PREVIEW_LONG / r : PREVIEW_LONG;
      canvas.width = Math.round(dispW);
      canvas.height = Math.round(dispH);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 先在临时 canvas 上画 rotated img,然后从这个临时 canvas 裁 crop
      const mid = document.createElement('canvas');
      mid.width = rotatedSize.w;
      mid.height = rotatedSize.h;
      const midCtx = mid.getContext('2d')!;
      midCtx.save();
      midCtx.translate(rotatedSize.w / 2, rotatedSize.h / 2);
      midCtx.rotate((rotation * Math.PI) / 180);
      midCtx.drawImage(img, -imgSize.w / 2, -imgSize.h / 2);
      midCtx.restore();

      ctx.drawImage(
        mid,
        crop.x, crop.y, crop.w, crop.h,
        0, 0, canvas.width, canvas.height,
      );
    };
    img.src = srcUrl;
  }, [srcUrl, imgSize, rotatedSize, frame, rotation, pan]);

  function rotate90() {
    setRotation(((rotation + 90) % 360) as Rotation);
    setPan({ x: 0, y: 0 });  // 旋转后重新居中
  }

  function goToMeta() {
    setStep('meta');
  }

  async function handleSubmit() {
    if (step === 'submitting') return;
    setStep('submitting');
    const yearNum = parseInt(year, 10);
    const result: UploadResult = {
      frame,
      rotation,
      displaySize,
      crop: rotatedSize ? computeCrop(rotatedSize.w, rotatedSize.h, frame, pan) : undefined,
      metadata: {
        title: title.trim() || undefined,
        artist: artist.trim() || undefined,
        year: Number.isFinite(yearNum) && yearNum > 0 ? yearNum : undefined,
        medium: medium.trim() || undefined,
        caption: caption.trim().slice(0, 80) || undefined,
      },
    };
    try {
      await onSubmit(result);
    } catch {
      setStep('meta');  // 出错回到 meta 步
    }
  }

  return (
    <div className="gallery-upload-backdrop" role="dialog" aria-modal="true">
      <div className="gallery-upload-modal">
        <div className="gallery-upload-header">
          <span className="gallery-upload-title">{titleText ?? '挂一幅新画'}</span>
          <button
            type="button"
            aria-label="取消"
            className="gallery-upload-close"
            onClick={onCancel}
            disabled={step === 'submitting'}
          >
            <X size={18} />
          </button>
        </div>

        {step === 'crop' && (
          <>
            {/* 预览区 */}
            <div
              className="gallery-upload-preview-wrap"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <canvas
                ref={previewCanvasRef}
                className="gallery-upload-preview"
              />
            </div>
            <p className="gallery-upload-hint">拖动图片调整位置</p>

            {/* 画框形状 chips */}
            <div className="gallery-upload-section">
              <span className="gallery-upload-section-label">画框</span>
              <div className="gallery-upload-chips">
                {GALLERY_FRAMES.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    className="gallery-upload-chip"
                    data-active={frame === f.id}
                    onClick={() => { setFrame(f.id); setPan({ x: 0, y: 0 }); }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 尺寸 chips */}
            <div className="gallery-upload-section">
              <span className="gallery-upload-section-label">大小</span>
              <div className="gallery-upload-chips">
                <button
                  type="button"
                  className="gallery-upload-chip"
                  data-active={displaySize === 'large'}
                  onClick={() => setDisplaySize('large')}
                >
                  大
                </button>
                <button
                  type="button"
                  className="gallery-upload-chip"
                  data-active={displaySize === 'small'}
                  onClick={() => setDisplaySize('small')}
                >
                  小
                </button>
              </div>
            </div>

            {/* 旋转 + 下一步 */}
            <div className="gallery-upload-actions">
              <button
                type="button"
                className="gallery-upload-btn-secondary"
                onClick={rotate90}
                aria-label="旋转 90 度"
              >
                <RotateCw size={16} /> 旋转
              </button>
              <button
                type="button"
                className="gallery-upload-btn-primary"
                onClick={goToMeta}
              >
                下一步
              </button>
            </div>
          </>
        )}

        {step === 'meta' && (
          <>
            <p className="gallery-upload-hint" style={{ textAlign: 'left' }}>
              下方信息全部可不填，挂出来照样好看。
            </p>
            <div className="gallery-upload-form">
              <Field label="作品名"   value={title}   onChange={setTitle}   placeholder="（可不填）" />
              <Field label="作者"     value={artist}  onChange={setArtist}  placeholder="（可不填）" />
              <Field label="年份"     value={year}    onChange={setYear}    placeholder={`${new Date().getFullYear()}`} type="number" />
              <Field label="媒介"     value={medium}  onChange={setMedium}  placeholder="蜡笔画 / 照片 / iPad 涂鸦 …" />
              <Field label="说明"     value={caption} onChange={setCaption} placeholder="（≤ 80 字）" multiline maxLength={80} />
            </div>
            <div className="gallery-upload-actions">
              <button
                type="button"
                className="gallery-upload-btn-secondary"
                onClick={() => setStep('crop')}
              >
                ← 改画框
              </button>
              <button
                type="button"
                className="gallery-upload-btn-primary"
                onClick={handleSubmit}
              >
                挂上去
              </button>
            </div>
          </>
        )}

        {step === 'submitting' && (
          <div className="gallery-upload-busy">
            <span>正在挂画…</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type, multiline, maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="gallery-upload-field">
      <span className="gallery-upload-field-label">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={2}
          className="gallery-upload-field-input"
        />
      ) : (
        <input
          type={type ?? 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="gallery-upload-field-input"
        />
      )}
    </label>
  );
}
