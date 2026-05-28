/**
 * Tape delay — DelayNode with soft saturation and wow/flutter on the delay
 * time, optionally ping-pong stereo.
 *
 * Architecture:
 *   in → splitter → [delayL ← wow+flutter LFOs ← saturated feedback path]
 *                                                  → tone filter → out (wet)
 *   When `pingPong` is on, feedback alternates between L and R channels for
 *   the classic ping-pong rhythm.
 *
 * Wow ≈ slow musical drift; flutter ≈ fast jitter — together they sell the
 * "warm 60s tape echo" character.
 */

export interface TapeDelayOptions {
  time?: number;
  feedback?: number;
  tone?: number;
  mix?: number;
  pingPong?: boolean;
}

function makeSaturationCurve(samples = 512): Float32Array {
  const buf = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buf);
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.4);
  }
  return curve;
}

export class TapeDelay {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly ctx: AudioContext;
  private readonly delayL: DelayNode;
  private readonly delayR: DelayNode;
  private readonly fbL: GainNode;
  private readonly fbR: GainNode;
  private readonly saturationL: WaveShaperNode;
  private readonly saturationR: WaveShaperNode;
  private readonly toneL: BiquadFilterNode;
  private readonly toneR: BiquadFilterNode;
  private readonly wowLfo: OscillatorNode;
  private readonly flutterLfo: OscillatorNode;
  private readonly wowDepth: GainNode;
  private readonly flutterDepth: GainNode;
  private readonly dryGain: GainNode;
  private readonly wetGain: GainNode;
  private readonly merger: ChannelMergerNode;
  private timeSec = 0.35;
  private feedback = 0.35;
  private toneHz = 4000;
  private mix = 0.25;
  private pingPong = false;
  private fbCrossL: GainNode;
  private fbCrossR: GainNode;
  private started = false;

  constructor(ctx: AudioContext, opts: TapeDelayOptions = {}) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.delayL = ctx.createDelay(2.0);
    this.delayR = ctx.createDelay(2.0);
    this.delayL.delayTime.value = this.timeSec;
    this.delayR.delayTime.value = this.timeSec;

    this.fbL = ctx.createGain();
    this.fbR = ctx.createGain();
    this.fbL.gain.value = this.feedback;
    this.fbR.gain.value = this.feedback;

    this.fbCrossL = ctx.createGain();
    this.fbCrossR = ctx.createGain();
    this.fbCrossL.gain.value = 0;
    this.fbCrossR.gain.value = 0;

    this.saturationL = ctx.createWaveShaper();
    this.saturationR = ctx.createWaveShaper();
    this.saturationL.curve = makeSaturationCurve() as Float32Array<ArrayBuffer>;
    this.saturationR.curve = makeSaturationCurve() as Float32Array<ArrayBuffer>;

    this.toneL = ctx.createBiquadFilter();
    this.toneR = ctx.createBiquadFilter();
    this.toneL.type = 'lowpass';
    this.toneR.type = 'lowpass';
    this.toneL.frequency.value = this.toneHz;
    this.toneR.frequency.value = this.toneHz;

    this.wowLfo = ctx.createOscillator();
    this.wowLfo.frequency.value = 0.5;
    this.flutterLfo = ctx.createOscillator();
    this.flutterLfo.frequency.value = 6;
    this.wowDepth = ctx.createGain();
    this.wowDepth.gain.value = 0.0005; // 0.5 ms
    this.flutterDepth = ctx.createGain();
    this.flutterDepth.gain.value = 0.0001; // 0.1 ms

    this.wowLfo.connect(this.wowDepth);
    this.flutterLfo.connect(this.flutterDepth);
    this.wowDepth.connect(this.delayL.delayTime);
    this.wowDepth.connect(this.delayR.delayTime);
    this.flutterDepth.connect(this.delayL.delayTime);
    this.flutterDepth.connect(this.delayR.delayTime);

    // Routing.
    this.input.connect(this.delayL);
    this.input.connect(this.delayR);
    // Feedback path: delay → saturation → tone → back to delay input (direct),
    // optionally cross-connected for ping-pong.
    this.delayL.connect(this.saturationL).connect(this.toneL);
    this.delayR.connect(this.saturationR).connect(this.toneR);
    this.toneL.connect(this.fbL).connect(this.delayL);
    this.toneR.connect(this.fbR).connect(this.delayR);
    this.toneL.connect(this.fbCrossL).connect(this.delayR);
    this.toneR.connect(this.fbCrossR).connect(this.delayL);

    this.merger = ctx.createChannelMerger(2);
    this.toneL.connect(this.merger, 0, 0);
    this.toneR.connect(this.merger, 0, 1);
    this.merger.connect(this.wetGain).connect(this.output);

    if (opts.time !== undefined) this.setTime(opts.time);
    if (opts.feedback !== undefined) this.setFeedback(opts.feedback);
    if (opts.tone !== undefined) this.setTone(opts.tone);
    if (opts.mix !== undefined) this.setMix(opts.mix);
    if (opts.pingPong !== undefined) this.setPingPong(opts.pingPong);
    this.applyMix();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.wowLfo.start();
    this.flutterLfo.start();
  }

  setTime(seconds: number): void {
    this.timeSec = Math.max(0.05, Math.min(1.5, seconds));
    const now = this.ctx.currentTime;
    this.delayL.delayTime.setTargetAtTime(this.timeSec, now, 0.05);
    this.delayR.delayTime.setTargetAtTime(this.timeSec, now, 0.05);
  }

  setFeedback(amount: number): void {
    this.feedback = Math.max(0, Math.min(0.95, amount));
    const now = this.ctx.currentTime;
    if (this.pingPong) {
      this.fbL.gain.setTargetAtTime(0, now, 0.02);
      this.fbR.gain.setTargetAtTime(0, now, 0.02);
      this.fbCrossL.gain.setTargetAtTime(this.feedback, now, 0.02);
      this.fbCrossR.gain.setTargetAtTime(this.feedback, now, 0.02);
    } else {
      this.fbL.gain.setTargetAtTime(this.feedback, now, 0.02);
      this.fbR.gain.setTargetAtTime(this.feedback, now, 0.02);
      this.fbCrossL.gain.setTargetAtTime(0, now, 0.02);
      this.fbCrossR.gain.setTargetAtTime(0, now, 0.02);
    }
  }

  setTone(hz: number): void {
    this.toneHz = Math.max(800, Math.min(12000, hz));
    const now = this.ctx.currentTime;
    this.toneL.frequency.setTargetAtTime(this.toneHz, now, 0.05);
    this.toneR.frequency.setTargetAtTime(this.toneHz, now, 0.05);
  }

  setMix(amount: number): void {
    this.mix = Math.max(0, Math.min(1, amount));
    this.applyMix();
  }

  setPingPong(on: boolean): void {
    this.pingPong = on;
    this.setFeedback(this.feedback); // re-route
  }

  private applyMix(): void {
    const now = this.ctx.currentTime;
    this.dryGain.gain.setTargetAtTime(1, now, 0.02);
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.02);
  }

  disconnect(): void {
    try { this.wowLfo.stop(); } catch { /* ignore */ }
    try { this.flutterLfo.stop(); } catch { /* ignore */ }
    try { this.input.disconnect(); } catch { /* ignore */ }
    try { this.output.disconnect(); } catch { /* ignore */ }
  }
}
