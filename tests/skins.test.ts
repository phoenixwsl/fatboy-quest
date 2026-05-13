import { describe, it, expect } from 'vitest';
import { SKINS, findSkin, detectUnlockedSkins, mergeUnlockedSkins } from '../src/lib/skins';

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
  it('first one is classic', () => {
    expect(SKINS[0].id).toBe('skin_classic');
  });
});

describe('detectUnlockedSkins', () => {
  it('returns only classic at zero', () => {
    expect(detectUnlockedSkins(baseSnap)).toEqual(['skin_classic']);
  });
  it('unlocks explorer at 7-day streak', () => {
    const out = detectUnlockedSkins({ ...baseSnap, longestStreak: 7 });
    expect(out).toContain('skin_explorer');
  });
  it('unlocks dino at 50 completed tasks', () => {
    const out = detectUnlockedSkins({ ...baseSnap, totalTasksCompleted: 50 });
    expect(out).toContain('skin_dino');
  });
  it('unlocks mecha at 2000 points', () => {
    const out = detectUnlockedSkins({ ...baseSnap, totalPoints: 2000 });
    expect(out).toContain('skin_mecha');
  });
  it('unlocks pirate after first shop redeem', () => {
    const out = detectUnlockedSkins({ ...baseSnap, shopRedeemsCount: 1 });
    expect(out).toContain('skin_pirate');
  });
  it('unlocks everything when all conditions met', () => {
    const out = detectUnlockedSkins({
      longestStreak: 100, totalTasksCompleted: 50, totalPoints: 2000,
      fiveStarWeeks: 3, shopRedeemsCount: 1,
    });
    expect(out.length).toBe(8);
  });
});

describe('mergeUnlockedSkins', () => {
  it('merges without duplicates', () => {
    expect(mergeUnlockedSkins(['skin_classic'], ['skin_classic', 'skin_explorer']))
      .toEqual(['skin_classic', 'skin_explorer']);
  });
});

describe('findSkin', () => {
  it('finds by id', () => {
    expect(findSkin('skin_classic')?.name).toBe('经典金');
  });
  it('returns undefined for missing', () => {
    expect(findSkin('skin_alien')).toBeUndefined();
  });
});
