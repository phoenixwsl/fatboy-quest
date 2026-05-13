// R2.5.A 单测：focusStars + 彩蛋概率
import { describe, it, expect } from 'vitest';
import { focusStarsCount, shouldGrantLuckyBonus } from '../src/lib/microRewards';

describe('focusStarsCount', () => {
  it('< 1/4 → 0 颗', () => {
    expect(focusStarsCount(0, 100)).toBe(0);
    expect(focusStarsCount(24, 100)).toBe(0);
  });
  it('[1/4, 2/4) → 1 颗', () => {
    expect(focusStarsCount(25, 100)).toBe(1);
    expect(focusStarsCount(49, 100)).toBe(1);
  });
  it('[2/4, 3/4) → 2 颗', () => {
    expect(focusStarsCount(50, 100)).toBe(2);
    expect(focusStarsCount(74, 100)).toBe(2);
  });
  it('[3/4, 1) → 3 颗', () => {
    expect(focusStarsCount(75, 100)).toBe(3);
    expect(focusStarsCount(99, 100)).toBe(3);
  });
  it('≥ 1 → 4 颗（含超时）', () => {
    expect(focusStarsCount(100, 100)).toBe(4);
    expect(focusStarsCount(500, 100)).toBe(4);
  });
  it('totalMs=0 → 0 颗（防除以 0）', () => {
    expect(focusStarsCount(50, 0)).toBe(0);
  });
});

describe('shouldGrantLuckyBonus', () => {
  it('前 3 个任务概率 20%', () => {
    // 用确定性随机源验证阈值
    expect(shouldGrantLuckyBonus(1, () => 0.19)).toBe(true);
    expect(shouldGrantLuckyBonus(1, () => 0.21)).toBe(false);
    expect(shouldGrantLuckyBonus(3, () => 0.19)).toBe(true);
    expect(shouldGrantLuckyBonus(3, () => 0.21)).toBe(false);
  });
  it('第 4 个之后概率 10%', () => {
    expect(shouldGrantLuckyBonus(4, () => 0.09)).toBe(true);
    expect(shouldGrantLuckyBonus(4, () => 0.11)).toBe(false);
    expect(shouldGrantLuckyBonus(10, () => 0.09)).toBe(true);
    expect(shouldGrantLuckyBonus(10, () => 0.11)).toBe(false);
  });
});
