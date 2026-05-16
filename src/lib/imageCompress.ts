// ============================================================
// 图片压缩工具 — 给画廊用 (R5.7.0 / R5.8.0)
//
// 主要 API:
//   compressForGallery(file)                            — 老 API,简单上传
//   compressWithTransform(file|blob, options)           — 新 API,支持 rotation+frame
//
// 输出三个 Blob:
//   originalBlob  (长边 1600 JPEG 0.85, ~600KB) — 用于以后"换画框"
//   fullBlob      (长边 1200 JPEG 0.82, ≤ 400KB) — lightbox 展示
//   thumbBlob     (长边 400  JPEG 0.75, ~30KB)   — 瀑布流缩略
//
// 设计约束(gallery-design SKILL.md 第 6 节):
//   - 纯前端 Canvas,不引入第三方库
//   - EXIF orientation 手写读 marker 0xFFE1
//   - Blob 而不是 base64(IndexedDB first-class)
// ============================================================

import type { GalleryFrame } from '../types';

const MAX_ORIGINAL_LONG_EDGE = 1600;
const MAX_FULL_LONG_EDGE = 1200;
const MAX_THUMB_LONG_EDGE = 400;
const ORIGINAL_QUALITY = 0.85;
const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;
export const MAX_INPUT_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export interface CompressedImage {
  /** 主图 Blob,已应用 rotation+crop */
  fullBlob: Blob;
  /** 缩略图 Blob,已应用 rotation+crop */
  thumbBlob: Blob;
  /** 原图 Blob —— 仅应用 EXIF orientation,未裁剪,用于"换画框" */
  originalBlob: Blob;
  /** 主图压缩后尺寸 */
  width: number;
  height: number;
  ratio: number;
}

export class ImageTooLargeError extends Error {
  constructor(public bytes: number) {
    super(`图片太大了（${(bytes / 1024 / 1024).toFixed(1)}MB），最多 20MB`);
    this.name = 'ImageTooLargeError';
  }
}

export class ImageDecodeError extends Error {
  constructor(reason: string) {
    super(`无法读取图片：${reason}`);
    this.name = 'ImageDecodeError';
  }
}

/** File → ArrayBuffer，FileReader fallback 给 jsdom 用 */
async function readFileBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof (file as Blob).arrayBuffer === 'function') {
    return (file as Blob).arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new ImageDecodeError('FileReader 失败'));
    reader.readAsArrayBuffer(file);
  });
}

/** 读 EXIF orientation tag (0x0112) —— 仅 JPEG */
export async function readExifOrientation(file: Blob): Promise<number> {
  if (file.type && !file.type.includes('jpeg') && !file.type.includes('jpg')) {
    return 1;
  }
  const full = await readFileBytes(file);
  const head = full.slice(0, Math.min(full.byteLength, 128 * 1024));
  const view = new DataView(head);

  if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return 1;

  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xFF) return 1;
    const marker = view.getUint8(offset + 1);
    offset += 2;
    if (marker === 0xE1) {
      if (view.getUint32(offset + 2) !== 0x45786966) return 1;
      const tiffStart = offset + 8;
      const littleEndian = view.getUint16(tiffStart) === 0x4949;
      if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002A) return 1;
      const ifd0 = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
      const entries = view.getUint16(ifd0, littleEndian);
      for (let i = 0; i < entries; i++) {
        const entry = ifd0 + 2 + i * 12;
        const tag = view.getUint16(entry, littleEndian);
        if (tag === 0x0112) return view.getUint16(entry + 8, littleEndian);
      }
      return 1;
    } else if (marker === 0xD8 || marker === 0xD9) {
      return 1;
    } else {
      const size = view.getUint16(offset);
      offset += size;
    }
  }
  return 1;
}

/** 把 orientation 应用到 canvas context */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number,
): void {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break;
  }
}

async function loadImage(file: Blob): Promise<{
  bitmap: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch { /* fallthrough */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new ImageDecodeError('解码失败'));
      el.src = url;
    });
    return {
      bitmap: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function fitLongEdge(srcW: number, srcH: number, maxLong: number): { w: number; h: number } {
  const long = Math.max(srcW, srcH);
  if (long <= maxLong) return { w: srcW, h: srcH };
  const scale = maxLong / long;
  return { w: Math.round(srcW * scale), h: Math.round(srcH * scale) };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ImageDecodeError('canvas.toBlob 返回 null'));
      },
      type,
      quality,
    );
  });
}

