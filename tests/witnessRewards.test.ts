// R5.2.0: 见证累计软影响测试
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db';
import { checkWitnessRewards, WITNESS_THRESHOLDS } from '../src/lib/witnessRewards';
import { createWitnessMoment } from '../src/lib/witnessMoment';
import type { Pet, BarkRecipient } from '../src/types';

const mom: BarkRecipient = {
  id: 'preset-mom', label: '妈妈', emoji: '👩',
  serverUrl: 'https://api.day.app', key: 'mom-key',
  subTaskDone: true, subRoundDone: true, subMilestone: true,
  subPendingReview: true, subWeeklyReport: true, enabled: true,
};

async function reset() {
  await db.delete();
  await db.open();
  await db.pet.put({
    id: 'singleton', name: '肥仔', skinId: 'default',
    unlockedSkins: ['default'], level: 1, exp: 0,
    evolutionStage: 1, equippedAccessories: [],
  } as Pet);
}

beforeEach(async () => { await reset(); });

describe('WITNESS_THRESHOLDS', () => {
  it('has 3 thresholds at 5/20/50', () => {
    expect(WITNESS_THRESHOLDS.map(t => t.count)).toEqual([5, 20, 50]);
  });
});

describe('checkWitnessRewards', () => {
  it('no unlock when below first threshold', async () => {
    for (let i = 0; i < 4; i++) await createWitnessMoment(db, { text: 'x', emoji: '🌟', from: mom });
    const r = await checkWitnessRewards(db);
    expect(r.newlyUnlocked).toEqual([]);
  });

  it('unlocks 温柔者 at 5 moments', async () => {
    for (let i = 0; i < 5; i++) await createWitnessMoment(db, { text: 'x', emoji: '🌟', from: mom });
    const r = await checkWitnessRewards(db);
    expect(r.newlyUnlocked).toContain('温柔者');
    const pet = await db.pet.get('singleton');
    expect(pet!.unlockedTitles).toContain('温柔者');
  });

  it('idempotent: re-running does not re-unlock', async () => {
    for (let i = 0; i < 5; i++) await createWitnessMoment(db, { text: 'x', emoji: '🌟', from: mom });
    await checkWitnessRewards(db);
    const r2 = await checkWitnessRewards(db);
    expect(r2.newlyUnlocked).toEqual([]);
  });

  it('unlocks all 3 levels when reaching 50', async () => {
    for (let i = 0; i < 50; i++) await createWitnessMoment(db, { text: 'x', emoji: '🌟', from: mom });
    const r = await checkWitnessRewards(db);
    expect(r.newlyUnlocked.sort()).toEqual(['心灯', '温暖大使', '温柔者'].sort());
  });
});
