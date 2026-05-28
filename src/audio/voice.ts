/**
 * A single Memorymoog voice.
 *
 * Audio path (v2 — true PWM worklet + per-bank pitch/PW modulation):
 *   osc1 (bank) ─┐
 *   osc2 (bank) ─┤── mixer (4 gains) → ladder filter → VCA → out
 *   osc3 (bank) ─┤
 *   noise         ┘
 *
 * Filter envelope sweeps the cutoff `AudioParam` directly using `applyAttackDecay`.
 * VCA envelope sweeps the VCA gain. On `release()`, both envelopes ramp to baseline
 * and we schedule the voice tear-down a bit after the longer of the two releases.
 *
 * Wave handling: saw and tri are native OscillatorNodes, 'pulse' uses the PWM
 * AudioWorklet (PolyBLEP-bandlimited, variable duty cycle). LFO destinations
 * for pw1/pw2/pw3 modulate the PWM duty cycle in real time.
 */

import type { Preset, Osc1State, Osc2State, Osc3State } from '../data/preset';
import {
  filterCutoffHz,
  mixerLevelLinear,
  octaveSemitones,
  pulseWidthDuty,
  volumeLinear,
} from '../data/preset-scales';
import { centsToRatio, midiToHz, semitonesToRatio } from './midi-utils';
import { getPinkNoiseBuffer } from './noise';
import { applyAttackDecay, applyRelease, filterTimes, vcaTimes } from './envelope';
import { createMoogFilter, type MoogFilter } from './filter';
import { OscBank } from './osc-bank';

export interface VoiceConfig {
  preset: Preset;
  midiNote: number;
  velocity: number; // 0..1
  startTime: number; // ctx.currentTime when noteOn fires
  /** Optional global LFO bus; if provided, the voice taps it according to preset.lfo.dest. */
  lfoBus?: AudioNode;
  /** Optional MPE per-note channel — used by Step 4 to route per-note CC. */
  mpeChannel?: number;
}

export class Voice {
  readonly midiNote: number;
  readonly startTime: number;
  /** MIDI channel this note was allocated on (Step 4 — MPE routing). */
  readonly mpeChannel: number | null;

  private readonly ctx: AudioContext;
  private readonly preset: Preset;

  private readonly osc1Bank: OscBank;
  private readonly osc2Bank: OscBank;
  private readonly osc3Bank: OscBank;
  private readonly noiseSrc: AudioBufferSourceNode;

  private readonly osc1Gain: GainNode;
  private readonly osc2Gain: GainNode;
  private readonly osc3Gain: GainNode;
  private readonly noiseGain: GainNode;

  private readonly filter: MoogFilter;
  private readonly vca: GainNode;

  private readonly filterBaseHz: number;
  private readonly filterPeakHz: number;

  private released = false;
  private endTime = Infinity;

  private mpeBendSemis = 0;
  private mpePressureNode: GainNode | null = null;
  private mpeTimbreNode: GainNode | null = null;

