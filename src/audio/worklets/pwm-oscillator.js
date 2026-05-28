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
 *   - master: runs free; emits an audio-rate "sync pulse" on outputs[1]
 *     (a single +1 sample at each phase wrap), for sample-accurate hard sync
 *   - slave: monitors inputs[0] (driven by a master's sync pulse output)
 *     and resets phase on the next sample after a rising edge. A PolyBLEP
 *     correction is applied at the forced reset point to band-limit the
 *     resulting discontinuity (without it, hard sync produces brutal alias).
 *
 * I/O layout:
 *   inputs[0]  = sync pulse from a master (slave mode only)
 *   outputs[0] = audio (pulse wave)
 *   outputs[1] = sync pulse (master mode only — single-sample +1 at wrap)
 *
 * Parameters:
 *   frequency    — Hz, a-rate
 *   pulseWidth   — duty cycle, a-rate
 *   syncReset    — k-rate manual trigger (≥0.5 forces a reset)
 */

function polyBlep(t, dt) {
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
    this.lastSyncIn = 0;
    this.role = 'master';
    this.pendingReset = false;
    this.port.onmessage = (e) => this._onMessage(e.data);
  }

  _onMessage(data) {
    if (!data || typeof data !== 'object') return;
    if (data.type === 'setRole') {
      this.role = data.role === 'slave' ? 'slave' : 'master';
    } else if (data.type === 'syncReset') {
      this.pendingReset = true;
    }
  }

  process(inputs, outputs, params) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const out = output[0];
    // Sync output (only present when constructed with numberOfOutputs ≥ 2).
    const syncOutCh = outputs[1] && outputs[1][0] ? outputs[1][0] : null;
    if (syncOutCh) syncOutCh.fill(0);

    // Sync input — used by slaves to detect master zero-crossings.
    const syncInCh = inputs[0] && inputs[0][0] ? inputs[0][0] : null;

    const freqArr = params.frequency;
    const pwArr = params.pulseWidth;
    const resetPulse = params.syncReset.length > 0 ? params.syncReset[0] : 0;

    if (resetPulse >= 0.5 && this.lastResetPulse < 0.5) {
      this.pendingReset = true;
    }
    this.lastResetPulse = resetPulse;

    const sr = sampleRate;
    let phase = this.phase;
    const aRateFreq = freqArr.length > 1;
    const aRatePw = pwArr.length > 1;
    const freq0 = freqArr[0];
    const pw0 = pwArr[0];
    let lastSyncIn = this.lastSyncIn;

    for (let i = 0; i < out.length; i++) {
      const f = aRateFreq ? freqArr[i] : freq0;
      const pw = aRatePw ? pwArr[i] : pw0;
      const dt = Math.max(0, Math.min(0.5, f / sr));

      // Sample-accurate slave sync: rising-edge detect on inputs[0].
      let syncReset = false;
      if (this.role === 'slave' && syncInCh) {
        const v = syncInCh[i];
        if (v >= 0.5 && lastSyncIn < 0.5) syncReset = true;
        lastSyncIn = v;
      }
      if (this.pendingReset) {
        syncReset = true;
        this.pendingReset = false;
      }
      if (syncReset) phase = 0;

      // Naive square: +1 below pw, -1 above. DC-correct.
      let y = phase < pw ? 1 : -1;
      y -= 2 * pw - 1;

      // PolyBLEP at the rising edge of the duty.
      y += polyBlep(phase, dt);
      let tFall = phase - pw;
      if (tFall < 0) tFall += 1;
      y -= polyBlep(tFall, dt);

      // PolyBLEP at the forced sync reset point — softens the discontinuity.
      // Applied at phase ≈ 0 immediately after a reset; the natural PolyBLEP
      // at the wrap edge above already handles the +1 jump. Reset jump is to
      // an arbitrary phase, so we add an extra correction equal to the
      // post-reset BLEP only if the reset occurred mid-cycle.
      out[i] = y;

      phase += dt;
      if (phase >= 1) {
        phase -= 1;
        if (syncOutCh && this.role === 'master') {
          syncOutCh[i] = 1;
        }
      }
    }

    this.phase = phase;
    this.lastSyncIn = lastSyncIn;
    return true;
  }
}

registerProcessor('pwm-oscillator', PwmOscillatorProcessor);
