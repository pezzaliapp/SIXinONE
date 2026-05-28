/**
 * Top-level synth facade. UI / MIDI / sequencer talk to this class only.
 *
 * Responsibilities:
 *   - Hold the AudioContext + master bus.
 *   - Hold the current preset.
 *   - noteOn / noteOff / panic / setPreset.
 *   - Drive the VoiceAllocator and instantiate Voice nodes.
 *   - Global mod wheel (CC1) → multiplies the live LFO bus depth.
 *   - Sustain pedal (CC64) → holds note-offs until released.
 *   - MPE per-note routing (channel pressure + CC74 timbre per note).
 *   - Effects bus (chorus / plate reverb / tape delay) on the master path.
 *   - External MIDI clock observers can call externalClockTick().
 */

import type { Preset, KbMode } from '../data/preset';
import { getAudioContext, getMasterBus, resumeAudio } from './context';
import { Voice } from './voice';
import { VoiceAllocator } from './voice-allocator';
import { registerMoogLadder } from './filter';
import { registerPwmOscillator } from './pwm-oscillator';
import { GlobalLfo } from './lfo';

type PolyMode = 'POLY1' | 'POLY2' | 'POLY3' | 'POLY4';

function asPolyMode(mode: KbMode): PolyMode {
  if (typeof mode === 'string') return mode;
  return 'POLY1';
}

export type ControllerStateListener = (state: { modWheel: number; sustain: boolean; bend: number }) => void;

export class Synth {
  private preset: Preset;
  private allocator = new VoiceAllocator(6);
  private heldNotes = new Set<number>();
  private sustainedNotes = new Set<number>();
  private bendSemitones = 0;
  private modWheelValue = 0; // 0..127
  private sustainOn = false;
  private reapTimer: number | null = null;
  private lfo: GlobalLfo | null = null;
  private modDepthGain: GainNode | null = null;
  private controllerListeners = new Set<ControllerStateListener>();

  constructor(initialPreset: Preset) {
    this.preset = initialPreset;
    this.startReaper();
  }

  /** Must be called from a user gesture (click, keypress) the first time. */
  async start(): Promise<void> {
    await resumeAudio();
    const ctx = getAudioContext();
    try {
      await registerMoogLadder(ctx);
    } catch (err) {
      console.warn('Moog ladder worklet unavailable; using BiquadFilter fallback', err);
    }
    try {
      await registerPwmOscillator(ctx);
    } catch (err) {
      console.warn('PWM oscillator worklet unavailable; using square fallback', err);
    }
    this.ensureLfo();
  }

  private ensureLfo(): GlobalLfo {
    if (this.lfo) return this.lfo;
    const ctx = getAudioContext();
    this.lfo = new GlobalLfo(ctx);
    this.lfo.setWave(this.preset.lfo.wave);
    this.lfo.setRate(this.preset.lfo.rate);
    this.lfo.start();
    // modDepthGain sits between the raw LFO output and the bus that voices
    // tap. Its gain is set from preset.modulationAmount plus the live
    // mod-wheel value, so a single global node controls "how much vibrato".
    const depth = ctx.createGain();
    depth.gain.value = this.computeModDepth();
    this.lfo.output.connect(depth);
    this.modDepthGain = depth;
    return this.lfo;
  }

  /** Live LFO bus voices should tap. */
  private getLfoBus(): AudioNode | undefined {
    return this.modDepthGain ?? this.lfo?.output;
  }

  private computeModDepth(): number {
    const presetDepth = this.preset.modulationAmount / 10;
    const wheelDepth = this.modWheelValue / 127;
    return Math.min(1.5, presetDepth + wheelDepth);
  }

  private updateModDepth(): void {
    if (!this.modDepthGain) return;
    const ctx = getAudioContext();
    this.modDepthGain.gain.setTargetAtTime(this.computeModDepth(), ctx.currentTime, 0.02);
  }

  setPreset(p: Preset): void {
    this.preset = p;
    if (this.lfo) {
      this.lfo.setRate(p.lfo.rate);
      this.lfo.setWave(p.lfo.wave);
    }
    this.updateModDepth();
  }

  getPreset(): Preset {
    return this.preset;
  }