  constructor(ctx: AudioContext, dest: AudioNode, config: VoiceConfig) {
    this.ctx = ctx;
    this.preset = config.preset;
    this.midiNote = config.midiNote;
    this.startTime = config.startTime;
    this.mpeChannel = config.mpeChannel ?? null;

    const { preset, midiNote, startTime } = config;
    const noteHz = midiToHz(midiNote);

    // Per-osc mixer gains (mixer levels).
    this.osc1Gain = ctx.createGain();
    this.osc2Gain = ctx.createGain();
    this.osc3Gain = ctx.createGain();
    this.noiseGain = ctx.createGain();
    this.osc1Gain.gain.value = mixerLevelLinear(preset.mixer.osc1) * 0.25;
    this.osc2Gain.gain.value = mixerLevelLinear(preset.mixer.osc2) * 0.25;
    this.osc3Gain.gain.value = mixerLevelLinear(preset.mixer.osc3) * 0.25;
    this.noiseGain.gain.value = mixerLevelLinear(preset.mixer.noise) * 0.25;

    // Filter + VCA chain.
    this.filter = createMoogFilter(ctx);
    this.filter.setEmphasis(preset.filter.emphasis);
    const baseCutoff = filterCutoffHz(preset.filter.cutoff);
    const kbShift = (midiNote - 69) * preset.filter.kbTrack;
    this.filterBaseHz = baseCutoff * semitonesToRatio(kbShift);
    const contourOctaves = (preset.filter.contourAmount / 10) * 8;
    this.filterPeakHz = Math.min(
      ctx.sampleRate * 0.45,
      this.filterBaseHz * semitonesToRatio(contourOctaves * 12),
    );
    this.filter.cutoff.value = this.filterBaseHz;

    this.vca = ctx.createGain();
    this.vca.gain.value = 0;

    this.osc1Gain.connect(this.filter.node);
    this.osc2Gain.connect(this.filter.node);
    this.osc3Gain.connect(this.filter.node);
    this.noiseGain.connect(this.filter.node);
    this.filter.node.connect(this.vca);
    this.vca.connect(dest);

    // Build oscillator banks for each layer.
    const osc1Hz = this.computeOsc1Hz(noteHz, preset.osc1);
    this.osc1Bank = new OscBank({
      ctx,
      destination: this.osc1Gain,
      baseHz: osc1Hz,
      blend: preset.osc1.waves,
      initialPulseWidth: pulseWidthDuty(preset.osc1.pulseWidth),
      initialDetuneCents: 0,
    });

    const osc2Hz = this.computeOsc2Hz(noteHz, preset.osc2);
    this.osc2Bank = new OscBank({
      ctx,
      destination: this.osc2Gain,
      baseHz: osc2Hz,
      blend: preset.osc2.waves,
      initialPulseWidth: pulseWidthDuty(preset.osc2.pulseWidth),
      initialDetuneCents: preset.osc2.fine * 100,
    });

    const osc3Hz = this.computeOsc3Hz(noteHz, preset.osc3);
    this.osc3Bank = new OscBank({
      ctx,
      destination: this.osc3Gain,
      baseHz: osc3Hz,
      blend: preset.osc3.waves,
      initialPulseWidth: pulseWidthDuty(preset.osc3.pulseWidth),
      initialDetuneCents: 0,
    });

    // Hard sync: when OSC1 sync2to1 flag is set, sync OSC2's PWM oscillators to OSC1's
    // zero-crossings. (Saw/tri sync would need worklets too; we sync the PWM source
    // which is by far the most musically useful sync target.)
    if (preset.osc1.sync2to1) this.wireHardSync();

    // Noise source.
    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = getPinkNoiseBuffer(ctx);
    this.noiseSrc.loop = true;
    this.noiseSrc.connect(this.noiseGain);

    // Wire LFO modulation taps (pitch + filter + PWM destinations).
    if (config.lfoBus) this.wireLfoModulation(config.lfoBus, preset);

    // Schedule envelopes.
    this.scheduleEnvelopes(startTime, config.velocity);

    // Start all sources at noteOn.
    this.osc1Bank.start(startTime);
    this.osc2Bank.start(startTime);
    this.osc3Bank.start(startTime);
    this.noiseSrc.start(startTime);
  }

  private wireHardSync(): void {
    const masters = this.osc1Bank.pwmOscillators;
    const slaves = this.osc2Bank.pwmOscillators;
    if (masters.length === 0 || slaves.length === 0) return;
    for (const m of masters) m.setRole('master');
    for (const s of slaves) s.setRole('slave');
    // Sample-accurate hard sync: master.outputs[1] (single-sample pulse on
    // each phase wrap) is wired into slave.inputs[0]. The slave detects the
    // rising edge inside its process() loop and resets phase that same
    // sample — yielding the classic "sync scream" without any port-latency
    // jitter. The panel only ever activates OSC1's sync2to1 flag, so we
    // route all slaves to the first master.
    const master = masters[0]!;
    for (const s of slaves) master.connectSyncOutputTo(s);
  }

