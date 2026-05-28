/**
 * FX bus — orchestrates the post-voice chain:
 *
 *   voices → [chorus] → [plate reverb] → [tape delay] → master
 *
 * Each effect has an independent bypass and its own parameter block. State
 * is serialisable so it can live inside a Preset and round-trip through the
 * .mm-bank cassette export. The bus owns construction/disposal of the three
 * effect units — the Synth just wires its voice bus to `input` and consumes
 * `output`.
 */

import { Chorus } from './chorus';
import { PlateReverb, type PlateSize } from './plate-reverb';
import { TapeDelay } from './tape-delay';

export interface ChorusState {
  enabled: boolean;
  rate: number;
  depth: number;
  feedback: number;
  mix: number;
}

export interface ReverbState {
  enabled: boolean;
  size: PlateSize;
  damping: number;
  mix: number;
}

export interface DelayState {
  enabled: boolean;
  time: number;
  feedback: number;
  tone: number;
  mix: number;
  pingPong: boolean;
  syncBpm: boolean;
}

export interface FxBusState {
  chorus: ChorusState;
  reverb: ReverbState;
  delay: DelayState;
}

export const DEFAULT_FX_STATE: FxBusState = {
  chorus: { enabled: false, rate: 0.6, depth: 0.5, feedback: 0.2, mix: 0.4 },
  reverb: { enabled: false, size: 1, damping: 0.5, mix: 0.3 },
  delay: {
    enabled: false,
    time: 0.35,
    feedback: 0.35,
    tone: 4000,
    mix: 0.25,
    pingPong: false,
    syncBpm: false,
  },
};

export function cloneFxState(s: FxBusState): FxBusState {
  return {
    chorus: { ...s.chorus },
    reverb: { ...s.reverb },
    delay: { ...s.delay },
  };
}

/** Insert/remove an effect from a chain based on the enabled flag. */
function connectIfEnabled(node: AudioNode, enabled: boolean, to: AudioNode): void {
  // Web Audio doesn't have an "insert" — we always wire `node`'s output to
  // `to` and the bypass happens by routing the input around the node. The
  // FxBus rebuilds the chain when state changes.
  if (enabled) node.connect(to);
}

export class FxBus {
  readonly input: GainNode;
  readonly output: GainNode;
  private chorus: Chorus;
  private reverb: PlateReverb;
  private delay: TapeDelay;
  private state: FxBusState = cloneFxState(DEFAULT_FX_STATE);

  constructor(ctx: AudioContext) {
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.chorus = new Chorus(ctx);
    this.reverb = new PlateReverb(ctx);
    this.delay = new TapeDelay(ctx);
    this.chorus.start();
    this.delay.start();
    this.rebuildChain();
  }

  applyState(state: FxBusState | undefined): void {
    if (!state) return;
    this.state = cloneFxState(state);
    // Push parameters into each unit (bypass aside, values always update).
    this.chorus.setRate(state.chorus.rate);
    this.chorus.setDepth(state.chorus.depth);
    this.chorus.setFeedback(state.chorus.feedback);
    this.chorus.setMix(state.chorus.mix);
    this.reverb.setSize(state.reverb.size);
    this.reverb.setDamping(state.reverb.damping);
    this.reverb.setMix(state.reverb.mix);
    this.delay.setTime(state.delay.time);
    this.delay.setFeedback(state.delay.feedback);
    this.delay.setTone(state.delay.tone);
    this.delay.setMix(state.delay.mix);
    this.delay.setPingPong(state.delay.pingPong);
    this.rebuildChain();
  }

  getState(): FxBusState {
    return cloneFxState(this.state);
  }

  /** Sync delay time to a quarter at the given BPM (used by Step 7 clock-out). */
  setBpm(bpm: number): void {
    if (this.state.delay.syncBpm) {
      const secondsPerQuarter = 60 / Math.max(30, Math.min(300, bpm));
      this.delay.setTime(secondsPerQuarter);
      this.state.delay.time = secondsPerQuarter;
    }
  }

  private rebuildChain(): void {
    // Tear down: disconnect input + all unit outputs.
    try { this.input.disconnect(); } catch { /* ignore */ }
    try { this.chorus.output.disconnect(); } catch { /* ignore */ }
    try { this.reverb.output.disconnect(); } catch { /* ignore */ }
    try { this.delay.output.disconnect(); } catch { /* ignore */ }

    // Build a chain skipping disabled units. Conceptually the input flows
    // through the enabled units in order, and the last enabled unit's
    // output reaches `this.output`. If nothing is enabled, input → output
    // directly.
    let cursor: AudioNode = this.input;
    if (this.state.chorus.enabled) {
      cursor.connect(this.chorus.input);
      cursor = this.chorus.output;
    }
    if (this.state.reverb.enabled) {
      cursor.connect(this.reverb.input);
      cursor = this.reverb.output;
    }
    if (this.state.delay.enabled) {
      cursor.connect(this.delay.input);
      cursor = this.delay.output;
    }
    cursor.connect(this.output);
    void connectIfEnabled;
  }

  destroy(): void {
    this.chorus.disconnect();
    this.reverb.disconnect();
    this.delay.disconnect();
    try { this.input.disconnect(); } catch { /* ignore */ }
    try { this.output.disconnect(); } catch { /* ignore */ }
  }
}
