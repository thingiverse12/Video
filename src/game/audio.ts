import { BackgroundMusic } from './music';

// Locally synthesized sound effects and an independent instrumental music bus.
// Both are opt-in; creating the game never starts an AudioContext.
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private motor: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private music: BackgroundMusic | null = null;
  private musicVolume = .3;
  private dialogueOpen = false;
  private disposed = false;
  private visibilityChanged = () => {
    if (!this.context || this.disposed) return;
    if (document.hidden) this.context.suspend().catch(() => undefined);
    else if (this.enabled || this.music?.enabled) this.context.resume().catch(() => undefined);
  };
  enabled = false;
  volume = 0.45;

  private init() {
    if (this.context) return;
    this.context = new AudioContext();
    document.addEventListener('visibilitychange', this.visibilityChanged);
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.context.destination);
    const size = this.context.sampleRate * 3;
    const buffer = this.context.createBuffer(1, size, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < size; i++) {
      last = (last + (Math.random() * 2 - 1) * 0.035) / 1.025;
      data[i] = last;
    }
    const wind = this.context.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const windGain = this.context.createGain();
    windGain.gain.value = 0.26;
    wind.connect(windGain).connect(this.master);
    wind.start();
    this.motor = this.context.createOscillator();
    this.motor.type = 'sawtooth';
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    this.motorGain = this.context.createGain();
    this.motorGain.gain.value = 0;
    this.motor.connect(filter).connect(this.motorGain).connect(this.master);
    this.motor.start();
  }

  toggle(force?: boolean) {
    this.enabled = force ?? !this.enabled;
    if (this.enabled) {
      this.init();
      this.context?.resume().catch(() => undefined);
    }
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, this.context.currentTime, 0.1);
    return this.enabled;
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.enabled ? value : 0, this.context.currentTime, 0.1);
  }

  toggleMusic(onError: () => void) {
    const enabled = !(this.music?.enabled ?? false);
    if (enabled) this.init();
    if (!this.context) return false;
    if (!this.music) {
      this.music = new BackgroundMusic(this.context, onError);
      this.music.setVolume(this.musicVolume);
      this.music.setDucked(this.dialogueOpen);
    }
    this.music.setEnabled(enabled);
    if (enabled) this.context.resume().catch(() => {
      if (this.disposed) return;
      this.music?.setEnabled(false);
      onError();
    });
    return enabled;
  }

  setMusicVolume(value: number) {
    this.musicVolume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    this.music?.setVolume(this.musicVolume);
  }

  setDialogueOpen(open: boolean) {
    this.dialogueOpen = open;
    this.music?.setDucked(open);
  }

  engine(speed: number, running: boolean) {
    if (!this.context || !this.motor || !this.motorGain) return;
    this.motor.frequency.setTargetAtTime(35 + Math.abs(speed) * 5, this.context.currentTime, 0.1);
    this.motorGain.gain.setTargetAtTime(running ? 0.07 : 0, this.context.currentTime, 0.15);
  }

  tone(frequency: number, duration = 0.1, type: OscillatorType = 'sine', gain = 0.18, endFrequency?: number) {
    if (!this.enabled || !this.context || !this.master) return;
    const at = this.context.currentTime;
    const osc = this.context.createOscillator();
    const vol = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, at);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    vol.gain.setValueAtTime(0, at);
    vol.gain.linearRampToValueAtTime(gain, at + 0.012);
    vol.gain.exponentialRampToValueAtTime(0.001, at + duration);
    osc.connect(vol).connect(this.master);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  play(kind: 'hit' | 'coin' | 'horn' | 'click' | 'bird' | 'hunt' | 'warning' | 'step') {
    if (kind === 'hit') this.tone(170, 0.13, 'triangle', 0.3, 45);
    if (kind === 'coin') { this.tone(660, 0.15, 'sine', 0.12); window.setTimeout(() => this.tone(990, 0.2, 'sine', 0.1), 110); }
    if (kind === 'horn') { this.tone(220, 0.45, 'sawtooth', 0.12); this.tone(277, 0.45, 'sawtooth', 0.1); }
    if (kind === 'click') this.tone(430, 0.06, 'sine', 0.12);
    if (kind === 'bird') { this.tone(1900, 0.09, 'sine', 0.045, 2600); window.setTimeout(() => this.tone(2500, 0.12, 'sine', 0.025, 1800), 160); }
    if (kind === 'hunt') this.tone(120, 0.2, 'sawtooth', 0.2, 25);
    if (kind === 'warning') { this.tone(350, 0.18, 'triangle', 0.18); window.setTimeout(() => this.tone(280, 0.3, 'triangle', 0.18), 180); }
    if (kind === 'step') this.tone(65 + Math.random() * 25, 0.04, 'triangle', 0.06, 25);
  }

  dispose() {
    this.disposed = true;
    document.removeEventListener('visibilitychange', this.visibilityChanged);
    this.music?.dispose(); this.music = null;
    this.context?.close().catch(() => undefined);
  }
}