  private wireLfoModulation(lfoBus: AudioNode, preset: Preset): void {
    const depth = preset.modulationAmount / 10; // 0..1
    if (depth <= 0) return;
    const dest = preset.lfo.dest;

    // Pitch destinations (osc freq) — modulation in semitones, scaled to cents.
    const pitchCentsDepth = depth * 700; // up to a ~5th of vibrato at max
    if (dest.osc1) this.osc1Bank.tapPitchModulation(lfoBus, pitchCentsDepth);
    if (dest.osc2) this.osc2Bank.tapPitchModulation(lfoBus, pitchCentsDepth);
    if (dest.osc3 && !preset.osc3.low) {
      this.osc3Bank.tapPitchModulation(lfoBus, pitchCentsDepth);
    }

    // Filter cutoff modulation — additive in Hz. Use a large headroom.
    if (dest.filter) {
      const g = this.ctx.createGain();
      g.gain.value = depth * 2000;
      lfoBus.connect(g);
      g.connect(this.filter.cutoff);
    }

    // Pulse-width modulation destinations (v2 — was a no-op in v1).
    const pwDepth = depth * 0.3; // ±30% duty modulation at full mod
    if (dest.pw1) this.osc1Bank.tapPulseWidthModulation(lfoBus, pwDepth);
    if (dest.pw2) this.osc2Bank.tapPulseWidthModulation(lfoBus, pwDepth);
    if (dest.pw3) this.osc3Bank.tapPulseWidthModulation(lfoBus, pwDepth);
  }

  private computeOsc1Hz(noteHz: number, o: Osc1State): number {
    return noteHz * semitonesToRatio(octaveSemitones(o.octave));
  }

  private computeOsc2Hz(noteHz: number, o: Osc2State): number {
    const semis = octaveSemitones(o.octave) + o.coarse;
    return noteHz * semitonesToRatio(semis) * centsToRatio(o.fine * 100);
  }

  private computeOsc3Hz(noteHz: number, o: Osc3State): number {
    if (o.low) return Math.max(0.1, 0.5 + o.frequency * 0.4); // OSC3 as LFO ~ 0.5..4 Hz
    const baseHz = o.keyboardControl ? noteHz : midiToHz(69);
    return baseHz * semitonesToRatio(octaveSemitones(o.octave) + o.frequency);
  }

  /**
   * Apply the global Contour switches to a freshly computed ADSR.
   *   release flag OFF → release time forced to 0
   *   KB-follow flag ON → all times scaled by a factor based on note pitch
   */
  private applyContourFlags(env: { attack: number; decay: number; sustain: number; release: number }): typeof env {
    const c = this.preset.contour;
    const factor = c.keyboardFollow
      ? Math.pow(2, (69 - this.midiNote) / 24)
      : 1;
    return {
      attack: env.attack * factor,
      decay: env.decay * factor,
      sustain: env.sustain,
      release: c.release ? env.release * factor : 0,
    };
  }

  private scheduleEnvelopes(startTime: number, velocity: number): void {
    const vcaEnv = this.applyContourFlags(vcaTimes(this.preset.vca));
    const filtEnv = this.applyContourFlags(filterTimes(this.preset.filter));
    const peak = volumeLinear(this.preset.programmableVolume) * Math.max(0.25, velocity);
    applyAttackDecay(this.vca.gain, startTime, 0, peak, vcaEnv);
    applyAttackDecay(
      this.filter.cutoff,
      startTime,
      this.filterBaseHz,
      this.filterPeakHz,
      filtEnv,
    );
  }

  release(at: number): number {
    if (this.released) return this.endTime;
    this.released = true;
    const vcaEnv = this.applyContourFlags(vcaTimes(this.preset.vca));
    const filtEnv = this.applyContourFlags(filterTimes(this.preset.filter));
    const t1 = applyRelease(this.vca.gain, at, 0, vcaEnv.release);
    const t2 = applyRelease(this.filter.cutoff, at, this.filterBaseHz, filtEnv.release);
    this.endTime = Math.max(t1, t2) + 0.05;
    this.scheduleStop(this.endTime);
    return this.endTime;
  }

