// R5.1.0: 许愿池机制已删除（v9 migration 清空 wishingPool 表）
// 此文件原 18 个测试已废弃，留一个 placeholder 避免 vitest 报"empty test file"
import { describe, it, expect } from 'vitest';

describe('wishingPool removed (R5.1.0)', () => {
  it('module is now an empty stub', async () => {
    const m = await import('../src/lib/wishingPool');
    expect(Object.keys(m).length).toBe(0);
  });
});
