import { describe, it, expect } from 'vitest';
import { scoreRatio, ratioColorClass } from '../src/lib/points';

describe('scoreRatio', () => {
  it('returns 0 for zero base', () => {
    expect(scoreRatio(0, 20)).toBe(0);
  });
  it('returns 100 for actual == base', () => {
    expect(scoreRatio(20, 20)).toBe(100);
  });
  it('caps theoretical max around 120 for perfect 5/5/5', () => {
    // 5/5/5 → base × 1.0 × 1.2 = 1.2x
    expect(scoreRatio(20, 24)).toBe(120);
  });
  it('exceeds 100 when bonus added', () => {
    expect(scoreRatio(20, 24, 6)).toBe(150); // (24+6)/20 = 1.5
  });
  it('drops below 100 for poor evaluation', () => {
    expect(scoreRatio(20, 10)).toBe(50);
  });
  it('rounds to integer', () => {
    expect(Number.isInteger(scoreRatio(7, 5))).toBe(true);
  });
});

describe('ratioColorClass', () => {
  it('< 60 → 红', () => {
    expect(ratioColorClass(0)).toContain('rose');
    expect(ratioColorClass(59)).toContain('rose');
  });
  it('60-89 → 黄', () => {
    expect(ratioColorClass(60)).toContain('yellow');
    expect(ratioColorClass(89)).toContain('yellow');
  });
  it('90-109 → 绿', () => {
    expect(ratioColorClass(90)).toContain('emerald');
    expect(ratioColorClass(100)).toContain('emerald');
    expect(ratioColorClass(109)).toContain('emerald');
  });
  it('110-129 → 蓝', () => {
    expect(ratioColorClass(110)).toContain('sky');
    expect(ratioColorClass(129)).toContain('sky');
  });
  it('>= 130 → 金', () => {
    expect(ratioColorClass(130)).toContain('amber');
    expect(ratioColorClass(200)).toContain('amber');
  });
});