/** 给定 frame 比例 + 源图尺寸,返回居中裁剪的 cover 区域(像 object-fit: cover) */
export function defaultCropForFrame(
  srcW: number,
  srcH: number,
  frameRatio: number,
): { x: number; y: number; w: number; h: number } {
  const srcRatio = srcW / srcH;
  if (srcRatio > frameRatio) {
    // 源图比 frame 更宽 → 裁左右
    const cropW = srcH * frameRatio;
    return { x: (srcW - cropW) / 2, y: 0, w: cropW, h: srcH };
  } else {
    // 源图比 frame 更高 → 裁上下
    const cropH = srcW / frameRatio;
    return { x: 0, y: (srcH - cropH) / 2, w: srcW, h: cropH };
  }
}

function frameToRatio(frame: GalleryFrame): number {
  switch (frame) {
    case '1:1': return 1;
    case '4:5': return 4 / 5;
    case '4:3': return 4 / 3;
    case '3:4': return 3 / 4;
  }
}

export interface TransformOptions {
  /** 旋转角度,只接受 0/90/180/270 */
  rotation?: 0 | 90 | 180 | 270;
  /** 画框 — 决定裁剪 aspect ratio */
  frame?: GalleryFrame;
  /** 自定义 crop 区域(相对于旋转后的图,像素坐标) */
  crop?: { x: number; y: number; w: number; h: number };
}

/**
 * 主函数:压缩一张图为 originalBlob + fullBlob + thumbBlob。
 *
 * 流程:
 *   1. EXIF orientation 自动旋转
 *   2. 输出 originalBlob (长边 1600,无 crop,仅 orientation 校正)
 *   3. 应用用户 rotation
 *   4. 应用 crop (custom 或 frame 默认 cover)
 *   5. 输出 fullBlob (长边 1200) + thumbBlob (长边 400)
 *
 * @throws ImageTooLargeError 当 File > 20MB
 */
export async function compressWithTransform(
  file: Blob,
  options: TransformOptions = {},
): Promise<CompressedImage> {
  if ((file as File).size > MAX_INPUT_FILE_BYTES) {
    throw new ImageTooLargeError((file as File).size);
  }

  const orientation = await readExifOrientation(file).catch(() => 1);
  const { bitmap, width: rawW, height: rawH, cleanup } = await loadImage(file);

  try {
    const swapWH = orientation >= 5 && orientation <= 8;
    const orientedW = swapWH ? rawH : rawW;
    const orientedH = swapWH ? rawW : rawH;

    // ============ 1. originalBlob —— 仅 orientation 校正,无 crop ============
    const orig = fitLongEdge(orientedW, orientedH, MAX_ORIGINAL_LONG_EDGE);
    const origCanvas = document.createElement('canvas');
    origCanvas.width = orig.w;
    origCanvas.height = orig.h;
    const origCtx = origCanvas.getContext('2d');
    if (!origCtx) throw new ImageDecodeError('无法创建 canvas context');
    applyOrientation(origCtx, orientation, orig.w, orig.h);
    origCtx.drawImage(bitmap as CanvasImageSource, 0, 0, swapWH ? orig.h : orig.w, swapWH ? orig.w : orig.h);
    const originalBlob = await canvasToBlob(origCanvas, 'image/jpeg', ORIGINAL_QUALITY);

    // ============ 2. 应用 rotation + crop,得到 fullBlob + thumbBlob ============
    const rotation = options.rotation ?? 0;

    // 先按 rotation 旋转 oriented 后的尺寸
    const swapAgain = rotation === 90 || rotation === 270;
    const afterRotW = swapAgain ? orientedH : orientedW;
    const afterRotH = swapAgain ? orientedW : orientedH;

    // 决定 crop 区域(相对于旋转后图)
    let crop = options.crop;
    if (!crop) {
      if (options.frame) {
        crop = defaultCropForFrame(afterRotW, afterRotH, frameToRatio(options.frame));
      } else {
        crop = { x: 0, y: 0, w: afterRotW, h: afterRotH };
      }
    }

    // 主图 canvas
    const fullSize = fitLongEdge(crop.w, crop.h, MAX_FULL_LONG_EDGE);
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = fullSize.w;
    fullCanvas.height = fullSize.h;
    const fullCtx = fullCanvas.getContext('2d');
    if (!fullCtx) throw new ImageDecodeError('无法创建 canvas context');

    drawCroppedRotated(fullCtx, bitmap as CanvasImageSource, {
      orientation, rotation,
      orientedW, orientedH,
      crop,
      destW: fullSize.w, destH: fullSize.h,
    });
    const fullBlob = await canvasToBlob(fullCanvas, 'image/jpeg', FULL_QUALITY);

    // 缩略图 canvas
    const thumbSize = fitLongEdge(crop.w, crop.h, MAX_THUMB_LONG_EDGE);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbSize.w;
    thumbCanvas.height = thumbSize.h;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) throw new ImageDecodeError('无法创建 canvas context');
    drawCroppedRotated(thumbCtx, bitmap as CanvasImageSource, {
      orientation, rotation,
      orientedW, orientedH,
      crop,
      destW: thumbSize.w, destH: thumbSize.h,
    });
    const thumbBlob = await canvasToBlob(thumbCanvas, 'image/jpeg', THUMB_QUALITY);

    return {
      originalBlob,
      fullBlob,
      thumbBlob,
      width: fullSize.w,
      height: fullSize.h,
      ratio: fullSize.w / fullSize.h,
    };
  } finally {
    cleanup();
  }
}

