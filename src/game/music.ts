// "Myrstigen" — an original, instrumental folk-inspired waltz for this game.
// Synthesized locally: no samples, copyrighted recordings, downloads or services.
// Render once on the audio thread, then loop a single buffer. Heavy 3D frames
// cannot interrupt the rhythm, and toggling never stacks multiple tracks.
export const MUSIC = {
  title: 'Myrstigen',
  bpm: 88,
  beatsPerBar: 3,
  bars: 32,
  duration: 32 * 3 * 60 / 88,
} as const;

type Note = readonly [number, number]; // MIDI note, length in beats; 0 is a rest.
type Bar = { chord: readonly number[]; melody: readonly Note[] };
const G = [43, 55, 59, 62], Em = [40, 55, 59, 64], C = [48, 55, 60, 64];
const D = [38, 54, 57, 62], Am = [45, 57, 60, 64], Bm = [47, 54, 59, 62];
export const SCORE: readonly Bar[] = [
  { chord: G,  melody: [[71, 1], [67, .5], [69, .5], [74, 1]] },
  { chord: Em, melody: [[76, 1.5], [74, .5], [71, 1]] },
  { chord: C,  melody: [[72, .5], [71, .5], [67, 1], [69, 1]] },
  { chord: D,  melody: [[66, 1], [69, 1], [74, .75], [0, .25]] },
  { chord: G,  melody: [[71, .5], [74, .5], [79, 1], [74, 1]] },
  { chord: C,  melody: [[76, 1], [72, .5], [71, .5], [69, 1]] },
  { chord: Am, melody: [[72, 1.5], [71, .5], [69, 1]] },
  { chord: D,  melody: [[66, 1], [69, 1], [0, 1]] },
  { chord: G,  melody: [[67, .5], [71, .5], [74, 1.5], [71, .5]] },
  { chord: Bm, melody: [[69, 1], [66, .5], [69, .5], [71, 1]] },
  { chord: Em, melody: [[76, 1], [74, .5], [71, .5], [67, 1]] },
  { chord: C,  melody: [[69, .5], [72, .5], [76, 1], [72, 1]] },
  { chord: G,  melody: [[71, 1], [67, .5], [69, .5], [74, 1]] },
  { chord: D,  melody: [[72, .5], [69, .5], [66, 1], [69, 1]] },
  { chord: G,  melody: [[67, 2.5], [0, .5]] },
  { chord: D,  melody: [[0, 1], [62, 1], [66, 1]] },
  { chord: Em, melody: [[67, 1], [71, 1], [76, 1]] },
  { chord: C,  melody: [[79, 1.5], [76, .5], [72, 1]] },
  { chord: G,  melody: [[74, .5], [71, .5], [67, 1], [71, 1]] },
  { chord: D,  melody: [[69, 1.5], [66, .5], [62, 1]] },
  { chord: Em, melody: [[64, .5], [67, .5], [71, 1], [76, 1]] },
  { chord: C,  melody: [[72, 1], [76, .5], [79, .5], [76, 1]] },
  { chord: Am, melody: [[72, 1.5], [69, .5], [64, 1]] },
  { chord: D,  melody: [[66, 1], [69, .5], [72, .5], [74, 1]] },
  { chord: G,  melody: [[71, 1], [67, .5], [69, .5], [74, 1]] },
  { chord: C,  melody: [[76, 1.5], [72, .5], [69, 1]] },
  { chord: Em, melody: [[71, .5], [74, .5], [76, 1], [71, 1]] },
  { chord: D,  melody: [[69, 1], [66, .5], [69, .5], [74, 1]] },
  { chord: C,  melody: [[72, 1], [71, .5], [69, .5], [67, 1]] },
  { chord: D,  melody: [[66, .5], [69, .5], [74, 1], [69, 1]] },
  { chord: G,  melody: [[71, 1], [69, .5], [67, 1.5]] },
  { chord: G,  melody: [[67, 2], [0, 1]] },
];

let renderedLoop: Promise<AudioBuffer> | null = null;
export function renderMusicLoop(): Promise<AudioBuffer> {
  if (!renderedLoop) renderedLoop = renderScore().catch(error => { renderedLoop = null; throw error; });
  return renderedLoop;
}

