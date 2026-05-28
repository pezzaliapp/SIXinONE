/**
 * Plate reverb — convolution against a procedurally generated plate IR.
 *
 * The IR is the sum of a few exponentially decaying noise tails (left/right,
 * pre-delayed and pre-filtered), so the result has the dense, bright,
 * fast-attack character of a 1970s/80s plate (EMT-140 inspired). No external
 * asset, no licensing footprint, no network fetch.
 *
 * Sizes:
 *   0 = small  (~1.0 s decay)
 *   1 = medium (~2.5 s decay)
 *   2 = large  (~5.0 s decay)
 *
 * damping controls the cutoff of a post-convolution lowpass that simulates
 * the absorption of the higher partials over time.
 */

export type PlateSize = 0 | 1 | 2;

export interface PlateReverbOptions {
  size?: PlateSize;
  damping?: number;
  mix?: number;
}

function generatePlateIr(ctx: BaseAudioContext, decaySeconds: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * decaySeconds);
  const buf = ctx.createBuffer(2, length, sampleRate);
  const exp = 6.0;
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    // Three "diffusion taps" at slightly different delays per channel — they
    // sum to mimic the dense early-reflection field of a plate.
    const taps = [
      { delay: 0.005 * (ch === 0 ? 1 : 1.27), gain: 1 },
      { delay: 0.013 * (ch === 0 ? 1.08 : 1), gain: 0.7 },
      { delay: 0.027 * (ch === 0 ? 1 : 1.14), gain: 0.5 },
    ];
    for (let i = 0; i < length; i++) {
      // Per-sample white noise — the dense room "fizz".
      const env = Math.pow(1 - i / length, exp);
      let sample = 0;
      for (const tap of taps) {
        const off = Math.floor(tap.delay * sampleRate);
        if (i >= off) sample += tap.gain * (Math.random() * 2 - 1);
      }
      data[i] = sample * env * 0.3;
    }
  }
  return buf;
}

const DECAY_BY_SIZE: Record<PlateSize, number> = { 0: 1.0, 1: 2.5, 2: 5.0 };

export class PlateReverb {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly ctx: AudioContext;
  private convolver: ConvolverNode;
  private dampingFilter: BiquadFilterNode;
  private highCut: BiquadFilterNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private size: PlateSize = 1;
  private damping = 0.5;
  private mix = 0.3;

  constructor(ctx: AudioContext, opts: PlateReverbOptions = {}) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    // Pre-filters: shape the input before convolution so the tail isn't
    // muddy at the low end (a real plate is HP'd at ~200 Hz).
    const preHighPass = ctx.createBiquadFilter();
    preHighPass.type = 'highpass';
    preHighPass.frequency.value = 200;

    this.dampingFilter = ctx.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 8000;

    this.highCut = ctx.createBiquadFilter();
    this.highCut.type = 'lowpass';
    this.highCut.frequency.value = 12000;

    this.convolver = ctx.createConvolver();
    this.convolver.normalize = true;
    this.convolver.buffer = generatePlateIr(ctx, DECAY_BY_SIZE[this.size]);

    this.input
      .connect(preHighPass)
      .connect(this.convolver)
      .connect(this.dampingFilter)
      .connect(this.highCut)
      .connect(this.wetGain)
      .connect(this.output);

    if (opts.size !== undefined) this.setSize(opts.size);
    if (opts.damping !== undefined) this.setDamping(opts.damping);
    if (opts.mix !== undefined) this.setMix(opts.mix);
    this.applyMix();
  }

  setSize(size: PlateSize): void {
    if (size === this.size) return;
    this.size = size;
    this.convolver.buffer = generatePlateIr(this.ctx, DECAY_BY_SIZE[size]);
  }

  setDamping(amount: number): void {
    this.damping = Math.max(0, Math.min(1, amount));
    // 0 = bright (12 kHz), 1 = dark (1 kHz). Log scale.
    const cutoff = 12000 * Math.pow(1 / 12, this.damping);
    this.dampingFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
  }

  setMix(amount: number): void {
    this.mix = Math.max(0, Math.min(1, amount));
    this.applyMix();
  }

  private applyMix(): void {
    const now = this.ctx.currentTime;
    this.dryGain.gain.setTargetAtTime(1, now, 0.02);
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.02);
  }

  disconnect(): void {
    try { this.input.disconnect(); } catch { /* ignore */ }
    try { this.output.disconnect(); } catch { /* ignore */ }
  }
}
