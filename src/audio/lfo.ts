/**
 * Global Low-Frequency Oscillator. Single instance per Synth — connects to
 * each Voice via its own per-destination GainNode. Waveshapes:
 *   TRI / SAW+ / SAW− / SQR  → native OscillatorNode (with inverted gain for SAW−)
 *   S&H                       → ConstantSourceNode whose `.offset` is randomised
 *                              by a JS timer at the LFO rate.
 *
 * Output is in [-1, +1]. Consumers wrap it in a gain stage that scales to
 * the destination's natural units (cents for freq, Hz for filter cutoff).
 *
 * NOTE: PW modulation destinations land alongside the true PWM oscillator
 * worklet (Step 15). For now the LFO ignores `pw1/pw2/pw3` dest flags.
 */

import type { LfoWave } from '../data/preset';
import { lfoRateHz } from '../data/preset-scales';

export class GlobalLfo {
  readonly ctx: AudioContext;
  /** The shared output — gain stage feeding all per-voice routing taps. */
  readonly output: GainNode;

  private osc: OscillatorNode | null = null;
  private sah: ConstantSourceNode | null = null;
  private sahTimer: number | null = null;
  private invertGain: GainNode;
  private wave: LfoWave = 'TRI';
  private rateKnob = 4;
  private started = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.invertGain = ctx.createGain();
    this.invertGain.gain.value = 1;
    this.invertGain.connect(this.output);
    this.rebuildSource();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    if (this.osc) {
      try {
        this.osc.start();
      } catch {
        /* already started */
      }
    }
    if (this.sah) {
      try {
        this.sah.start();
      } catch {
        /* already started */
      }
      this.scheduleSah();
    }
  }

  setRate(knob0to10: number): void {
    this.rateKnob = knob0to10;
    if (this.osc) this.osc.frequency.setValueAtTime(lfoRateHz(knob0to10), this.ctx.currentTime);
    if (this.sahTimer !== null) {
      window.clearInterval(this.sahTimer);
      this.scheduleSah();
    }
  }

  setWave(wave: LfoWave): void {
    if (wave === this.wave) return;
    this.wave = wave;
    this.rebuildSource();
  }

  private rebuildSource(): void {
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {
        /* ignore */
      }
      this.osc.disconnect();
      this.osc = null;
    }
    if (this.sahTimer !== null) {
      window.clearInterval(this.sahTimer);
      this.sahTimer = null;
    }
    if (this.sah) {
      try {
        this.sah.stop();
      } catch {
        /* ignore */
      }
      this.sah.disconnect();
      this.sah = null;
    }

    if (this.wave === 'S&H') {
      const cs = this.ctx.createConstantSource();
      cs.offset.value = 0;
      cs.connect(this.invertGain);
      this.sah = cs;
      this.invertGain.gain.value = 1;
      if (this.started) {
        cs.start();
        this.scheduleSah();
      }
      return;
    }

    const osc = this.ctx.createOscillator();
    osc.frequency.value = lfoRateHz(this.rateKnob);
    osc.connect(this.invertGain);
    this.invertGain.gain.value = this.wave === 'SAW-' ? -1 : 1;
    switch (this.wave) {
      case 'TRI':
        osc.type = 'triangle';
        break;
      case 'SQR':
        osc.type = 'square';
        break;
      case 'SAW+':
      case 'SAW-':
        osc.type = 'sawtooth';
        break;
    }
    this.osc = osc;
    if (this.started) {
      osc.start();
    }
  }

  private scheduleSah(): void {
    if (!this.sah) return;
    const rate = lfoRateHz(this.rateKnob);
    const intervalMs = Math.max(8, Math.round(1000 / rate));
    this.sahTimer = window.setInterval(() => {
      if (!this.sah) return;
      const v = Math.random() * 2 - 1;
      this.sah.offset.setTargetAtTime(v, this.ctx.currentTime, 0.005);
    }, intervalMs);
  }

  destroy(): void {
    if (this.sahTimer !== null) {
      window.clearInterval(this.sahTimer);
      this.sahTimer = null;
    }
    try {
      this.osc?.stop();
    } catch {
      /* ignore */
    }
    try {
      this.sah?.stop();
    } catch {
      /* ignore */
    }
    this.osc?.disconnect();
    this.sah?.disconnect();
    this.invertGain.disconnect();
    this.output.disconnect();
  }
}
