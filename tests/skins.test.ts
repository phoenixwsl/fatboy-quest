// R2.2: skins lib 适配 Fatboy v4 (character id 化) 后的测试
import { describe, it, expect } from 'vitest';
import {
  SKINS, findSkin, detectUnlockedSkins, mergeUnlockedSkins,
  migrateSkinId, migrateUnlockedSkins, LEGACY_SKIN_MAP,
} from '../src/lib/skins';

const baseSnap = {
  longestStreak: 0, totalTasksCompleted: 0, totalPoints: 0,
  fiveStarWeeks: 0, shopRedeemsCount: 0,
};

describe('SKINS catalog', () => {
  it('has 8 skins', () => {
    expect(SKINS.length).toBe(8);
  });
  it('all unique ids', () => {
    const ids = new Set(SKINS.map(s => s.id));
    expect(ids.size).toBe(SKINS.length);
  });
  it('first one is default', () => {
    expect(SKINS[0].id).toBe('default');
  });
  it('all ids are new Fatboy character IDs', () => {
    const expected = new Set(['default', 'racer', 'astronaut', 'pirate', 'ninja', 'mario', 'knight', 'wizard']);
    for (const s of SKINS) expect(expected.has(s.id)).toBe(true);
  });
});

describe('migrateSkinId (legacy skin_* → character id)', () => {
  it('maps all 8 legacy ids', () => {
    expect(migrateSkinId('skin_classic')).toBe('default');
    expect(migrateSkinId('skin_explorer')).toBe('astronaut');
    expect(migrateSkinId('skin_cyber')).toBe('racer');
    expect(migrateSkinId('skin_rocket')).toBe('mario');
    expect(migrateSkinId('skin_ninja')).toBe('ninja');
    expect(migrateSkinId('skin_dino')).toBe('knight');
    expect(migrateSkinId('skin_mecha')).toBe('wizard');
    expect(migrateSkinId('skin_pirate')).toBe('pirate');
  });
  it('passes through new character ids unchanged', () => {
    expect(migrateSkinId('default')).toBe('default');
    expect(migrateSkinId('astronaut')).toBe('astronaut');
    expect(migrateSkinId('wizard')).toBe('wizard');
  });
  it('returns default for unknown', () => {
    expect(migrateSkinId(undefined)).toBe('default');
    expect(migrateSkinId(null)).toBe('default');
    expect(migrateSkinId('')).toBe('default');
    expect(migrateSkinId('skin_alien')).toBe('default');
    expect(migrateSkinId('weird_value')).toBe('default');
  });
  it('LEGACY_SKIN_MAP covers all 8 old ids', () => {
    expect(Object.keys(LEGACY_SKIN_MAP).length).toBe(8);
  });
});

describe('migrateUnlockedSkins', () => {
  it('always includes default', () => {
    expect(migrateUnlockedSkins([])).toContain('default');
  });
  it('migrates legacy + dedupes', () => {
    const out = migrateUnlockedSkins(['skin_classic', 'skin_explorer', 'astronaut']);
    expect(out).toContain('default');
    expect(out).toContain('astronaut');
    // skin_classic → default; astronaut shows once
    expect(out.filter(id => id === 'default').length).toBe(1);
    expect(out.filter(id => id === 'astronaut').length).toBe(1);
  });
});

describe('detectUnlockedSkins (returns new character ids)', () => {
  it('returns only default at zero', () => {
    expect(detectUnlockedSkins(baseSnap)).toEqual(['default']);
  });
  it('unlocks astronaut at 7-day streak', () => {
    const out = detectUnlockedSkins({ ...baseSnap, longestStreak: 7 });
    expect(out).toContain('astronaut');
  });
  it('unlocks knight at 50 completed tasks', () => {
    const out = detectUnlockedSkins({ ...baseSnap, totalTasksCompleted: 50 });
    expect(out).toContain('knight');
  });
  it('unlocks wizard at 2000 points', () => {
    const out = detectUnlockedSkins({ ...baseSnap, totalPoints: 2000 });
    expect(out).toContain('wizard');
  });
  it('unlocks pirate after first shop redeem', () => {
    const out = detectUnlockedSkins({ ...baseSnap, shopRedeemsCount: 1 });
    expect(out).toContain('pirate');
  });
  it('unlocks everything when all conditions met', () => {
    const out = detectUnlockedSkins({
      longestStreak: 100, totalTasksCompleted: 50, totalPoints: 2000,
      fiveStarWeeks: 3, shopRedeemsCount: 1,
    });
    expect(out.length).toBe(8);
  });
});

describe('mergeUnlockedSkins (now with legacy migration)', () => {
  it('merges without duplicates after migration', () => {
    const out = mergeUnlockedSkins(['skin_classic'], ['default', 'astronaut']);
    expect(out).toContain('default');
    expect(out).toContain('astronaut');
    expect(out.filter(id => id === 'default').length).toBe(1);
  });
  it('preserves legacy skin_explorer as astronaut', () => {
    const out = mergeUnlockedSkins(['skin_explorer'], []);
    expect(out).toContain('astronaut');
  });
});

describe('findSkin', () => {
  it('finds by new id', () => {
    expect(findSkin('default')?.name).toBeDefined();
    expect(findSkin('astronaut')?.name).toBeDefined();
  });
  it('finds by legacy id (auto-migrates)', () => {
    expect(findSkin('skin_classic')?.id).toBe('default');
    expect(findSkin('skin_explorer')?.id).toBe('astronaut');
  });
  it('returns default skin for unknown', () => {
    expect(findSkin('weird')?.id).toBe('default');
  });
});
