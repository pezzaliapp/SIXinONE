/**
 * Top-level synth facade. UI / MIDI / sequencer talk to this class only.
 *
 * Responsibilities for Step 3:
 *   - Hold the AudioContext + master bus.
 *   - Hold the current preset.
 *   - noteOn / noteOff / panic / setPreset.
 *   - Drive the VoiceAllocator and instantiate Voice nodes.
 *
 * LFO, voice modulation, sequencer, MIDI come in later steps.
 */

import type { Preset, KbMode } from '../data/preset';
import { getAudioContext, getMasterBus, resumeAudio } from './context';
import { Voice } from './voice';
import { VoiceAllocator } from './voice-allocator';

type PolyMode = 'POLY1' | 'POLY2' | 'POLY3' | 'POLY4';

function asPolyMode(mode: KbMode): PolyMode {
  if (typeof mode === 'string') return mode;
  return 'POLY1';
}

export class Synth {
  private preset: Preset;
  private allocator = new VoiceAllocator(6);
  private heldNotes = new Set<number>();
  private bendSemitones = 0;
  private reapTimer: number | null = null;

  constructor(initialPreset: Preset) {
    this.preset = initialPreset;
    this.startReaper();
  }

  /** Must be called from a user gesture (click, keypress) the first time. */
  async start(): Promise<void> {
    await resumeAudio();
  }

  setPreset(p: Preset): void {
    this.preset = p;
    // Step 3: leave already-playing voices alone; preset changes apply to NEW notes.
    // TODO Step 10: optional "edit-in-place" mode that propagates to live voices.
  }

  getPreset(): Preset {
    return this.preset;
  }

  noteOn(midiNote: number, velocity = 0.85): void {
    const ctx = getAudioContext();
    if (this.preset.mono) {
      this.noteOnMono(midiNote, velocity);
      return;
    }
    const mode = asPolyMode(this.preset.kbMode);
    const slotIdx = this.allocator.pickSlot(midiNote, mode);
    this.allocator.stealSlot(slotIdx, ctx.currentTime);
    const voice = new Voice(ctx, getMasterBus(), {
      preset: this.preset,
      midiNote,
      velocity,
      startTime: ctx.currentTime,
    });
    if (this.bendSemitones !== 0) voice.setPitchBendSemitones(this.bendSemitones);
    this.allocator.placeVoice(slotIdx, voice, midiNote, ctx.currentTime);
    this.heldNotes.add(midiNote);
  }

  noteOff(midiNote: number): void {
    const ctx = getAudioContext();
    this.heldNotes.delete(midiNote);
    this.allocator.releaseNote(midiNote, ctx.currentTime);
  }

  panic(): void {
    const ctx = getAudioContext();
    this.allocator.panic(ctx.currentTime);
    this.heldNotes.clear();
  }

  /** Pitch bend in semitones. */
  setPitchBend(semitones: number): void {
    this.bendSemitones = semitones;
    this.allocator.forEachVoice((v) => v.setPitchBendSemitones(semitones));
  }

  /** Returns 6 booleans (one per slot) for LED indicators. */
  voiceActivity(): boolean[] {
    return this.allocator.activeSlotsSnapshot.map((s) => s.voice !== null);
  }

  private noteOnMono(midiNote: number, velocity: number): void {
    const ctx = getAudioContext();
    this.allocator.panic(ctx.currentTime);
    const voice = new Voice(ctx, getMasterBus(), {
      preset: this.preset,
      midiNote,
      velocity,
      startTime: ctx.currentTime,
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