async function renderScore() {
  const rate = 32000;
  const length = Math.round(MUSIC.duration * rate);
  const tail = 2;
  const ctx = new OfflineAudioContext(2, length + tail * rate, rate);
  const bus = ctx.createGain();
  bus.gain.value = .76;
  bus.connect(ctx.destination);
  // A small, warm room, shared by the whole ensemble.
  const impulse = ctx.createBuffer(2, Math.round(rate * 1.25), rate);
  let seed = 71237;
  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = (seed / 2147483648 - 1) * Math.exp(-7 * i / samples.length) * .23;
    }
  }
  const room = ctx.createConvolver();
  room.buffer = impulse;
  const wet = ctx.createGain(); wet.gain.value = .19;
  bus.connect(room).connect(wet).connect(ctx.destination);

  const flute = ctx.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, .12, .065, .02, .008]));
  const pluck = ctx.createPeriodicWave(new Float32Array(9), new Float32Array([0, 1, .37, .16, .09, .06, .035, .02, .01]));
  const beat = 60 / MUSIC.bpm;

  const note = (midi: number, at: number, duration: number, instrument: 'flute' | 'pluck' | 'bass', volume: number, pan: number) => {
    const oscillator = ctx.createOscillator();
    if (instrument === 'bass') oscillator.type = 'sine';
    else oscillator.setPeriodicWave(instrument === 'flute' ? flute : pluck);
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    const gain = ctx.createGain();
    const stereo = ctx.createStereoPanner(); stereo.pan.value = pan;
    const attack = instrument === 'flute' ? .055 : instrument === 'bass' ? .022 : .008;
    const release = instrument === 'flute' ? .14 : .3;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + attack);
    gain.gain.exponentialRampToValueAtTime(volume * (instrument === 'flute' ? .8 : .15), at + Math.max(attack + .015, duration));
    gain.gain.linearRampToValueAtTime(0, at + duration + release);
    oscillator.connect(gain).connect(stereo).connect(bus);
    if (instrument === 'flute') {
      const vibrato = ctx.createOscillator(); vibrato.frequency.value = 4.6;
      const depth = ctx.createGain(); depth.gain.setValueAtTime(0, at);
      depth.gain.linearRampToValueAtTime(6, at + .18);
      vibrato.connect(depth).connect(oscillator.detune);
      vibrato.start(at); vibrato.stop(at + duration + release);
    }
    oscillator.start(at); oscillator.stop(at + duration + release);
  };

  SCORE.forEach((bar, index) => {
    const at = index * MUSIC.beatsPerBar * beat;
    // Alternating bass and lightly staggered plucked-string arpeggios.
    note(bar.chord[0], at, beat * 1.65, 'bass', .15, -.06);
    note(bar.chord[0] + 7, at + beat * 2, beat * .67, 'bass', .07, .06);
    [0, 1, 2, 1, 2, 0].forEach((step, i) => {
      note(bar.chord[step + 1] + 12, at + i * beat / 2 + (i % 2 ? .012 : 0), beat * .7, 'pluck', i % 2 ? .042 : .066, -.3);
    });
    let cursor = at;
    bar.melody.forEach(([pitch, beats], i) => {
      if (pitch) note(pitch, cursor + .009, beats * beat * .9, 'flute', .16 + (i === 0 ? .008 : 0), .18);
      cursor += beats * beat;
    });
  });

  const rendered = await ctx.startRendering();
  const loop = ctx.createBuffer(2, length, rate);
  // Fold the reverb/release tail into the beginning: the last bar flows back
  // into the first without a silent gap or an abrupt cut at the loop boundary.
  for (let channel = 0; channel < 2; channel++) {
    const output = loop.getChannelData(channel), input = rendered.getChannelData(channel);
    output.set(input.subarray(0, length));
    for (let i = length; i < input.length; i++) output[i - length] += input[i];
  }
  return loop;
}

export class BackgroundMusic {
  private output: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private loading: Promise<void> | null = null;
  private disposed = false;
  private ducked = false;
  enabled = false;
  volume = .3;

  constructor(private context: AudioContext, private onError: () => void) {
    this.output = context.createGain();
    this.output.gain.value = 0;
    this.output.connect(context.destination);
  }

  setEnabled(enabled: boolean) {
    if (this.disposed) return;
    this.enabled = enabled;
    this.updateGain();
    if (enabled && !this.source && !this.loading) {
      this.loading = renderMusicLoop().then(buffer => {
        if (this.disposed) return;
        this.source = this.context.createBufferSource();
        this.source.buffer = buffer;
        this.source.loop = true;
        this.source.connect(this.output);
        this.source.start();
        this.updateGain();
      }).catch(() => {
        if (this.disposed) return;
        this.enabled = false;
        this.updateGain();
        this.onError();
      }).finally(() => { this.loading = null; });
    }
  }

  setVolume(volume: number) { this.volume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0)); this.updateGain(); }
  setDucked(ducked: boolean) { this.ducked = ducked; this.updateGain(); }

  private updateGain() {
    const at = this.context.currentTime;
    this.output.gain.cancelScheduledValues(at);
    this.output.gain.setTargetAtTime(this.enabled ? this.volume * (this.ducked ? .22 : 1) : 0, at, .16);
  }

  dispose() {
    this.disposed = true;
    this.enabled = false;
    this.source?.stop(); this.source?.disconnect(); this.source = null;
    this.output.disconnect();
  }
}
