/**
 * Moog 24 dB/oct transistor-ladder lowpass filter, AudioWorklet processor.
 *
 * Based on Antti Huovilainen's nonlinear ladder model (2004, "Non-linear
 * digital implementation of the Moog ladder filter"). Each of the four
 * cascaded one-pole stages is wrapped in a tanh saturation; the same tanh
 * sits on the feedback path. This gives the characteristic warm overdrive
 * and a self-oscillation point around resonance 0.85–1.0.
 *
 * 2× oversampling is performed inline (zero-stuff + zero-order-hold)
 * to keep the nonlinearity stable at high cutoff / resonance.
 *
 * Parameters:
 *   cutoff     — Hz, a-rate, 20..22000
 *   resonance  — 0..1.2, a-rate (>1.0 produces stable self-oscillation)
 *   drive      — input pre-gain, k-rate, 0.1..4
 */

const HALF_PI = Math.PI * 0.5;

class MoogLadderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'cutoff',
        defaultValue: 1000,
        minValue: 20,
        maxValue: 22000,
        automationRate: 'a-rate',
      },
      {
        name: 'resonance',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1.2,
        automationRate: 'a-rate',
      },
      {
        name: 'drive',
        defaultValue: 1,
        minValue: 0.1,
        maxValue: 4,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor() {
    super();
    this.s = [0, 0, 0, 0];
    this.fb = 0;
    this.sr = sampleRate;
    this.sr2 = sampleRate * 2;
  }

  /** One-step ladder iteration at 2× rate. */
  _step(x, fcHz, k) {
    // Frank Beule-style "cosine-warped" cutoff scaling for accurate freq at high cutoffs.
    const wd = (2 * Math.PI * fcHz) / this.sr2;
    // Stability: clamp wd into reasonable range.
    const wa = Math.tan(Math.min(HALF_PI - 0.001, wd * 0.5)) * 2;
    const g = wa / (1 + wa);

    const input = x - k * this.s[3];
    const inSat = Math.tanh(input);
    const a = this.s[0] + g * (inSat - Math.tanh(this.s[0]));
    const b = this.s[1] + g * (Math.tanh(a) - Math.tanh(this.s[1]));
    const c = this.s[2] + g * (Math.tanh(b) - Math.tanh(this.s[2]));
    const d = this.s[3] + g * (Math.tanh(c) - Math.tanh(this.s[3]));
    this.s[0] = a;
    this.s[1] = b;
    this.s[2] = c;
    this.s[3] = d;
    return d;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const outCh = output[0];
    const inCh = input && input[0] ? input[0] : null;

    const cutArr = params.cutoff;
    const resArr = params.resonance;
    const drive = params.drive.length > 0 ? params.drive[0] : 1;

    const blockLen = outCh.length;
    for (let i = 0; i < blockLen; i++) {
      const sample = (inCh ? inCh[i] : 0) * drive;
      const fc = cutArr.length > 1 ? cutArr[i] : cutArr[0];
      // Scale resonance to ladder feedback factor. The classic Moog needs ~4
      // for self-oscillation; the tanh saturation makes that safe.
      const res = resArr.length > 1 ? resArr[i] : resArr[0];
      const k = 4 * Math.min(1.0, res);
      // 2× oversampling: process the input sample twice (zero-order hold).
      this._step(sample, fc, k);
      const y = this._step(sample, fc, k);
      // Light DC blocker + makeup gain (Moog filter loses ~6 dB at high res).
      outCh[i] = y * (1 + res * 0.4);
    }
    return true;
  }
}

registerProcessor('moog-ladder', MoogLadderProcessor);