/** 在 ctx 上绘制经过 (orientation+rotation+crop) 的图,缩放到 destW×destH */
function drawCroppedRotated(
  ctx: CanvasRenderingContext2D,
  bitmap: CanvasImageSource,
  p: {
    orientation: number;
    rotation: 0 | 90 | 180 | 270;
    orientedW: number;
    orientedH: number;
    crop: { x: number; y: number; w: number; h: number };
    destW: number;
    destH: number;
  },
): void {
  const { orientation, rotation, orientedW, orientedH, crop, destW, destH } = p;
  const scaleX = destW / crop.w;
  const scaleY = destH / crop.h;

  // 我们要先在一个中间 canvas 上画好"已校正 orientation + 已 rotation"的整图,
  // 然后从这个中间 canvas 上 crop 出区域。这比合并矩阵简单可控。
  const mid = document.createElement('canvas');
  // 旋转后尺寸
  const swap = rotation === 90 || rotation === 270;
  const midW = swap ? orientedH : orientedW;
  const midH = swap ? orientedW : orientedH;
  mid.width = midW;
  mid.height = midH;
  const midCtx = mid.getContext('2d');
  if (!midCtx) throw new ImageDecodeError('无法创建中间 canvas');

  // 先应用 EXIF orientation,然后再应用 user rotation
  // 用一个临时 oriented canvas 中转
  const orientedCanvas = document.createElement('canvas');
  orientedCanvas.width = orientedW;
  orientedCanvas.height = orientedH;
  const orientedCtx = orientedCanvas.getContext('2d');
  if (!orientedCtx) throw new ImageDecodeError('无法创建临时 canvas');
  // 获取原始尺寸 (rawW, rawH)
  const swapEXIF = orientation >= 5 && orientation <= 8;
  const rawW = swapEXIF ? orientedH : orientedW;
  const rawH = swapEXIF ? orientedW : orientedH;
  applyOrientation(orientedCtx, orientation, orientedW, orientedH);
  orientedCtx.drawImage(bitmap, 0, 0, rawW, rawH);

  // 在 mid 上画 rotated
  midCtx.save();
  midCtx.translate(midW / 2, midH / 2);
  midCtx.rotate((rotation * Math.PI) / 180);
  midCtx.drawImage(orientedCanvas, -orientedW / 2, -orientedH / 2);
  midCtx.restore();

  // 最后从 mid 裁出 crop 区域到目标 ctx
  ctx.drawImage(
    mid,
    crop.x, crop.y, crop.w, crop.h,
    0, 0, destW, destH,
  );
  // 抑制未使用参数警告
  void scaleX; void scaleY;
}

/**
 * 老 API,向后兼容 R5.7.x 调用方。
 * 等同于 compressWithTransform(file)(无 rotation 无 crop),输出三个 Blob。
 */
export async function compressForGallery(file: File): Promise<CompressedImage> {
  return compressWithTransform(file);
}
