// R5.2.0: 里程碑引擎测试
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import {
  BADGE_CATALOG, issueBadge,
  checkFirstPerfect, checkFirstGoldTask, checkFirstLongTask,
  checkFirstRedemption, checkStreakMilestones, checkLevelMilestone,
  getBadgeInventory,
} from '../src/lib/badges';
import type { Pet, Task } from '../src/types';

async function reset() {
  await db.delete();
  await db.open();
}

async function seedPet() {
  await db.pet.put({
    id: 'singleton', name: '肥仔', skinId: 'default',
    unlockedSkins: ['default'], level: 1, exp: 0,
    evolutionStage: 1, equippedAccessories: [],
  } as Pet);
}

beforeEach(async () => {
  await reset();
  await seedPet();
});

describe('BADGE_CATALOG', () => {
  it('has 4 first-* + 4 streak + 5 level entries', () => {
    const ids = Object.keys(BADGE_CATALOG);
    expect(ids.filter(i => i.startsWith('first-'))).toHaveLength(4);
    expect(ids.filter(i => i.startsWith('streak-'))).toHaveLength(4);
    expect(ids.filter(i => i.startsWith('level-up-'))).toHaveLength(5);
  });
});

describe('issueBadge', () => {
  it('writes badge + applies rewardTitle to Pet.unlockedTitles', async () => {
    const b = await issueBadge(db, 'first-perfect');
    expect(b).not.toBeNull();
    expect(b!.id).toBe('first-perfect');
    const pet = await db.pet.get('singleton');
    expect(pet!.unlockedTitles).toContain('完美初体验');
  });

  it('idempotent: second call returns null + no duplicate title', async () => {
    await issueBadge(db, 'first-perfect');
    const b2 = await issueBadge(db, 'first-perfect');
    expect(b2).toBeNull();
    const pet = await db.pet.get('singleton');
    const count = (pet!.unlockedTitles ?? []).filter(t => t === '完美初体验').length;
    expect(count).toBe(1);
  });

  it('returns null for unknown id', async () => {
    const b = await issueBadge(db, 'nonexistent');
    expect(b).toBeNull();
  });
});

describe('checkFirst* triggers', () => {
  it('checkFirstPerfect: only when 三维全 5', async () => {
    expect(await checkFirstPerfect(db, { completion: 5, quality: 5, attitude: 5 })).not.toBeNull();
    await reset(); await seedPet();
    expect(await checkFirstPerfect(db, { completion: 4, quality: 5, attitude: 5 })).toBeNull();
  });

  it('checkFirstGoldTask: only when difficulty=gold', async () => {
    const t: Task = {
      id: 't', title: 't', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1,
      difficulty: 'gold',
    } as Task;
    expect(await checkFirstGoldTask(db, t)).not.toBeNull();
    await reset(); await seedPet();
    expect(await checkFirstGoldTask(db, { ...t, difficulty: 'silver' })).toBeNull();
  });

  it('checkFirstLongTask: only when actual ≥ 30min', async () => {
    const t: Task = {
      id: 't', title: 't', date: '2026-05-15',
      basePoints: 10, estimatedMinutes: 10, subject: 'math',
      status: 'evaluated', createdAt: 1,
      actualStartedAt: 1_700_000_000_000, completedAt: 1_700_000_000_000 + 30 * 60 * 1000,
    } as Task;
    expect(await checkFirstLongTask(db, t)).not.toBeNull();
    await reset(); await seedPet();
    const short = { ...t, completedAt: t.actualStartedAt! + 10 * 60 * 1000 };
    expect(await checkFirstLongTask(db, short)).toBeNull();
  });

  it('checkFirstRedemption: only when redemptions ≥ 1', async () => {
    expect(await checkFirstRedemption(db)).toBeNull();
    await db.redemptions.add({
      id: 'r', shopItemId: 'x', shopItemName: 'X',
      costPoints: 50, redeemedAt: Date.now(),
    } as any);
    expect(await checkFirstRedemption(db)).not.toBeNull();
  });
});

describe('checkStreakMilestones', () => {
  it('issues all crossed thresholds at once', async () => {
    const issued = await checkStreakMilestones(db, 30);
    // Should issue 7, 14, 30 (not 100)
    expect(issued.map(b => b.id).sort()).toEqual(['streak-14', 'streak-30', 'streak-7']);
  });

  it('does not re-issue', async () => {
    await checkStreakMilestones(db, 14);
    const issued2 = await checkStreakMilestones(db, 14);
    expect(issued2).toEqual([]);
  });

  it('issues only ≤ current threshold', async () => {
    const issued = await checkStreakMilestones(db, 6);
    expect(issued).toEqual([]);
  });
});

describe('checkLevelMilestone', () => {
  it('issues level-up-N badge', async () => {
    const b = await checkLevelMilestone(db, 3);
    expect(b).not.toBeNull();
    expect(b!.id).toBe('level-up-3');
  });
});

describe('getBadgeInventory', () => {
  it('groups unlocked vs locked + by category', async () => {
    await issueBadge(db, 'first-perfect');
    await issueBadge(db, 'streak-7');
    const inv = await getBadgeInventory(db);
    expect(inv.unlocked.length).toBe(2);
    expect(inv.locked.length).toBe(Object.keys(BADGE_CATALOG).length - 2);
    expect(inv.byCategory.first.unlocked).toBe(1);
    expect(inv.byCategory.streak.unlocked).toBe(1);
    expect(inv.byCategory.level.unlocked).toBe(0);
  });
});
