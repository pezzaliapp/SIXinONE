/**
 * Memorymoog Plus sequencer — pragmatic distillation.
 *
 * Concepts:
 *   - 10 sequence slots, each a list of steps.
 *   - A step is either a NOTE (MIDI note + duration in beats) or a REST.
 *     Program-change steps (the original "program sequence") collapse to
 *     a NoteEvent with `programChange` set.
 *   - Three transport modes:
 *       STEP        — advance one step on an external trigger (callback)
 *       CONTINUOUS  — clock driven by internal BPM
 *       SYNC_EXT    — external clock advances (hook in for Web MIDI clock)
 *   - BPM 30..300; one step = one quarter unless step.duration says
 *     otherwise.
 *
 * Implementation uses the well-known lookahead scheduling pattern
 * (Chris Wilson, "A Tale of Two Clocks"): a setInterval drives a
 * scheduler that pushes events into the synth up to `lookaheadMs`
 * ahead of currentTime so jitter from main-thread blocking doesn't
 * hurt timing.
 */

import type { Synth } from '../audio/synth';
import { getAudioContext } from '../audio/context';
import { presetBank } from '../data/preset-bank';
import { subscribeNote } from '../state/note-bus';

export type StepEvent =
  | { type: 'note'; note: number; velocity: number; durationBeats: number }
  | { type: 'rest'; durationBeats: number }
  | { type: 'program'; number: number };

export type SequencerMode = 'STEP' | 'CONTINUOUS' | 'SYNC_EXT';

export class Sequence {
  steps: StepEvent[] = [];
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

const NUM_SLOTS = 10;

export class Sequencer {
  readonly sequences: Sequence[] = Array.from(
    { length: NUM_SLOTS },
    (_, i) => new Sequence(`SEQ ${i}`),
  );

  private currentSlot = 0;
  private bpm = 120;
  private mode: SequencerMode = 'CONTINUOUS';
  private running = false;
  private recording = false;

  private nextNoteTime = 0;
  private currentStepIdx = 0;
  private schedulerId: number | null = null;
  private readonly lookaheadMs = 25;
  private readonly scheduleAheadSec = 0.1;

  private listeners = new Set<() => void>();

  constructor(private synth: Synth) {
    subscribeNote((note, velocity) => {
      if (this.recording) this.appendNote(note, velocity, 1);
    });
  }

  on(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  private fire(): void {
    for (const cb of this.listeners) cb();
  }

  selectSlot(idx: number): void {
    this.currentSlot = Math.max(0, Math.min(NUM_SLOTS - 1, idx));
    this.fire();
  }
  getSlot(): number {
    return this.currentSlot;
  }
  getCurrentSequence(): Sequence {
    return this.sequences[this.currentSlot]!;
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(30, Math.min(300, bpm));
  }
  getBpm(): number {
    return this.bpm;
  }

  setMode(mode: SequencerMode): void {
    this.mode = mode;
    if (mode === 'STEP') this.stop();
    this.fire();
  }
  getMode(): SequencerMode {
    return this.mode;
  }

  isRunning(): boolean {
    return this.running;
  }

  setRecording(rec: boolean): void {
    this.recording = rec;
    if (rec) this.getCurrentSequence().steps = [];
    this.fire();
  }
  isRecording(): boolean {
    return this.recording;
  }

  appendNote(midiNote: number, velocity = 100, durationBeats = 1): void {
    if (!this.recording) return;
    this.getCurrentSequence().steps.push({
      type: 'note',
      note: midiNote,
      velocity,
      durationBeats,
    });
    this.fire();
  }

  appendProgram(number: number): void {
    if (!this.recording) return;
    this.getCurrentSequence().steps.push({ type: 'program', number });
    this.fire();
  }

  clear(): void {
    this.getCurrentSequence().steps = [];
    this.fire();
  }

  start(): void {
    if (this.running) return;
    const ctx = getAudioContext();
    this.currentStepIdx = 0;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.running = true;
    if (this.mode === 'CONTINUOUS') this.startScheduler();
    this.fire();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.synth.panic();
    this.fire();
  }

  /** External clock hook — call once per quarter-note tick to advance. */
  externalTick(): void {
    if (!this.running || this.mode !== 'SYNC_EXT') return;
    this.fireStep();
  }

  /** Manually advance one step (STEP mode). */
  stepAdvance(): void {
    if (this.mode !== 'STEP') this.setMode('STEP');
    if (!this.running) {
      this.running = true;
      this.currentStepIdx = 0;
      this.nextNoteTime = getAudioContext().currentTime;
    }
    this.fireStep();
  }

  private startScheduler(): void {
    if (this.schedulerId !== null) return;
    this.schedulerId = window.setInterval(() => this.tick(), this.lookaheadMs);
  }

  private tick(): void {
    if (!this.running) return;
    const ctx = getAudioContext();
    while (this.running && this.nextNoteTime < ctx.currentTime + this.scheduleAheadSec) {
      this.fireStep();
    }
  }

  private secondsPerBeat(): number {
    return 60 / this.bpm;
  }

  private fireStep(): void {
    const seq = this.getCurrentSequence();
    if (seq.steps.length === 0) {
      this.stop();
      return;
    }
    const step = seq.steps[this.currentStepIdx % seq.steps.length]!;
    const spb = this.secondsPerBeat();

    if (step.type === 'program') {
      // Load preset on the audio thread's beat boundary.
      const p = presetBank.get(step.number);
      this.synth.setPreset(p);
      // Programs don't consume time on the original — but to keep the
      // sequencer moving we treat them as a one-beat rest equivalent.
      this.nextNoteTime += spb;
    } else if (step.type === 'rest') {
      this.nextNoteTime += spb * step.durationBeats;
    } else {
      const note = step.note;
      const at = this.nextNoteTime;
      const dur = spb * step.durationBeats;
      window.setTimeout(
        () => this.synth.noteOn(note, step.velocity / 127),
        Math.max(0, (at - ctx().currentTime) * 1000),
      );
      window.setTimeout(
        () => this.synth.noteOff(note),
        Math.max(0, (at - ctx().currentTime + dur * 0.9) * 1000),
      );
      this.nextNoteTime += dur;
    }

    this.currentStepIdx = (this.currentStepIdx + 1) % seq.steps.length;
  }
}

const ctx = (): AudioContext => getAudioContext();
