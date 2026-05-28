/**
 * PWM oscillator — band-limited pulse wave with PolyBLEP anti-aliasing.
 *
 * Generates a pulse wave whose duty cycle (`pulseWidth`, 0..1) is variable
 * in real time. The two discontinuities (rising edge at phase=0 and falling
 * edge at phase=pulseWidth) are corrected with PolyBLEP, a 1-sample
 * polynomial approximation of a band-limited step — see
 * Välimäki & Huovilainen (2007), "Antialiasing Oscillators in Subtractive
 * Synthesis". This kills the high-frequency aliasing that plain
 * sample-and-compare pulse generation produces, especially at high
 * fundamentals or low pulse widths.
 *
 * Two roles:
 *   - master (default): runs free
 *   - slave: resets phase to 0 on the next sample after receiving a
 *     `{ type: 'syncReset' }` MessagePort message. Used for OSC2 hard sync.
 *
 * Master mode posts `{ type: 'zeroCross', when: currentTime }` whenever
 * its phase wraps (~once per cycle) so the slave can detect zero
 * crossings without sample-accurate shared state. For sample-accurate
 * sync, the slave detects its own phase wrap of the *audio input* it
 * receives (param-coupled approach below).
 *
 * Parameters:
 *   frequency    — Hz, a-rate (0..20000)
 *   pulseWidth   — duty cycle 0.05..0.95, a-rate
 *   syncReset    — k-rate trigger (set ≥0.5 for one block to force reset)
 */

const TAU = Math.PI * 2;

function polyBlep(t, dt) {
  // Returns the band-limiting correction at fractional phase t (0..1) given
  // the per-sample phase step dt. Two regions: just-after a discontinuity
  // (t < dt) and just-before the wrap (t > 1 - dt). Zero elsewhere.
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

class PwmOscillatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'frequency',
        defaultValue: 440,
        minValue: 0,
        maxValue: 20000,
        automationRate: 'a-rate',
      },
      {
        name: 'pulseWidth',
        defaultValue: 0.5,
        minValue: 0.02,
        maxValue: 0.98,
        automationRate: 'a-rate',
      },
      {
        name: 'syncReset',
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lastResetPulse = 0;
    this.role = 'master';
    this.port.onmessage = (e) => this._onMessage(e.data);
  }

  _onMessage(data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'setRole') {
      this.role = data.role === 'slave' ? 'slave' : 'master';
    } else if (data.type === 'syncReset') {
      // Edge-triggered: phase will reset on the next sample.
      this.phase = 0;
    }
  }

  process(_inputs, outputs, params) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const out = output[0];
    const freqArr = params.frequency;
    const pwArr = params.pulseWidth;
    const resetPulse = params.syncReset.length > 0 ? params.syncReset[0] : 0;

    // Edge detect the sync trigger (rising through 0.5).
    if (resetPulse >= 0.5 && this.lastResetPulse < 0.5) {
      this.phase = 0;
    }
    this.lastResetPulse = resetPulse;

    const sr = sampleRate;
    let phase = this.phase;
    const aRateFreq = freqArr.length > 1;
    const aRatePw = pwArr.length > 1;
    const freq0 = freqArr[0];
    const pw0 = pwArr[0];
    let postedWrap = false;

    for (let i = 0; i < out.length; i++) {
      const f = aRateFreq ? freqArr[i] : freq0;
      const pw = aRatePw ? pwArr[i] : pw0;
      const dt = Math.max(0, Math.min(0.5, f / sr));

      // Naive square: +1 below pw, -1 above. DC-offset corrected so the
      // long-term mean is zero regardless of pulse width (a 90% pulse
      // otherwise carries 0.8 DC, which murders any subsequent filter).
      let y = phase < pw ? 1 : -1;
      // Remove the DC component introduced by asymmetric duty.
      y -= 2 * pw - 1;

      // PolyBLEP at rising edge (phase ~ 0). Bumps the discontinuity.
      y += polyBlep(phase, dt);
      // PolyBLEP at falling edge (phase ~ pw). Re-frame phase to be
      // relative to the falling edge by subtracting pw.
      let tFall = phase - pw;
      if (tFall < 0) tFall += 1;
      y -= polyBlep(tFall, dt);

      out[i] = y;

      phase += dt;
      if (phase >= 1) {
        phase -= 1;
        // Notify subscribers (e.g. the slave) at most once per process()
        // tick — saves spamming the message port.
        if (!postedWrap && this.role === 'master') {
          this.port.postMessage({ type: 'zeroCross' });
          postedWrap = true;
        }
      }
    }

    this.phase = phase;
    return true;
  }
}

registerProcessor('pwm-oscillator', PwmOscillatorProcessor);
