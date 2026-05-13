// ============================================================
// 音效系统（Web Audio 合成，无需外部文件）
// R2.1: 加入 3 套音效包 default / cartoon / minimal
// - default: 电子合成（R1 原配置）
// - cartoon: 明亮卡通风（高频 + 三角波）
// - minimal: 短促 click，主要为不打扰
// ============================================================

export type SoundEffect =
  | 'tap' | 'kill' | 'unlock' | 'error' | 'fanfare' | 'undo';

export type SoundPack = 'default' | 'cartoon' | 'minimal';

interface SoundConfig {
  freq: number | number[];
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const PACKS: Record<SoundPack, Record<SoundEffect, SoundConfig>> = {
  default: {
    tap:     { freq: 880, duration: 0.05, type: 'sine', gain: 0.15 },
    kill:    { freq: [440, 660, 880, 1320], duration: 0.35, type: 'square', gain: 0.2 },
    unlock:  { freq: [523, 659, 784, 1046], duration: 0.5, type: 'sine', gain: 0.25 },
    error:   { freq: 220, duration: 0.18, type: 'sawtooth', gain: 0.18 },
    fanfare: { freq: [523, 587, 659, 783, 1046], duration: 0.7, type: 'triangle', gain: 0.3 },
    undo:    { freq: [440, 330], duration: 0.2, type: 'sine', gain: 0.15 },
  },
  cartoon: {
    tap:     { freq: 1320, duration: 0.04, type: 'triangle', gain: 0.18 },
    kill:    { freq: [659, 880, 1175, 1568], duration: 0.4, type: 'triangle', gain: 0.22 },
    unlock:  { freq: [659, 880, 1046, 1318, 1760], duration: 0.55, type: 'triangle', gain: 0.28 },
    error:   { freq: [330, 247], duration: 0.18, type: 'triangle', gain: 0.18 },
    fanfare: { freq: [659, 784, 988, 1175, 1568], duration: 0.75, type: 'triangle', gain: 0.32 },
    undo:    { freq: [880, 587], duration: 0.18, type: 'triangle', gain: 0.16 },
  },
  minimal: {
    tap:     { freq: 1000, duration: 0.03, type: 'sine', gain: 0.08 },
    kill:    { freq: [600, 900], duration: 0.15, type: 'sine', gain: 0.1 },
    unlock:  { freq: [800, 1000], duration: 0.18, type: 'sine', gain: 0.12 },
    error:   { freq: 200, duration: 0.1, type: 'sine', gain: 0.1 },
    fanfare: { freq: [800, 1000, 1200], duration: 0.25, type: 'sine', gain: 0.12 },
    undo:    { freq: [600, 400], duration: 0.12, type: 'sine', gain: 0.08 },
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterVolume = 1.0;
  private pack: SoundPack = 'default';

  setEnabled(on: boolean) { this.enabled = on; }
  isEnabled(): boolean { return this.enabled; }
  setPack(pack: SoundPack) { this.pack = pack; }
  getPack(): SoundPack { return this.pack; }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    try { this.ctx = new Ctx(); return this.ctx; } catch { return null; }
  }

  play(effect: SoundEffect): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const cfg = PACKS[this.pack][effect];
    const freqs = Array.isArray(cfg.freq) ? cfg.freq : [cfg.freq];
    const now = ctx.currentTime;
    const stepDur = cfg.duration / freqs.length;
    const baseGain = (cfg.gain ?? 0.2) * this.masterVolume;

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cfg.type ?? 'sine';
      osc.frequency.setValueAtTime(f, now + i * stepDur);
      gain.gain.setValueAtTime(0, now + i * stepDur);
      gain.gain.linearRampToValueAtTime(baseGain, now + i * stepDur + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * stepDur + stepDur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * stepDur);
      osc.stop(now + i * stepDur + stepDur + 0.01);
    });
  }
}

export const sounds = new SoundEngine();

/**
 * 从 settings 同步开关 + 声音包
 */
export function syncFromSettings(soundEnabled: boolean | undefined, pack?: SoundPack) {
  sounds.setEnabled(soundEnabled !== false);
  if (pack) sounds.setPack(pack);
}

export const SOUND_PACK_LABELS: Record<SoundPack, string> = {
  default: '电子合成（默认）',
  cartoon: '卡通明亮',
  minimal: '极简静音',
};
