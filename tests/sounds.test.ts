import { describe, it, expect, beforeEach } from 'vitest';
import { sounds, syncFromSettings } from '../src/lib/sounds';

describe('sound engine', () => {
  beforeEach(() => {
    sounds.setEnabled(true);
  });

  it('defaults to enabled', () => {
    expect(sounds.isEnabled()).toBe(true);
  });

  it('setEnabled toggles state', () => {
    sounds.setEnabled(false);
    expect(sounds.isEnabled()).toBe(false);
    sounds.setEnabled(true);
    expect(sounds.isEnabled()).toBe(true);
  });

  it('syncFromSettings(undefined) keeps default true', () => {
    sounds.setEnabled(false);
    syncFromSettings(undefined);
    expect(sounds.isEnabled()).toBe(true);
  });

  it('syncFromSettings(false) disables', () => {
    sounds.setEnabled(true);
    syncFromSettings(false);
    expect(sounds.isEnabled()).toBe(false);
  });

  it('syncFromSettings(true) enables', () => {
    sounds.setEnabled(false);
    syncFromSettings(true);
    expect(sounds.isEnabled()).toBe(true);
  });

  it('play does not throw when disabled', () => {
    sounds.setEnabled(false);
    expect(() => sounds.play('tap')).not.toThrow();
    expect(() => sounds.play('kill')).not.toThrow();
  });

  it('play does not throw with no AudioContext (jsdom)', () => {
    // jsdom doesn't provide AudioContext; sounds should fail silently
    sounds.setEnabled(true);
    expect(() => sounds.play('kill')).not.toThrow();
    expect(() => sounds.play('fanfare')).not.toThrow();
    expect(() => sounds.play('undo')).not.toThrow();
  });
});
