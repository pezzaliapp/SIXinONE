/**
 * Filter wrapper — abstracts the lowpass behind a consistent surface so the
 * voice doesn't care whether it's running the Moog ladder AudioWorklet or
 * the BiquadFilter fallback. Both expose:
 *   - .node          the AudioNode you connect things to/from
 *   - .cutoff        AudioParam (Hz) to schedule the envelope on
 *   - .setEmphasis(0..10)  set resonance using the panel-style knob value
 *
 * The Moog worklet must be registered with `registerMoogLadder()` before
 * `createMoogFilter()` will succeed in worklet mode.
 */

import moogLadderUrl from './worklets/moog-ladder.js?url';

let registered = false;
let registerPromise: Promise<void> | null = null;

export async function registerMoogLadder(ctx: BaseAudioContext): Promise<void> {
  if (registered) return;
  if (registerPromise) return registerPromise;
  registerPromise = ctx.audioWorklet.addModule(moogLadderUrl).then(() => {
    registered = true;
  });
  return registerPromise;
}

export function isMoogLadderRegistered(): boolean {
  return registered;
}

export interface MoogFilter {
  readonly node: AudioNode;
  readonly cutoff: AudioParam;
  setEmphasis(knob0to10: number): void;
  /** Free internal AudioParams / connections (worklet has no extra teardown). */
  disconnect(): void;
}

class MoogLadderFilter implements MoogFilter {
  readonly node: AudioWorkletNode;
  readonly cutoff: AudioParam;
  private readonly resonance: AudioParam;

  constructor(ctx: AudioContext) {
    this.node = new AudioWorkletNode(ctx, 'moog-ladder', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: 'explicit',
    });
    const cutoff = this.node.parameters.get('cutoff');
    const resonance = this.node.parameters.get('resonance');
    if (!cutoff || !resonance) {
      throw new Error('moog-ladder worklet missing expected parameters');
    }
    this.cutoff = cutoff;
    this.resonance = resonance;
  }

  setEmphasis(knob: number): void {
    // 0–10 → 0..1.05. Self-oscillation kicks in around 7 on the original.
    const k = Math.max(0, Math.min(10, knob)) / 10;
    // Slight curve so the upper half ramps faster.
    const res = k <= 0.7 ? k * 0.85 : 0.6 + (k - 0.7) * 1.5;
    this.resonance.setTargetAtTime(res, this.node.context.currentTime, 0.01);
  }

  disconnect(): void {
    this.node.disconnect();
  }
}

class BiquadFilterFallback implements MoogFilter {
  readonly node: BiquadFilterNode;
  readonly cutoff: AudioParam;
  private readonly q: AudioParam;

  constructor(ctx: BaseAudioContext) {
    const b = ctx.createBiquadFilter();
    b.type = 'lowpass';
    this.node = b;
    this.cutoff = b.frequency;
    this.q = b.Q;
  }

  setEmphasis(knob: number): void {
    const k = Math.max(0, Math.min(10, knob));
    const q = k <= 7 ? 0.5 + k * 1.0 : 7.5 + (k - 7) * 4;
    this.q.setTargetAtTime(q, this.node.context.currentTime, 0.01);
  }

  disconnect(): void {
    this.node.disconnect();
  }
}

export function createMoogFilter(ctx: AudioContext): MoogFilter {
  if (registered) {
    try {
      return new MoogLadderFilter(ctx);
    } catch (err) {
      console.warn('Moog ladder filter failed, falling back to BiquadFilter', err);
    }
  }
  return new BiquadFilterFallback(ctx);
}
