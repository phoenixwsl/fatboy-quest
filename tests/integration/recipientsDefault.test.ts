// ============================================================
// R5.6.0: Bark 默认接收人 — 仅空表时写入，否则一律不动
//   RD1: 空表 → 写入 2 条预置（爸爸 / 妈妈，key 正确）
//   RD2: 用户改过某条 key → 再调不被覆盖
//   RD3: 删掉一条但表非空 → 不补回那条
//   RD4: 删光所有接收人 → 重新补 2 条
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { db, ensureDefaultRecipients } from '../../src/db';
import { resetDB } from './helpers';

const MOM_KEY = 'DfjzKiUDcfdWLcnMeR6jXf';
const DAD_KEY = 'aWEsiXKUPXgZAPNiz6r835';

beforeEach(async () => {
  await resetDB();
});

describe('RD · Bark 默认接收人', () => {
  it('RD1: 空表 → 写入爸爸 / 妈妈两条，key 正确', async () => {
    await ensureDefaultRecipients();
    const all = await db.recipients.toArray();
    expect(all.length).toBe(2);
    expect(all.find(r => r.id === 'preset-mom')?.key).toBe(MOM_KEY);
    expect(all.find(r => r.id === 'preset-dad')?.key).toBe(DAD_KEY);
  });

  it('RD2: 用户改过 key → 再次调用不被覆盖', async () => {
    await ensureDefaultRecipients();
    await db.recipients.update('preset-mom', { key: 'MY_CUSTOM_KEY' });

    await ensureDefaultRecipients(); // 重启场景

    const mom = await db.recipients.get('preset-mom');
    expect(mom?.key).toBe('MY_CUSTOM_KEY');
    expect((await db.recipients.toArray()).length).toBe(2);
  });

  it('RD3: 删掉妈妈但表非空 → 不会把妈妈补回来', async () => {
    await ensureDefaultRecipients();
    await db.recipients.delete('preset-mom');

    await ensureDefaultRecipients();

    const all = await db.recipients.toArray();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe('preset-dad');
  });

  it('RD4: 删光所有接收人 → 重新补 2 条默认', async () => {
    await ensureDefaultRecipients();
    await db.recipients.clear();

    await ensureDefaultRecipients();

    const all = await db.recipients.toArray();
    expect(all.length).toBe(2);
    expect(all.find(r => r.id === 'preset-dad')?.key).toBe(DAD_KEY);
  });
});
