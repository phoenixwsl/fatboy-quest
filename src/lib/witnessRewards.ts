// ============================================================
// R5.2.0: 见证累计软影响
//
// 哲学：见证奖励不入积分（避免 crowding-out 内在动机），但累计达阈值时
// 解锁专属称号，让"被看见"的累积有可视化的身份回响。
//
// 不破坏 SDT relatedness 设计：
//   - 不给积分（孩子不会"为得分而温柔"）
//   - 仅称号（写入 Pet.unlockedTitles，可在等级展示位选用）
//   - 解锁是单向的：达到阈值就获得，永远不会回退
// ============================================================

import type { FatboyDB } from '../db';

export interface WitnessThreshold {
  count: number;
  title: string;
  description: string;
}

export const WITNESS_THRESHOLDS: WitnessThreshold[] = [
  { count: 5,  title: '温柔者',     description: '累计 5 个温柔时刻' },
  { count: 20, title: '温暖大使',   description: '累计 20 个温柔时刻' },
  { count: 50, title: '心灯',       description: '累计 50 个温柔时刻 — 你照亮了别人' },
];

// ------------------------------------------------------------
// 检查累计 → 解锁称号
// 调用时机：每次 createWitnessMoment 之后
// 幂等：已解锁的称号不重复加
// ------------------------------------------------------------
export async function checkWitnessRewards(db: FatboyDB): Promise<{ newlyUnlocked: string[] }> {
  const count = await db.witnessMoments.count();
  const pet = await db.pet.get('singleton');
  if (!pet) return { newlyUnlocked: [] };

  const titles = new Set(pet.unlockedTitles ?? []);
  const newlyUnlocked: string[] = [];

  for (const t of WITNESS_THRESHOLDS) {
    if (count >= t.count && !titles.has(t.title)) {
      titles.add(t.title);
      newlyUnlocked.push(t.title);
    }
  }

  if (newlyUnlocked.length > 0) {
    await db.pet.update('singleton', {
      unlockedTitles: Array.from(titles),
    });
  }

  return { newlyUnlocked };
}
