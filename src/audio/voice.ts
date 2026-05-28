/**
 * A single Memorymoog voice.
 *
 * Audio path (Step 3 baseline — biquad filter, no hard sync, no true PWM):
 *   osc1 ─┐
 *   osc2 ─┤── mixer (4 gains) → filter (BiquadLowpass) → VCA → out
 *   osc3 ─┤
 *   noise ┘
 *
 * Filter envelope sweeps the cutoff `AudioParam` directly using `applyAttackDecay`.
 * VCA envelope sweeps the VCA gain. On `release()`, both envelopes ramp to baseline
 * and we schedule the voice tear-down a bit after the longer of the two releases.
 *
 * Wave handling: 'saw' and 'tri' are native; 'pulse' currently uses 'square'
 * (TODO Step 4: true PWM via AudioWorklet). If multiple waveforms are toggled
 * on, we sum them through additional oscillators sharing the same frequency.
 */

import type { Preset, Osc1State, Osc2State, Osc3State, WaveBlend } from '../data/preset';
import {
  filterCutoffHz,
  mixerLevelLinear,
  octaveSemitones,
  volumeLinear,
} from '../data/preset-scales';
import { centsToRatio, midiToHz, semitonesToRatio } from './midi-utils';
import { getPinkNoiseBuffer } from './noise';
import { applyAttackDecay, applyRelease, filterTimes, vcaTimes } from './envelope';
import { createMoogFilter, type MoogFilter } from './filter';

interface OscBank {
  nodes: OscillatorNode[];
  detuneParam: AudioParam;
  baseHz: number;
}

const WAVE_TYPES: Array<keyof WaveBlend> = ['pulse', 'saw', 'tri'];

function activeWaveTypes(blend: WaveBlend): OscillatorType[] {
  const out: OscillatorType[] = [];
  for (const w of WAVE_TYPES) {
    if (blend[w]) {
      out.push(w === 'pulse' ? 'square' : w === 'saw' ? 'sawtooth' : 'triangle');
    }
  }
  if (out.length === 0) {
    out.push('sawtooth'); // fail-safe: silent oscillators would still consume mixer level
  }
  return out;
}

function buildOscBank(
  ctx: AudioContext,
  baseHz: number,
  blend: WaveBlend,
  destination: GainNode,
  detuneCents = 0,
): OscBank {
  const waves = activeWaveTypes(blend);
  // Use a fan-in mixer per bank so we can drive a single detune param.
  const sum = ctx.createGain();
  sum.gain.value = 1 / Math.max(1, waves.length);
  sum.connect(destination);

  const nodes = waves.map((w) => {
    const osc = ctx.createOscillator();
    osc.type = w;
    osc.frequency.value = baseHz;
    osc.detune.value = detuneCents;
    osc.connect(sum);
    return osc;
  });
  // Expose detune of the first oscillator; we'll mirror writes manually via setDetuneCents.
  const detuneParam = nodes[0]!.detune;
  return { nodes, detuneParam, baseHz };
}

function setBankDetune(bank: OscBank, cents: number): void {
  for (const n of bank.nodes) {
    n.detune.value = cents;
  }
}

export interface VoiceConfig {
  preset: Preset;
  midiNote: number;
  velocity: number; // 0..1
  startTime: number; // ctx.currentTime when noteOn fires
}

export class Voice {
  readonly midiNote: number;
  readonly startTime: number;

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

  constructor(ctx: AudioContext, dest: AudioNode, config: VoiceConfig) {
    this.ctx = ctx;
    this.preset = config.preset;
    this.midiNote = config.midiNote;
    this.startTime = config.startTime;

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
    // KB-track shifts cutoff with note. coeff of 1 = full tracking (1 semi/key).
    const kbShift = (midiNote - 69) * preset.filter.kbTrack;
    this.filterBaseHz = baseCutoff * semitonesToRatio(kbShift);
    // Contour amount peaks the filter higher than baseCutoff.
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
    this.osc1Bank = buildOscBank(ctx, osc1Hz, preset.osc1.waves, this.osc1Gain);

    const osc2Hz = this.computeOsc2Hz(noteHz, preset.osc2);
    this.osc2Bank = buildOscBank(ctx, osc2Hz, preset.osc2.waves, this.osc2Gain, preset.osc2.fine * 100);

    const osc3Hz = this.computeOsc3Hz(noteHz, preset.osc3);
    this.osc3Bank = buildOscBank(ctx, osc3Hz, preset.osc3.waves, this.osc3Gain);

    // Noise source.
    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = getPinkNoiseBuffer(ctx);
    this.noiseSrc.loop = true;
    this.noiseSrc.connect(this.noiseGain);

    // Schedule envelopes.
    this.scheduleEnvelopes(startTime, config.velocity);

    // Start all sources at noteOn.
    for (const b of [this.osc1Bank, this.osc2Bank, this.osc3Bank]) {
      for (const n of b.nodes) n.start(startTime);
    }
    this.noiseSrc.start(startTime);
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

  private scheduleEnvelopes(startTime: number, velocity: number): void {
    const vcaEnv = vcaTimes(this.preset.vca);
    const filtEnv = filterTimes(this.preset.filter);
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
    const vcaEnv = vcaTimes(this.preset.vca);
    const filtEnv = filterTimes(this.preset.filter);
    const t1 = applyRelease(this.vca.gain, at, 0, vcaEnv.release);
    const t2 = applyRelease(this.filter.cutoff, at, this.filterBaseHz, filtEnv.release);
    this.endTime = Math.max(t1, t2) + 0.05;
    this.scheduleStop(this.endTime);
    return this.endTime;
  }

  /** Hard-stop: cut quickly when stolen. */
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
    for (const b of [this.osc1Bank, this.osc2Bank, this.osc3Bank]) {
      for (const n of b.nodes) {
        try {
          n.stop(stopAt);
        } catch {
          // already scheduled
        }
      }
    }
    try {
      this.noiseSrc.stop(stopAt);
    } catch {
      // already scheduled
    }
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
    setBankDetune(this.osc1Bank, cents);
    // OSC2 already has fine-tune cents baked in; bend on top.
    setBankDetune(this.osc2Bank, this.preset.osc2.fine * 100 + cents);
    // OSC3 follows KB only when keyboardControl is on.
    if (this.preset.osc3.keyboardControl && !this.preset.osc3.low) {
      setBankDetune(this.osc3Bank, cents);
    }
  }
}
