// ============================================================
// 音效系统（Web Audio 合成，无需外部文件）
// 用 oscillator + gain envelope 合成几个反馈音
// 通过 setEnabled(false) 静音
// ============================================================

export type SoundEffect =
  | 'tap'        // 轻触反馈
  | 'kill'       // 击败小怪（击杀）
  | 'unlock'     // 解锁/升级
  | 'error'      // 错误/无效操作
  | 'fanfare'    // 一轮完成 / 里程碑
  | 'undo';      // 撤回

interface SoundConfig {
  freq: number | number[];   // Hz, 数组 = 序列
  duration: number;          // 秒
  type?: OscillatorType;     // sine/square/triangle/sawtooth
  gain?: number;             // 音量 0-1
  decay?: number;            // 衰减系数
}

const PRESETS: Record<SoundEffect, SoundConfig> = {
  tap:     { freq: 880, duration: 0.05, type: 'sine', gain: 0.15 },
  kill:    { freq: [440, 660, 880, 1320], duration: 0.35, type: 'square', gain: 0.2 },
  unlock:  { freq: [523, 659, 784, 1046], duration: 0.5, type: 'sine', gain: 0.25 }, // C-E-G-C 八度
  error:   { freq: 220, duration: 0.18, type: 'sawtooth', gain: 0.18 },
  fanfare: { freq: [523, 587, 659, 783, 1046], duration: 0.7, type: 'triangle', gain: 0.3 },
  undo:    { freq: [440, 330], duration: 0.2, type: 'sine', gain: 0.15 },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterVolume = 1.0;

  /**
   * 设置开关（持久化由调用方负责）
   */
  setEnabled(on: boolean) {
    this.enabled = on;
  }
  isEnabled(): boolean { return this.enabled; }

  /**
   * 必须在第一次 user gesture 后初始化 AudioContext
   * （浏览器策略：autoplay 限制）
   */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) return this.ctx;
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    try {
      this.ctx = new Ctx();
      return this.ctx;
    } catch {
      return null;
    }
  }

  play(effect: SoundEffect): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    // 恢复挂起的 context（iOS Safari 经常这样）
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const cfg = PRESETS[effect];
    const freqs = Array.isArray(cfg.freq) ? cfg.freq : [cfg.freq];
    const now = ctx.currentTime;
    const stepDur = cfg.duration / freqs.length;
    const baseGain = (cfg.gain ?? 0.2) * this.masterVolume;

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cfg.type ?? 'sine';
      osc.frequency.setValueAtTime(f, now + i * stepDur);
      // 包络：快速 attack + 指数衰减，避免咔哒声
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
 * 静默工具：从 settings 同步开关状态
 */
export function syncFromSettings(soundEnabled: boolean | undefined) {
  sounds.setEnabled(soundEnabled !== false);
}
