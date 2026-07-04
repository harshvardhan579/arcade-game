type Cue = 'select' | 'score' | 'hit' | 'game-over';

const cueMap: Record<Cue, { frequency: number; duration: number; type: OscillatorType }> = {
  select: { frequency: 440, duration: 0.07, type: 'square' },
  score: { frequency: 720, duration: 0.11, type: 'triangle' },
  hit: { frequency: 150, duration: 0.13, type: 'sawtooth' },
  'game-over': { frequency: 92, duration: 0.28, type: 'sine' }
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private unlocked = false;

  attachUnlockListeners(): void {
    const unlock = () => {
      void this.ensureContext();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  async ensureContext(): Promise<void> {
    if (this.unlocked) return;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.context = this.context ?? new Ctor();
      if (this.context.state === 'suspended') await this.context.resume();
      this.unlocked = true;
    } catch {
      this.context = null;
    }
  }

  play(cue: Cue): void {
    if (!this.context || !this.unlocked) return;
    try {
      const now = this.context.currentTime;
      const spec = cueMap[cue];
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
      osc.connect(gain);
      gain.connect(this.context.destination);
      osc.start(now);
      osc.stop(now + spec.duration + 0.02);
    } catch {
      this.context = null;
      this.unlocked = false;
    }
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
