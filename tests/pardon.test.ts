// R5.1.0: 豁免券系统已删除（详见 src/lib/pardon.ts 注释）
// 原 17 个测试全部废弃，留 placeholder 避免 vitest 报"empty test file"
import { describe, it, expect } from 'vitest';

describe('pardon system removed (R5.1.0)', () => {
  it('module is now an empty stub', async () => {
    const m = await import('../src/lib/pardon');
    expect(Object.keys(m).length).toBe(0);
  });
});
