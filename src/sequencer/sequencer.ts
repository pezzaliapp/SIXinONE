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
import { externalClock } from '../midi/external-clock';

export type StepEvent =
  | { type: 'note'; note: number; velocity: number; durationBeats: number }
  | { type: 'rest'; durationBeats: number }
  | { type: 'program'; number: number };

export type SequencerMode = 'STEP' | 'CONTINUOUS' | 'SYNC_EXT';
/** External-clock subdivision: how many 24-ppqn ticks advance one step. */
export type ClockSubdiv = 24 | 12 | 6 | 3; // 1/4, 1/8, 1/16, 1/32

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
  private clockSubdiv: ClockSubdiv = 6; // default = 16th note steps
  private externalTickCounter = 0;
  private externalClockUnsub: (() => void) | null = null;
  private externalClockEverPresent = false;
  /** Callback invoked once per outgoing 24-ppqn tick when sending clock. */
  private clockOutCb: ((tickIndex: number) => void) | null = null;
  private clockOutTimer: number | null = null;

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
    // Re-pace the clock-output ticker so DAWs in slave mode track tempo changes.
    if (this.clockOutTimer !== null) {
      this.stopClockOut();
      if (this.running && this.mode === 'CONTINUOUS') this.startClockOut();
    }
  }
  getBpm(): number {
    return this.bpm;
  }

  setMode(mode: SequencerMode): void {
    this.mode = mode;
    if (mode === 'STEP') this.stop();
    if (mode === 'SYNC_EXT') this.subscribeExternalClock();
    else this.unsubscribeExternalClock();
    this.fire();
  }
  getMode(): SequencerMode {
    return this.mode;
  }

  setClockSubdiv(sub: ClockSubdiv): void {
    this.clockSubdiv = sub;
  }
  getClockSubdiv(): ClockSubdiv {
    return this.clockSubdiv;
  }

  /**
   * Register a sender for outgoing 24-ppqn ticks. When non-null and the
   * sequencer is running internally, ticks are emitted at the internal BPM.
   */
  setClockOutput(cb: ((tickIndex: number) => void) | null): void {
    this.clockOutCb = cb;
    if (!cb) this.stopClockOut();
    else if (this.running && this.mode === 'CONTINUOUS') this.startClockOut();
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
    if (this.mode === 'CONTINUOUS') {
      this.startScheduler();
      this.startClockOut();
    }
    this.fire();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    this.stopClockOut();
    this.synth.panic();
    this.fire();
  }

  /** Direct external tick — kept for backwards compat / manual stepping. */
  externalTick(): void {
    if (!this.running || this.mode !== 'SYNC_EXT') return;
    this.fireStep();
  }

  // ── External clock plumbing ──────────────────────────────────────────
  private subscribeExternalClock(): void {
    if (this.externalClockUnsub) return;
    this.externalTickCounter = 0;
    this.externalClockUnsub = externalClock.subscribe({
      onTick: () => {
        if (this.mode !== 'SYNC_EXT' || !this.running) return;
        this.externalTickCounter++;
        if (this.externalTickCounter >= this.clockSubdiv) {
          this.externalTickCounter = 0;
          this.fireStep();
        }
      },
      onTransport: (state) => {
        if (this.mode !== 'SYNC_EXT') return;
        if (state === 'running') {
          this.externalClockEverPresent = true;
          this.externalTickCounter = 0;
          if (!this.running) this.start();
        } else if (state === 'stopped') {
          if (this.running) this.stop();
        }
      },
      onSongPos: (positionIn16ths) => {
        if (this.mode !== 'SYNC_EXT') return;
        const seq = this.getCurrentSequence();
        if (seq.steps.length === 0) return;
        // Default 16th-note steps: position in 16ths maps 1:1 to step idx.
        this.currentStepIdx = positionIn16ths % seq.steps.length;
        this.externalTickCounter = 0;
        this.fire();
      },
      onPresenceChange: (present) => {
        if (this.mode !== 'SYNC_EXT' || !this.running) return;
        // Fall back to internal once we've ever had external clock and now
        // it's gone — that's the "cable unplugged" scenario.
        if (!present && this.externalClockEverPresent) {
          this.mode = 'CONTINUOUS';
          this.startScheduler();
          this.fire();
        }
      },
    });
  }
  private unsubscribeExternalClock(): void {
    if (this.externalClockUnsub) {
      this.externalClockUnsub();
      this.externalClockUnsub = null;
    }
    this.externalClockEverPresent = false;
  }

  // ── Internal clock output ────────────────────────────────────────────
  private startClockOut(): void {
    if (!this.clockOutCb || this.clockOutTimer !== null) return;
    // 24 ticks per quarter at the current BPM. We don't need sample-accurate
    // pacing — a JS setInterval is good enough for sending MIDI clock to a
    // DAW master timeline.
    const intervalMs = (60_000 / Math.max(30, Math.min(300, this.bpm))) / 24;
    let counter = 0;
    this.clockOutTimer = window.setInterval(() => {
      this.clockOutCb?.(counter);
      counter = (counter + 1) % (24 * 1024);
    }, intervalMs);
  }
  private stopClockOut(): void {
    if (this.clockOutTimer !== null) {
      window.clearInterval(this.clockOutTimer);
      this.clockOutTimer = null;
    }
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
