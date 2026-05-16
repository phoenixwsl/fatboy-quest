// ============================================================
// imageCompress 单元测试 — 主要测 EXIF orientation 解析（jsdom 友好部分）
//
// 注：Canvas API 在 jsdom 不存在，整个压缩管线只能在集成层 / 真实浏览器测试。
// 这里只覆盖纯字节解析部分。
// ============================================================

import { describe, it, expect } from 'vitest';
import { readExifOrientation, MAX_INPUT_FILE_BYTES, ImageTooLargeError, compressForGallery } from '../src/lib/imageCompress';

/** 构造一个最小 JPEG with EXIF orientation header */
function makeJpegWithOrientation(orientation: number): File {
  // SOI(2) + APP1(FFE1) + size(2) + "Exif\0\0"(6) + TIFF header(8) + IFD entries
  // IFD0: 1 entry (Orientation), 4 trailing bytes for next IFD offset (zero)
  // Entry: tag(2)=0x0112 + type(2)=3(SHORT) + count(4)=1 + value(2)+padding(2)
  // Then SOS or EOI 截断 OK 因为我们只读 EXIF

  const buf = new ArrayBuffer(2 + 2 + 2 + 6 + 8 + 2 + 12 + 4 + 2);
  const view = new DataView(buf);
  let p = 0;
  // SOI
  view.setUint16(p, 0xFFD8); p += 2;
  // APP1 marker
  view.setUint16(p, 0xFFE1); p += 2;
  // APP1 size (大端，包含自己的 2 个字节，但不包含 marker)
  view.setUint16(p, 2 + 6 + 8 + 2 + 12 + 4); p += 2;
  // "Exif\0\0"
  view.setUint8(p++, 0x45); // E
  view.setUint8(p++, 0x78); // x
  view.setUint8(p++, 0x69); // i
  view.setUint8(p++, 0x66); // f
  view.setUint8(p++, 0x00);
  view.setUint8(p++, 0x00);
  // TIFF header: II (little endian)
  view.setUint16(p, 0x4949); p += 2;
  // Magic 0x002A LE
  view.setUint16(p, 0x002A, true); p += 2;
  // IFD0 offset = 8 (immediately after TIFF header start)
  view.setUint32(p, 8, true); p += 4;
  // IFD0: entries count = 1
  view.setUint16(p, 1, true); p += 2;
  // Entry: tag=0x0112, type=3 SHORT, count=1, value=orientation (LE)
  view.setUint16(p, 0x0112, true); p += 2;
  view.setUint16(p, 3, true); p += 2;
  view.setUint32(p, 1, true); p += 4;
  view.setUint16(p, orientation, true); p += 2;
  view.setUint16(p, 0, true); p += 2; // padding
  // Next IFD offset = 0
  view.setUint32(p, 0, true); p += 4;
  // EOI marker
  view.setUint16(p, 0xFFD9); p += 2;

  return new File([buf], 'test.jpg', { type: 'image/jpeg' });
}

describe('readExifOrientation', () => {
  it('返回 6 — iPad portrait 拍摄常见值', async () => {
    const file = makeJpegWithOrientation(6);
    expect(await readExifOrientation(file)).toBe(6);
  });

  it('返回 1 — 没有 EXIF 的图（PNG）', async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4E, 0x47])], 'test.png', { type: 'image/png' });
    expect(await readExifOrientation(png)).toBe(1);
  });

  it('返回 8 — 倒置拍摄', async () => {
    const file = makeJpegWithOrientation(8);
    expect(await readExifOrientation(file)).toBe(8);
  });

  it('返回 1 — 解析失败优雅降级（坏 JPEG）', async () => {
    const bad = new File([new Uint8Array([0xFF, 0xD8, 0x00])], 'bad.jpg', { type: 'image/jpeg' });
    expect(await readExifOrientation(bad)).toBe(1);
  });
});

describe('compressForGallery 拒绝过大文件', () => {
  it('> 20MB 抛 ImageTooLargeError', async () => {
    // 造一个 21MB 的假 File
    const big = new File([new Uint8Array(MAX_INPUT_FILE_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' });
    await expect(compressForGallery(big)).rejects.toThrow(ImageTooLargeError);
  });
});

describe('MAX_INPUT_FILE_BYTES', () => {
  it('= 20MB', () => {
    expect(MAX_INPUT_FILE_BYTES).toBe(20 * 1024 * 1024);
  });
});
