// ============================================================
// 图片压缩工具 — 给画廊（R5.7.0）用
//
// 给一个 File：
//   1. 读 EXIF orientation（iPad 拍照默认横躺，常见值 6 / 8）
//   2. <canvas> 绘制 + 应用 orientation 旋转矩阵
//   3. resize 长边到 1200px（主图）/ 400px（缩略图）
//   4. canvas.toBlob('image/jpeg', 0.82) / 0.75
//   5. 返回 { fullBlob, thumbBlob, width, height, ratio }
//
// 设计约束（来自 gallery-design SKILL.md 第 6 节）：
//   - 纯前端 Canvas，不引入第三方库
//   - EXIF orientation 手写读 marker 0xFFE1（~50 行）
//   - Blob 而不是 base64（IndexedDB first-class）
// ============================================================

const MAX_FULL_LONG_EDGE = 1200;
const MAX_THUMB_LONG_EDGE = 400;
const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.75;
export const MAX_INPUT_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export interface CompressedImage {
  fullBlob: Blob;
  thumbBlob: Blob;
  width: number;   // 主图压缩后宽（已应用 orientation）
  height: number;  // 主图压缩后高
  ratio: number;   // width / height（瀑布流布局用）
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

/**
 * 读 File 为 ArrayBuffer。
 * 真实浏览器优先用 file.arrayBuffer()（Safari 14+ / Chrome 76+）。
 * jsdom 测试环境下用 FileReader fallback（jsdom Blob 不暴露 arrayBuffer()）。
 */
async function readFileBytes(file: File): Promise<ArrayBuffer> {
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

/**
 * 读 EXIF orientation tag (0x0112)
 *   1 = normal
 *   3 = rotate 180
 *   6 = rotate 90 cw (iPad portrait shot, very common)
 *   8 = rotate 270 cw / 90 ccw
 *   2/4/5/7 = mirrored variants (罕见，本函数也支持)
 *
 * 只读 JPEG。PNG/WebP 没有 EXIF orientation，返回 1。
 * 失败时静默返回 1（不报错，让图片照常显示，只是可能方向不对）。
 */
export async function readExifOrientation(file: File): Promise<number> {
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
    return 1;
  }
  // 读图字节 —— 用 FileReader 而不是 file.arrayBuffer()，因为 jsdom 的 File
  // 在测试环境下不暴露 arrayBuffer()。真实浏览器 FileReader 支持完美。
  const full = await readFileBytes(file);
  const head = full.slice(0, Math.min(full.byteLength, 128 * 1024));
  const view = new DataView(head);

  // JPEG 起始字节 FF D8
  if (view.byteLength < 4 || view.getUint16(0) !== 0xFFD8) return 1;

  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xFF) return 1; // marker 起始必须是 FF
    const marker = view.getUint8(offset + 1);
    offset += 2;
    // APP1 (FFE1) 包含 EXIF
    if (marker === 0xE1) {
      // size 高 / 低字节
      const size = view.getUint16(offset);
      // skip "Exif\0\0"
      if (view.getUint32(offset + 2) !== 0x45786966) return 1;
      const tiffStart = offset + 8;
      // byte order: II (little endian) or MM (big endian)
      const littleEndian = view.getUint16(tiffStart) === 0x4949;
      if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002A) return 1;
      // IFD0 offset (relative to TIFF header)
      const ifd0 = tiffStart + view.getUint32(tiffStart + 4, littleEndian);
      const entries = view.getUint16(ifd0, littleEndian);
      for (let i = 0; i < entries; i++) {
        const entry = ifd0 + 2 + i * 12;
        const tag = view.getUint16(entry, littleEndian);
        if (tag === 0x0112) { // Orientation
          return view.getUint16(entry + 8, littleEndian);
        }
      }
      return 1;
    } else if (marker === 0xD8 || marker === 0xD9) {
      return 1; // SOI / EOI
    } else {
      // skip 这一段
      const size = view.getUint16(offset);
      offset += size;
    }
  }
  return 1;
}

/**
 * 把 orientation 应用到 canvas context。
 * 调用前 canvas 应已 setWidth/setHeight 为最终输出尺寸（旋转后的）。
 */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number,
): void {
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;       // 水平镜像
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;      // 180°
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;       // 垂直镜像
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;        // 90° 顺 + 水平镜像
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;       // 90° 顺
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;      // 270° 顺 + 水平镜像
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;       // 270° 顺
    default: break; // 1
  }
}

/** 加载 File → HTMLImageElement(用 createImageBitmap 优先，fallback URL.createObjectURL) */
async function loadImage(file: File): Promise<{ bitmap: ImageBitmap | HTMLImageElement; width: number; height: number; cleanup: () => void }> {
  // createImageBitmap 性能好，iOS Safari 14+ 支持
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // 回落到 <img> 方案
    }
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

/** 算出目标尺寸 —— 保持比例，长边 ≤ maxLong */
function fitLongEdge(srcW: number, srcH: number, maxLong: number): { w: number; h: number } {
  const long = Math.max(srcW, srcH);
  if (long <= maxLong) return { w: srcW, h: srcH };
  const scale = maxLong / long;
  return { w: Math.round(srcW * scale), h: Math.round(srcH * scale) };
}

/** Canvas → Blob, 异步版 */
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

/**
 * 主函数：压缩一张图为主图 + 缩略图两个 Blob。
 *
 * @throws ImageTooLargeError 当文件 > 20MB
 * @throws ImageDecodeError 当图片读不出来
 */
export async function compressForGallery(file: File): Promise<CompressedImage> {
  if (file.size > MAX_INPUT_FILE_BYTES) {
    throw new ImageTooLargeError(file.size);
  }

  const orientation = await readExifOrientation(file).catch(() => 1);
  const { bitmap, width: rawW, height: rawH, cleanup } = await loadImage(file);

  try {
    // orientation 5-8 涉及 90° 旋转 → 宽高对调
    const swapWH = orientation >= 5 && orientation <= 8;
    const srcW = swapWH ? rawH : rawW;
    const srcH = swapWH ? rawW : rawH;

    // 主图
    const full = fitLongEdge(srcW, srcH, MAX_FULL_LONG_EDGE);
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = full.w;
    fullCanvas.height = full.h;
    const fullCtx = fullCanvas.getContext('2d');
    if (!fullCtx) throw new ImageDecodeError('无法创建 canvas 2d context');
    applyOrientation(fullCtx, orientation, full.w, full.h);
    fullCtx.drawImage(bitmap as CanvasImageSource, 0, 0, swapWH ? full.h : full.w, swapWH ? full.w : full.h);
    const fullBlob = await canvasToBlob(fullCanvas, 'image/jpeg', FULL_QUALITY);

    // 缩略图
    const thumb = fitLongEdge(srcW, srcH, MAX_THUMB_LONG_EDGE);
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumb.w;
    thumbCanvas.height = thumb.h;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) throw new ImageDecodeError('无法创建 canvas 2d context');
    applyOrientation(thumbCtx, orientation, thumb.w, thumb.h);
    thumbCtx.drawImage(bitmap as CanvasImageSource, 0, 0, swapWH ? thumb.h : thumb.w, swapWH ? thumb.w : thumb.h);
    const thumbBlob = await canvasToBlob(thumbCanvas, 'image/jpeg', THUMB_QUALITY);

    return {
      fullBlob,
      thumbBlob,
      width: full.w,
      height: full.h,
      ratio: full.w / full.h,
    };
  } finally {
    cleanup();
  }
}
