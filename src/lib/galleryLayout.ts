// ============================================================
// 画廊瀑布流布局微变量 — 基于 image.id 的稳定伪随机
//
// 目的（gallery-design skill 第 3 节 Cosmos / Apple Memories 调性）：
//   - 不是 Pinterest 填满式密铺
//   - 每张图都有呼吸感
//   - 卡片宽度、白边、阴影、旋转都有微差
//   - "轻推开，不炫技"
//
// 关键：deterministic — 同一张图刷新前后视觉一致，不会跳来跳去。
// ============================================================

/** 一个稳定的简单字符串 hash → uint32 */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 把 hash 切成多个 0~1 的"随机数"，避免不同维度撞在一起 */
function buckets(seed: number, count: number): number[] {
  // 用 LCG 链生成 count 个 0~1 数
  const out: number[] = [];
  let s = seed || 1;
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    out.push(((s >>> 8) & 0xFFFF) / 0xFFFF);
  }
  return out;
}

import type { GalleryDisplaySize } from '../types';

export interface CardLayoutVariance {
  /** 卡片旋转角度 (deg) —— 范围 ±1.5° */
  rotation: number;
  /** 卡片白边 padding (px) —— 范围 4-9 */
  framePadding: number;
  /** 卡片宽度 (相对列宽 %) —— 'large' 0.85-1.0 / 'small' 0.55-0.72 */
  widthPct: number;
  /** 卡片在列内的水平偏移 —— 'left' / 'right' / 'center' */
  align: 'left' | 'right' | 'center';
  /** 卡片下方间距 (px) —— 范围 18-32 */
  marginBottom: number;
  /** 阴影 alpha —— 范围 0.05-0.10(small) / 0.06-0.12(large) */
  shadowAlpha: number;
}

/**
 * 给定 image.id + displaySize，返回这张卡片的视觉微变量。
 * 同一个 (id, size) 多次调用结果完全一致。
 *
 * displaySize 决定主轴宽度档位，hash 提供同档内的微变化。
 */
export function layoutVariance(
  id: string,
  displaySize: GalleryDisplaySize = 'large',
): CardLayoutVariance {
  const seed = hashString(id);
  const [b0, b1, b2, b3, b4, b5] = buckets(seed, 6);

  // 旋转：±1.5°，但中心 30% 概率保持 0（不至于全部歪）
  // small 卡片可以倾斜稍大（更"贴墙"），large 卡片更端正（视觉锚）
  const rotMax = displaySize === 'small' ? 3.5 : 2.5;
  const rotation = b0 < 0.3 ? 0 : (b1 - 0.5) * rotMax;

  // 白边：small 4-7px / large 6-10px（大图配宽白边更"画展感"）
  const framePadding = displaySize === 'small'
    ? 4 + Math.round(b2 * 3)
    : 6 + Math.round(b2 * 4);

  // 宽度：layoutVariance 的核心 —— size 决定档位
  const widthPct = displaySize === 'small'
    ? 0.55 + b3 * 0.17     // 0.55 - 0.72
    : 0.85 + b3 * 0.15;    // 0.85 - 1.00

  // 对齐：small 卡片几乎一定偏一边，large 卡片优先居中或接近占满
  let align: CardLayoutVariance['align'];
  if (displaySize === 'small') {
    align = b4 < 0.5 ? 'left' : 'right';
  } else {
    align = widthPct < 0.95 ? (b4 < 0.5 ? 'left' : 'right') : 'center';
  }

  // 下方间距：18-32px
  const marginBottom = 18 + Math.round(b5 * 14);

  // 阴影：small 略浅，large 略深(视觉重量)
  const shadowAlpha = displaySize === 'small'
    ? 0.05 + b0 * 0.04     // 0.05-0.09
    : 0.06 + b0 * 0.06;    // 0.06-0.12

  return {
    rotation: Math.round(rotation * 100) / 100,
    framePadding,
    widthPct: Math.round(widthPct * 100) / 100,
    align,
    marginBottom,
    shadowAlpha: Math.round(shadowAlpha * 1000) / 1000,
  };
}