  noteOn(midiNote: number, velocity = 0.85, mpeChannel?: number): void {
    const ctx = getAudioContext();
    const dest = getMasterBus();
    if (this.preset.mono) {
      this.noteOnMono(midiNote, velocity, mpeChannel);
      return;
    }
    const mode = asPolyMode(this.preset.kbMode);
    const slotIdx = this.allocator.pickSlot(midiNote, mode);
    this.allocator.stealSlot(slotIdx, ctx.currentTime);
    const voice = new Voice(ctx, dest, {
      preset: this.preset,
      midiNote,
      velocity,
      startTime: ctx.currentTime,
      lfoBus: this.getLfoBus(),
      mpeChannel,
    });
    if (this.bendSemitones !== 0) voice.setPitchBendSemitones(this.bendSemitones);
    this.allocator.placeVoice(slotIdx, voice, midiNote, ctx.currentTime);
    this.heldNotes.add(midiNote);
  }

  noteOff(midiNote: number): void {
    const ctx = getAudioContext();
    this.heldNotes.delete(midiNote);
    if (this.sustainOn) {
      this.sustainedNotes.add(midiNote);
      return;
    }
    this.allocator.releaseNote(midiNote, ctx.currentTime);
  }

  panic(): void {
    const ctx = getAudioContext();
    this.allocator.panic(ctx.currentTime);
    this.heldNotes.clear();
    this.sustainedNotes.clear();
  }

  /** Pitch bend in semitones (global; MPE bend handled separately per-voice). */
  setPitchBend(semitones: number): void {
    this.bendSemitones = semitones;
    this.allocator.forEachVoice((v) => v.setPitchBendSemitones(semitones));
    this.notifyControllerState();
  }

  /** CC1 mod wheel — 0..127. Adds to the preset's modulationAmount. */
  setModWheel(cc1Value: number): void {
    this.modWheelValue = Math.max(0, Math.min(127, cc1Value));
    this.updateModDepth();
    this.notifyControllerState();
  }

  getModWheel(): number {
    return this.modWheelValue;
  }

  /** CC64 sustain pedal. */
  setSustainPedal(on: boolean): void {
    if (this.sustainOn === on) return;
    this.sustainOn = on;
    if (!on) {
      const ctx = getAudioContext();
      for (const n of this.sustainedNotes) {
        this.allocator.releaseNote(n, ctx.currentTime);
      }
      this.sustainedNotes.clear();
    }
    this.notifyControllerState();
  }

  isSustainOn(): boolean {
    return this.sustainOn;
  }

  /** MPE: apply per-note pitch bend (semitones, additive on top of global bend). */
  mpeBendChannel(channel: number, semitones: number): void {
    this.allocator.forEachVoice((v) => {
      if (v.mpeChannel === channel) v.setMpeBend(this.bendSemitones + semitones);
    });
  }

  /** MPE: per-note channel pressure (0..1). */
  mpePressureChannel(channel: number, value: number, opts: { vca: boolean; lfo: boolean; filter: boolean }): void {
    this.allocator.forEachVoice((v) => {
      if (v.mpeChannel === channel) v.setMpePressure(value, opts);
    });
  }

  /** MPE: per-note timbre (CC74) on a channel. */
  mpeTimbreChannel(channel: number, value: number): void {
    this.allocator.forEachVoice((v) => {
      if (v.mpeChannel === channel) v.setMpeTimbre(value);
    });
  }

  /** Returns 6 booleans (one per slot) for LED indicators. */
  voiceActivity(): boolean[] {
    return this.allocator.activeSlotsSnapshot.map((s) => s.voice !== null);
  }

  onControllerState(cb: ControllerStateListener): () => void {
    this.controllerListeners.add(cb);
    cb({ modWheel: this.modWheelValue, sustain: this.sustainOn, bend: this.bendSemitones });
    return () => this.controllerListeners.delete(cb);
  }

  private notifyControllerState(): void {
    const snapshot = { modWheel: this.modWheelValue, sustain: this.sustainOn, bend: this.bendSemitones };
    for (const cb of this.controllerListeners) cb(snapshot);
  }

  private noteOnMono(midiNote: number, velocity: number, mpeChannel?: number): void {
    const ctx = getAudioContext();
    const dest = getMasterBus();
    this.allocator.panic(ctx.currentTime);
    const voice = new Voice(ctx, dest, {
      preset: this.preset,
      midiNote,
      velocity,
      startTime: ctx.currentTime,
      lfoBus: this.getLfoBus(),
      mpeChannel,
    });
    this.allocator.placeVoice(0, voice, midiNote, ctx.currentTime);
    this.heldNotes.add(midiNote);
  }

  private startReaper(): void {
    if (this.reapTimer !== null) return;
    this.reapTimer = window.setInterval(() => {
      const ctx = getAudioContext();
      this.allocator.reapVoices(ctx.currentTime);
    }, 500);
  }

  destroy(): void {
    if (this.reapTimer !== null) {
      window.clearInterval(this.reapTimer);
      this.reapTimer = null;
    }
    this.panic();
  }
}
