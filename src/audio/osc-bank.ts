/**
 * Oscillator bank — wraps the mix of native (`OscillatorNode`) and worklet-based
 * (`PwmOscillator`) sources that make up a single Memorymoog oscillator layer.
 *
 * One per layer (OSC1, OSC2, OSC3). The voice asks the bank to:
 *   - start/stop all underlying sources at a given audio time,
 *   - set detune in cents (pitch bend, fine tuning),
 *   - tap an LFO bus into pitch modulation (in cents),
 *   - set pulse width (0..1) on the PWM source,
 *   - tap an LFO bus into pulse-width modulation,
 *   - hard-sync slave the PWM source to a master's zero crossings.
 *
 * The bank chooses internally whether to use the PWM worklet (when 'pulse'
 * is in the active wave blend and the worklet is registered) or a native
 * 'square' OscillatorNode (fallback).
 */

import type { WaveBlend } from '../data/preset';
import { isPwmOscillatorRegistered, createPwmOscillator, type PwmOscillator } from './pwm-oscillator';

const WAVE_ORDER: Array<keyof WaveBlend> = ['pulse', 'saw', 'tri'];

function pickActiveWaves(blend: WaveBlend): Array<keyof WaveBlend> {
  const active: Array<keyof WaveBlend> = [];
  for (const w of WAVE_ORDER) if (blend[w]) active.push(w);
  if (active.length === 0) active.push('saw'); // failsafe — silent voices waste a slot
  return active;
}

export interface OscBankConfig {
  ctx: AudioContext;
  destination: GainNode;
  baseHz: number;
  blend: WaveBlend;
  initialPulseWidth: number; // 0..1 (duty cycle)
  initialDetuneCents: number;
}

export class OscBank {
  readonly ctx: AudioContext;
  readonly baseHz: number;
  private readonly destination: GainNode;
  private readonly sumGain: GainNode;
  private readonly oscNodes: OscillatorNode[] = [];
  private readonly pwmNodes: PwmOscillator[] = [];
  private readonly squareFallbacks: OscillatorNode[] = [];
  private readonly taps: AudioNode[] = [];
  private detuneCents: number;
  private pulseWidth: number;

  constructor(cfg: OscBankConfig) {
    this.ctx = cfg.ctx;
    this.baseHz = cfg.baseHz;
    this.destination = cfg.destination;
    this.detuneCents = cfg.initialDetuneCents;
    this.pulseWidth = Math.max(0.02, Math.min(0.98, cfg.initialPulseWidth));

    const waves = pickActiveWaves(cfg.blend);
    this.sumGain = cfg.ctx.createGain();
    this.sumGain.gain.value = 1 / Math.max(1, waves.length);
    this.sumGain.connect(cfg.destination);

    const pwmAvailable = isPwmOscillatorRegistered();

    for (const w of waves) {
      if (w === 'pulse' && pwmAvailable) {
        const pwm = createPwmOscillator(cfg.ctx);
        pwm.frequency.setValueAtTime(this.baseHz * Math.pow(2, this.detuneCents / 1200), cfg.ctx.currentTime);
        pwm.pulseWidth.setValueAtTime(this.pulseWidth, cfg.ctx.currentTime);
        pwm.node.connect(this.sumGain);
        this.pwmNodes.push(pwm);
      } else if (w === 'pulse') {
        // Worklet not registered — fall back to a fixed-50% square so users
        // still hear *something*. PWM modulation is silently ignored here.
        const osc = cfg.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = this.baseHz;
        osc.detune.value = this.detuneCents;
        osc.connect(this.sumGain);
        this.oscNodes.push(osc);
        this.squareFallbacks.push(osc);
      } else {
        const osc = cfg.ctx.createOscillator();
        osc.type = w === 'saw' ? 'sawtooth' : 'triangle';
        osc.frequency.value = this.baseHz;
        osc.detune.value = this.detuneCents;
        osc.connect(this.sumGain);
        this.oscNodes.push(osc);
      }
    }
  }

  hasPwm(): boolean {
    return this.pwmNodes.length > 0;
  }

  /** Direct access for sync wiring (Step 2). */
  get pwmOscillators(): readonly PwmOscillator[] {
    return this.pwmNodes;
  }

  setDetuneCents(cents: number): void {
    this.detuneCents = cents;
    for (const n of this.oscNodes) n.detune.setValueAtTime(cents, this.ctx.currentTime);
    for (const p of this.pwmNodes) {
      const target = this.baseHz * Math.pow(2, cents / 1200);
      p.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.005);
    }
  }

  /** Add an LFO modulation source to the bank's pitch (in cents). Returns the tap node. */
  tapPitchModulation(lfoBus: AudioNode, depthCents: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = depthCents;
    lfoBus.connect(g);
    for (const n of this.oscNodes) g.connect(n.detune);
    // For PWM: cents -> Hz delta scaled by baseHz * ln(2)/1200 (linear approx, accurate for small depths).
    if (this.pwmNodes.length > 0) {
      const hzScale = this.baseHz * Math.LN2 / 1200;
      const conv = this.ctx.createGain();
      conv.gain.value = hzScale;
      g.connect(conv);
      for (const p of this.pwmNodes) conv.connect(p.frequency);
      this.taps.push(conv);
    }
    this.taps.push(g);
    return g;
  }

  setPulseWidth(duty: number): void {
    const v = Math.max(0.02, Math.min(0.98, duty));
    this.pulseWidth = v;
    for (const p of this.pwmNodes) p.pulseWidth.setTargetAtTime(v, this.ctx.currentTime, 0.005);
  }

  /** LFO modulation of pulse width. Depth is in duty cycle units (e.g. 0.3 = ±0.3). */
  tapPulseWidthModulation(lfoBus: AudioNode, depthDuty: number): GainNode | null {
    if (this.pwmNodes.length === 0) return null;
    const g = this.ctx.createGain();
    g.gain.value = depthDuty;
    lfoBus.connect(g);
    for (const p of this.pwmNodes) g.connect(p.pulseWidth);
    this.taps.push(g);
    return g;
  }

  start(at: number): void {
    for (const n of this.oscNodes) {
      try {
        n.start(at);
      } catch {
        /* already started */
      }
    }
    for (const p of this.pwmNodes) p.start(at);
  }

  stop(at: number): void {
    for (const n of this.oscNodes) {
      try {
        n.stop(at);
      } catch {
        /* already scheduled */
      }
    }
    for (const p of this.pwmNodes) p.stop(at);
  }

  disconnect(): void {
    for (const tap of this.taps) {
      try {
        tap.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.taps.length = 0;
    try {
      this.sumGain.disconnect();
    } catch {
      /* ignore */
    }
    for (const p of this.pwmNodes) p.disconnect();
    for (const n of this.oscNodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    void this.destination;
  }
}
