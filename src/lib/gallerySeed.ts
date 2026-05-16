// ============================================================
// 画廊种子图 — 把原 StudyRoom 的 center_hero.jpg（科比海报）
// 转成画廊的第一张图，让老用户从 v9 升级后画廊不空。
//
// 设计：
//   - 幂等：只在 galleryImages 表为空时 seed
//   - 用户删了之后不会重新塞回（按 ID 判断不存在 ≠ 用户删了的语义）
//     这里用"表空"判断，避免"删完又塞回"的尴尬；用户清空后下次启动会重新 seed
//     —— 这是 trade-off：实际场景里"清空"很罕见，比"丢失情怀图"代价更小。
//     用户极致洁癖想保持空可以单独删完后到 ParentSettings 关一个开关（不在 R5.7.0 范围）
//   - 用 compressForGallery 同样的压缩管线，保证缩略图存在
// ============================================================

import { db } from '../db';
import { compressForGallery } from './imageCompress';
import centerHeroImg from '../assets/home/paintings/center_hero.jpg';
import type { GalleryImage } from '../types';

const SEED_ID = 'seed-kobe-poster';

/**
 * 首次启动 / 画廊为空时，把 center_hero.jpg 作为种子图塞入。
 * 失败静默（fetch 失败 / 压缩失败都不影响 app 启动）。
 */
export async function seedGalleryIfEmpty(): Promise<void> {
  try {
    const count = await db.galleryImages.count();
    if (count > 0) return;

    // 已经 seed 过又被用户删掉的情况：表是空的，但我们不该重塞
    // 用 settings.gallerySeedDone 标志位避免（如果将来要加）
    // R5.7.0 第一版：表空就 seed，简单可预测

    const resp = await fetch(centerHeroImg);
    if (!resp.ok) return;
    const blob = await resp.blob();
    const file = new File([blob], 'kobe.jpg', { type: 'image/jpeg' });

    const { fullBlob, thumbBlob, width, height, ratio } = await compressForGallery(file);

    const seed: GalleryImage = {
      id: SEED_ID,
      fullBlob,
      thumbBlob,
      width, height, ratio,
      uploadedBy: 'parent',
      uploadedAt: Date.now(),
      title: '科比·布莱恩特',
      artist: '爸爸',
      year: new Date().getFullYear(),
      medium: '偶像海报',
      caption: '从你的书房挂过来的第一张画。',
    };
    await db.galleryImages.add(seed);
  } catch {
    // 静默：seed 失败不该影响 app 启动
  }
}
