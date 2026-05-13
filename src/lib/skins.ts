// 蛋仔皮肤系统 - R2.2 (Fatboy v4 integration)
// 旧 8 个 skin_xxx → 新 8 个 FatboyCharacterId
// 旧值兼容：通过 migrateSkinId() 映射；DB v5 启动迁移把 pet.skinId 也转新值
import type { FatboyCharacterId } from '../components/fatboy/Fatboy';
import { CHARACTER_META, ALL_CHARACTERS } from '../components/fatboy/Fatboy';

export type SkinId = FatboyCharacterId;

export interface Skin {
  id: SkinId;
  name: string;
  desc: string;
  unlockHint: string;
}

// R2.2: 旧 skin id → 新 character id 的映射表
export const LEGACY_SKIN_MAP: Record<string, FatboyCharacterId> = {
  skin_classic:  'default',
  skin_explorer: 'astronaut',
  skin_cyber:    'racer',
  skin_rocket:   'mario',
  skin_ninja:    'ninja',
  skin_dino:     'knight',
  skin_mecha:    'wizard',
  skin_pirate:   'pirate',
};

/**
 * 把任意 skin id 规范化为新的 FatboyCharacterId
 *  - 老格式 (skin_xxx) → 映射
 *  - 新格式 (default/racer/...) → 原样
 *  - 未知 → 'default'
 */
export function migrateSkinId(id: string | undefined | null): FatboyCharacterId {
  if (!id) return 'default';
  if (ALL_CHARACTERS.includes(id as FatboyCharacterId)) return id as FatboyCharacterId;
  if (LEGACY_SKIN_MAP[id]) return LEGACY_SKIN_MAP[id];
  return 'default';
}

/**
 * 把一组 unlockedSkins（可能混合新旧 id）迁移为去重的新 id 数组
 */
export function migrateUnlockedSkins(ids: (string | undefined | null)[]): FatboyCharacterId[] {
  const out = new Set<FatboyCharacterId>();
  out.add('default');
  for (const id of ids) {
    const newId = migrateSkinId(id);
    out.add(newId);
  }
  return Array.from(out);
}

// 8 个皮肤的完整元数据（结合 CHARACTER_META + 解锁提示）
export const SKINS: Skin[] = ALL_CHARACTERS.map(id => {
  const meta = CHARACTER_META[id];
  const hints: Record<FatboyCharacterId, string> = {
    default:   '默认就有',
    astronaut: '连击 7 天解锁',
    racer:     '连击 30 天解锁',
    mario:     '连击 100 天解锁',
    ninja:     '一周内 3 次 5 星全评',
    knight:    '累计完成 50 项作业',
    wizard:    '累计获得 2000 积分',
    pirate:    '首次商店兑换',
  };
  return {
    id,
    name: meta.name,
    desc: meta.tagline,
    unlockHint: hints[id],
  };
});

export function findSkin(id: string): Skin | undefined {
  const normalized = migrateSkinId(id);
  return SKINS.find(s => s.id === normalized);
}

export interface SkinSnapshot {
  longestStreak: number;
  totalTasksCompleted: number;
  totalPoints: number;
  fiveStarWeeks: number;
  shopRedeemsCount: number;
}

/**
 * 给定一份数据，检测哪些皮肤应解锁（新 id）
 */
export function detectUnlockedSkins(snap: SkinSnapshot): FatboyCharacterId[] {
  const out: FatboyCharacterId[] = ['default'];
  if (snap.longestStreak >= 7) out.push('astronaut');
  if (snap.longestStreak >= 30) out.push('racer');
  if (snap.longestStreak >= 100) out.push('mario');
  if (snap.fiveStarWeeks >= 3) out.push('ninja');
  if (snap.totalTasksCompleted >= 50) out.push('knight');
  if (snap.totalPoints >= 2000) out.push('wizard');
  if (snap.shopRedeemsCount >= 1) out.push('pirate');
  return out;
}

/**
 * 合并：把新检测到的解锁皮肤并入现有列表（去重）
 */
export function mergeUnlockedSkins(current: string[], detected: FatboyCharacterId[]): FatboyCharacterId[] {
  const set = new Set<FatboyCharacterId>();
  for (const c of current) set.add(migrateSkinId(c));
  for (const d of detected) set.add(d);
  return Array.from(set);
}
