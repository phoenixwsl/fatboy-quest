// 蛋仔皮肤系统 - R2.1
// 8 个皮肤，解锁条件 + 标签
import type { Badge, Pet } from '../types';

export interface Skin {
  id: string;
  name: string;
  desc: string;
  unlockHint: string;          // 未解锁时显示给孩子的提示
  body: string;                // 主色
  accent: string;              // 副色
  decoration?: 'cape' | 'mask' | 'horn' | 'antenna' | 'crown' | 'patch';
}

export const SKINS: Skin[] = [
  { id: 'skin_classic',  name: '经典金',  desc: '最初的伙伴', unlockHint: '默认就有',
    body: '#fbbf24', accent: '#f59e0b' },
  { id: 'skin_explorer', name: '星空紫',  desc: '太空探险家', unlockHint: '连击 7 天解锁',
    body: '#7c5cff', accent: '#a78bfa', decoration: 'antenna' },
  { id: 'skin_cyber',    name: '赛博青',  desc: '霓虹机械感', unlockHint: '连击 30 天解锁',
    body: '#22d3ee', accent: '#06b6d4', decoration: 'mask' },
  { id: 'skin_rocket',   name: '火箭红',  desc: '一飞冲天',   unlockHint: '连击 100 天解锁',
    body: '#ef4444', accent: '#fbbf24', decoration: 'horn' },
  { id: 'skin_ninja',    name: '忍者黑',  desc: '影分身术！', unlockHint: '一周内 3 次 5 星全评',
    body: '#1a1a2e', accent: '#7c3aed', decoration: 'mask' },
  { id: 'skin_dino',     name: '恐龙绿',  desc: '远古战士',   unlockHint: '累计完成 50 项作业',
    body: '#10b981', accent: '#fbbf24', decoration: 'horn' },
  { id: 'skin_mecha',    name: '机甲银',  desc: '钢铁之心',   unlockHint: '累计获得 2000 积分',
    body: '#94a3b8', accent: '#06b6d4', decoration: 'antenna' },
  { id: 'skin_pirate',   name: '海盗棕',  desc: '寻宝大冒险', unlockHint: '首次商店兑换',
    body: '#a16207', accent: '#fbbf24', decoration: 'patch' },
];

export function findSkin(id: string): Skin | undefined {
  return SKINS.find(s => s.id === id);
}

export interface SkinSnapshot {
  longestStreak: number;
  totalTasksCompleted: number;
  totalPoints: number;
  fiveStarWeeks: number;       // 简化：算最近一周 5 星评分数（这里偏粗略）
  shopRedeemsCount: number;
}

/**
 * 给定一份数据，检测哪些皮肤应解锁
 */
export function detectUnlockedSkins(snap: SkinSnapshot): string[] {
  const out: string[] = ['skin_classic'];  // 默认皮肤永远解锁
  if (snap.longestStreak >= 7) out.push('skin_explorer');
  if (snap.longestStreak >= 30) out.push('skin_cyber');
  if (snap.longestStreak >= 100) out.push('skin_rocket');
  if (snap.fiveStarWeeks >= 3) out.push('skin_ninja');
  if (snap.totalTasksCompleted >= 50) out.push('skin_dino');
  if (snap.totalPoints >= 2000) out.push('skin_mecha');
  if (snap.shopRedeemsCount >= 1) out.push('skin_pirate');
  return out;
}

/**
 * 同步 unlockedSkins 字段：把还没解锁的新皮肤合并进去
 */
export function mergeUnlockedSkins(current: string[], detected: string[]): string[] {
  const set = new Set([...current, ...detected]);
  return Array.from(set);
}
