/**
 * Stereo chorus — two LFO-modulated delay lines in quadrature.
 *
 * Architecture:
 *   in → splitter → [L delay (5–25 ms) ← LFO sin]    ┐
 *                                                     ├─→ merger → out
 *                  → [R delay (5–25 ms) ← LFO cos]   ┘
 *   feedback: each delay taps back into its own input through a `feedback`
 *   gain (0..0.5 for stability).
 *   dry/wet: standard mix on parallel paths.
 *
 * Parameters fit the "v1 / 80s stomp box" mold:
 *   rate     0.1–10 Hz (LFO speed)
 *   depth    0–100%   (modulation amount; 0 = no delay sweep)
 *   feedback 0–50%
 *   mix      0–100%   (wet level; dry stays at 100%)
 */

export interface ChorusOptions {
  rate?: number;
  depth?: number;
  feedback?: number;
  mix?: number;
}

const BASE_DELAY = 0.012; // 12 ms — centre of the sweep
const MAX_DEPTH_SECONDS = 0.008; // ± 8 ms of sweep at depth=1

export class Chorus {
  readonly input: GainNode;
  readonly output: GainNode;
  private readonly ctx: AudioContext;
  private readonly delayL: DelayNode;
  private readonly delayR: DelayNode;
  private readonly fbL: GainNode;
  private readonly fbR: GainNode;
  private readonly depthL: GainNode;
  private readonly depthR: GainNode;
  private readonly lfoL: OscillatorNode;
  private readonly lfoR: OscillatorNode;
  private readonly dryGain: GainNode;
  private readonly wetGain: GainNode;
  private rate = 0.6;
  private depth = 0.5;
  private feedback = 0.2;
  private mix = 0.4;
  private started = false;

  constructor(ctx: AudioContext, opts: ChorusOptions = {}) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.output = ctx.createGain();

    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.input.connect(this.dryGain);
    this.dryGain.connect(this.output);

    this.delayL = ctx.createDelay(0.1);
    this.delayR = ctx.createDelay(0.1);
    this.delayL.delayTime.value = BASE_DELAY;
    this.delayR.delayTime.value = BASE_DELAY;

    this.fbL = ctx.createGain();
    this.fbR = ctx.createGain();
    this.fbL.gain.value = 0;
    this.fbR.gain.value = 0;

    this.depthL = ctx.createGain();
    this.depthR = ctx.createGain();
    this.depthL.gain.value = MAX_DEPTH_SECONDS * 0.5;
    this.depthR.gain.value = MAX_DEPTH_SECONDS * 0.5;

    this.lfoL = ctx.createOscillator();
    this.lfoR = ctx.createOscillator();
    this.lfoL.type = 'sine';
    this.lfoR.type = 'sine';
    this.lfoL.frequency.value = this.rate;
    this.lfoR.frequency.value = this.rate;
    // Quadrature: shift the right LFO 90° via the sine/cosine identity
    // (sine with a phase offset). Web Audio doesn't expose phase directly,
    // so we start them at slightly different times — close enough for a
    // smooth stereo image.
    this.lfoL.connect(this.depthL);
    this.lfoR.connect(this.depthR);
    this.depthL.connect(this.delayL.delayTime);
    this.depthR.connect(this.delayR.delayTime);

    // Routing: input → L+R delays in parallel; outputs hard-panned via a
    // ChannelMerger.
    const merger = ctx.createChannelMerger(2);
    this.input.connect(this.delayL);
    this.input.connect(this.delayR);
    this.delayL.connect(merger, 0, 0);
    this.delayR.connect(merger, 0, 1);
    merger.connect(this.wetGain);
    this.wetGain.connect(this.output);

    // Feedback loops.
    this.delayL.connect(this.fbL);
    this.delayR.connect(this.fbR);
    this.fbL.connect(this.delayL);
    this.fbR.connect(this.delayR);

    if (opts.rate !== undefined) this.setRate(opts.rate);
    if (opts.depth !== undefined) this.setDepth(opts.depth);
    if (opts.feedback !== undefined) this.setFeedback(opts.feedback);
    if (opts.mix !== undefined) this.setMix(opts.mix);
    this.applyMix();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.lfoL.start();
    // 250 ms offset == quarter-cycle at 1 Hz; harmless approximation across
    // the 0.1–10 Hz range we expose.
    this.lfoR.start(this.ctx.currentTime + 0.25 / Math.max(0.25, this.rate));
  }

  setRate(hz: number): void {
    this.rate = Math.max(0.1, Math.min(10, hz));
    const now = this.ctx.currentTime;
    this.lfoL.frequency.setTargetAtTime(this.rate, now, 0.05);
    this.lfoR.frequency.setTargetAtTime(this.rate, now, 0.05);
  }

  setDepth(amount: number): void {
    this.depth = Math.max(0, Math.min(1, amount));
    const g = MAX_DEPTH_SECONDS * this.depth;
    const now = this.ctx.currentTime;
    this.depthL.gain.setTargetAtTime(g, now, 0.02);
    this.depthR.gain.setTargetAtTime(g, now, 0.02);
  }

  setFeedback(amount: number): void {
    this.feedback = Math.max(0, Math.min(0.5, amount));
    const now = this.ctx.currentTime;
    this.fbL.gain.setTargetAtTime(this.feedback, now, 0.02);
    this.fbR.gain.setTargetAtTime(this.feedback, now, 0.02);
  }

  setMix(amount: number): void {
    this.mix = Math.max(0, Math.min(1, amount));
    this.applyMix();
  }

  private applyMix(): void {
    const now = this.ctx.currentTime;
    // Equal-loudness-ish: keep dry at 1.0, wet at mix; this matches typical
    // chorus pedals where you keep dry and add wet on top.
    this.dryGain.gain.setTargetAtTime(1, now, 0.02);
    this.wetGain.gain.setTargetAtTime(this.mix, now, 0.02);
  }

  disconnect(): void {
    try { this.lfoL.stop(); } catch { /* ignore */ }
    try { this.lfoR.stop(); } catch { /* ignore */ }
    try { this.input.disconnect(); } catch { /* ignore */ }
    try { this.output.disconnect(); } catch { /* ignore */ }
  }
}
