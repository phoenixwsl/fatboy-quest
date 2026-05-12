import { describe, it, expect } from 'vitest';
import { nextExtensionOffer, canShowExtensionButton } from '../src/lib/extension';

describe('nextExtensionOffer', () => {
  it('first extension is free 5 min', () => {
    const o = nextExtensionOffer(0);
    expect(o.isFree).toBe(true);
    expect(o.addMinutes).toBe(5);
    expect(o.costPoints).toBe(0);
  });
  it('second extension is still free 5 min', () => {
    const o = nextExtensionOffer(1);
    expect(o.isFree).toBe(true);
    expect(o.addMinutes).toBe(5);
  });
  it('third extension costs 10 points for 10 min', () => {
    const o = nextExtensionOffer(2);
    expect(o.isFree).toBe(false);
    expect(o.costPoints).toBe(10);
    expect(o.addMinutes).toBe(10);
  });
  it('fourth extension costs 30 points', () => {
    expect(nextExtensionOffer(3).costPoints).toBe(30);
  });
  it('fifth+ caps at 50 points', () => {
    expect(nextExtensionOffer(4).costPoints).toBe(50);
    expect(nextExtensionOffer(10).costPoints).toBe(50);
  });
});

describe('canShowExtensionButton', () => {
  const now = 1_000_000_000_000;
  it('hidden when more than 3 minutes left', () => {
    expect(canShowExtensionButton(now + 4 * 60 * 1000, now)).toBe(false);
  });
  it('shown when less than 3 minutes left', () => {
    expect(canShowExtensionButton(now + 2 * 60 * 1000, now)).toBe(true);
  });
  it('shown when overtime', () => {
    expect(canShowExtensionButton(now - 5 * 60 * 1000, now)).toBe(true);
  });
  it('respects custom window', () => {
    expect(canShowExtensionButton(now + 4 * 60 * 1000, now, 5)).toBe(true);
  });
});
