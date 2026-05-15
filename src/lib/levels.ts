// ============================================================
// R4.0.0: 终身积分等级（6 级）
//
// 哲学：等级挂在"永远只增不减"的终身积分上，是 mastery 导向的成就锚点，
// 不可消费、不归零。称号一律侧重过程（"坚持的肥仔"）而非结果（"满分王"）。
// 6 级最高加自定义称号，强化 SDT 自主感。
// ============================================================

export type LevelId = 1 | 2 | 3 | 4 | 5 | 6;

/** 等级解锁奖励（R4.3.0 才会真正派发，R4.0.0 仅声明） */
export interface LevelUnlock {
  /** 解锁的皮肤 id（character id） */
  skin?: string;
  /** 解锁的主题 id */
  theme?: string;
  /** 解锁的奖杯 id */
  trophy?: string;
  /** 直接发放的神秘券数量 */
  mysteryCard?: number;
  /** 是否解锁"自定义称号"功能 */
  customTitle?: boolean;
}

export interface Level {
  level: LevelId;
  threshold: number;
  title: string;
  unlock: LevelUnlock;
}

export const LEVELS: readonly Level[] = [
  { level: 1, threshold: 0,     title: '萌新冒险家', unlock: { skin: 'default' } },
  { level: 2, threshold: 500,   title: '坚持的肥仔', unlock: { skin: 'extra1' } },
  { level: 3, threshold: 2000,  title: '闯关熟练工', unlock: { theme: 'extra' } },
  { level: 4, threshold: 5000,  title: '任务征服者', unlock: { skin: 'limited', trophy: 'engraved-5000' } },
  { level: 5, threshold: 10000, title: '长跑者',     unlock: { mysteryCard: 1 } },
  { level: 6, threshold: 20000, title: '时间的朋友', unlock: { skin: 'ultimate', customTitle: true } },
] as const;

/**
 * 根据终身积分推 level（不依赖 stored field）
 */
export function getLevelFromLifetime(lifetimePoints: number): Level {
  let current = LEVELS[0];
  for (const lv of LEVELS) {
    if (lifetimePoints >= lv.threshold) current = lv;
  }
  return current;
}

/**
 * 获取下一级（用于显示"还差多少升级"）
 * 已 max → null
 */
export function getNextLevel(lifetimePoints: number): Level | null {
  const cur = getLevelFromLifetime(lifetimePoints);
  const idx = LEVELS.findIndex(l => l.level === cur.level);
  return LEVELS[idx + 1] ?? null;
}