  steal(at: number): number {
    if (this.released) return this.endTime;
    this.released = true;
    const fadeEnd = at + 0.02;
    this.vca.gain.cancelScheduledValues(at);
    this.vca.gain.setValueAtTime(this.vca.gain.value, at);
    this.vca.gain.linearRampToValueAtTime(0, fadeEnd);
    this.endTime = fadeEnd + 0.02;
    this.scheduleStop(this.endTime);
    return this.endTime;
  }

  private scheduleStop(at: number): void {
    const stopAt = Math.max(at, this.ctx.currentTime + 0.05);
    this.osc1Bank.stop(stopAt);
    this.osc2Bank.stop(stopAt);
    this.osc3Bank.stop(stopAt);
    try {
      this.noiseSrc.stop(stopAt);
    } catch {
      /* already scheduled */
    }
    const tearAt = stopAt + 0.1;
    window.setTimeout(
      () => {
        this.osc1Bank.disconnect();
        this.osc2Bank.disconnect();
        this.osc3Bank.disconnect();
        if (this.mpePressureNode) {
          try { this.mpePressureNode.disconnect(); } catch { /* ignore */ }
        }
        if (this.mpeTimbreNode) {
          try { this.mpeTimbreNode.disconnect(); } catch { /* ignore */ }
        }
      },
      Math.max(0, (tearAt - this.ctx.currentTime) * 1000),
    );
  }

  get isReleasing(): boolean {
    return this.released;
  }

  get scheduledEnd(): number {
    return this.endTime;
  }

  /** Apply a global pitch-bend (in semitones) to all running oscillators. */
  setPitchBendSemitones(semitones: number): void {
    const cents = semitones * 100;
    this.osc1Bank.setDetuneCents(cents);
    this.osc2Bank.setDetuneCents(this.preset.osc2.fine * 100 + cents);
    if (this.preset.osc3.keyboardControl && !this.preset.osc3.low) {
      this.osc3Bank.setDetuneCents(cents);
    }
  }

  /** MPE: apply per-note pitch bend (in semitones, additive to global bend). */
  setMpeBend(semitones: number): void {
    this.mpeBendSemis = semitones;
    const cents = semitones * 100;
    this.osc1Bank.setDetuneCents(cents);
    this.osc2Bank.setDetuneCents(this.preset.osc2.fine * 100 + cents);
    if (this.preset.osc3.keyboardControl && !this.preset.osc3.low) {
      this.osc3Bank.setDetuneCents(cents);
    }
  }

  getMpeBend(): number {
    return this.mpeBendSemis;
  }

  /**
   * MPE: apply per-note channel pressure (0..1) — modulates VCA gain and LFO
   * depth as per Seaboard default behaviour. The mapping is additive on top
   * of the envelope.
   */
  setMpePressure(value: number, opts: { vca: boolean; lfo: boolean; filter: boolean }): void {
    const v = Math.max(0, Math.min(1, value));
    if (opts.vca) {
      // Scale VCA by 1 + 0.5*v as a gentle accent on top of the env.
      const target = 1 + 0.5 * v;
      this.vca.gain.setTargetAtTime(this.vca.gain.value * target, this.ctx.currentTime, 0.02);
    }
    if (opts.filter) {
      // Add up to 1500 Hz to the cutoff.
      this.filter.cutoff.setTargetAtTime(this.filterBaseHz + v * 1500, this.ctx.currentTime, 0.02);
    }
    void opts.lfo; // LFO depth bound at the synth-bus level — voice exposes mod sink only.
  }

  /** MPE: per-note timbre (CC74). Adds an offset (Hz) to the filter cutoff. */
  setMpeTimbre(value: number): void {
    const v = Math.max(0, Math.min(1, value));
    this.filter.cutoff.setTargetAtTime(this.filterBaseHz + v * 3000, this.ctx.currentTime, 0.02);
  }
}
