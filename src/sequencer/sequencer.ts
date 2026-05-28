/**
 * Memorymoog Plus sequencer — rides the shared {@link TransportClock}.
 *
 * Concepts:
 *   - 10 sequence slots, each a list of steps.
 *   - A step is either a NOTE (MIDI note + duration in beats) or a REST,
 *     or a program change (the original "program sequence" feature).
 *   - Three control modes:
 *       STEP        — advance one step on a manual STEP button press
 *       CONTINUOUS  — TransportClock drives playback (INT panel BPM, or
 *                     EXT MIDI clock, depending on the global source)
 *       SYNC_EXT    — alias for CONTINUOUS while transport source = EXT,
 *                     kept for UI continuity with the v2 panel
 *   - BPM is owned by the TransportClock; setBpm() forwards to it.
 *   - Step subdivision: how many 24-ppqn ticks advance one step. 6 = 16th
 *     (default), 12 = 8th, 24 = quarter, 3 = 32nd.
 */

import type { Synth } from '../audio/synth';
import { presetBank } from '../data/preset-bank';
import { subscribeNote } from '../state/note-bus';
import { transportClock as defaultTransport, type TransportClock } from './transport-clock';

export type StepEvent =
  | { type: 'note'; note: number; velocity: number; durationBeats: number }
  | { type: 'rest'; durationBeats: number }
  | { type: 'program'; number: number };

export type SequencerMode = 'STEP' | 'CONTINUOUS' | 'SYNC_EXT';
export type ClockSubdiv = 24 | 12 | 6 | 3;

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
  private mode: SequencerMode = 'CONTINUOUS';
  private running = false;
  private recording = false;
  private clockSubdiv: ClockSubdiv = 6;
  private tickCounter = 0;
  private currentStepIdx = 0;
  /** Callback invoked once per outgoing 24-ppqn tick when sending clock. */
  private clockOutCb: ((tickIndex: number) => void) | null = null;
  private transportUnsub: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private transport: TransportClock;

  constructor(private synth: Synth, transport: TransportClock = defaultTransport) {
    this.transport = transport;
    subscribeNote((note, velocity) => {
      if (this.recording) this.appendNote(note, velocity, 1);
    });
    this.subscribeTransport();
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
    this.transport.setBpm(bpm);
  }
  getBpm(): number {
    return this.transport.getBpm();
  }

  setMode(mode: SequencerMode): void {
    this.mode = mode;
    if (mode === 'STEP') this.stop();
    if (mode === 'SYNC_EXT') this.transport.setSource('EXT');
    else if (mode === 'CONTINUOUS') this.transport.setSource('INT');
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
   * sequencer is running, every TransportClock tick is forwarded.
   */
  setClockOutput(cb: ((tickIndex: number) => void) | null): void {
    this.clockOutCb = cb;
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
    this.currentStepIdx = 0;
    this.tickCounter = 0;
    this.running = true;
    this.transport.start();
    this.fire();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.transport.stop();
    this.synth.panic();
    this.fire();
  }

  /** Manually advance one step (STEP mode). */
  stepAdvance(): void {
    if (this.mode !== 'STEP') this.setMode('STEP');
    if (!this.running) {
      this.running = true;
      this.currentStepIdx = 0;
    }
    this.fireStep();
  }

  /** External tick — backwards-compat hook; transport delivers ticks now. */
  externalTick(): void {
    if (!this.running || this.mode === 'STEP') return;
    this.fireStep();
  }

  // ── Transport subscription ────────────────────────────────────────────
  private subscribeTransport(): void {
    if (this.transportUnsub) return;
    this.transportUnsub = this.transport.subscribe({
      onTick: () => {
        // Always forward to the MIDI-clock output (lets DAWs slave to us
        // even when the sequencer isn't itself playing — useful as a tempo
        // master for a drum machine while you noodle).
        this.clockOutCb?.(this.tickCounter);
        if (!this.running || this.mode === 'STEP') return;
        this.tickCounter++;
        if (this.tickCounter >= this.clockSubdiv) {
          this.tickCounter = 0;
          this.fireStep();
        }
      },
      onTransport: (state) => {
        // When the transport changes from outside (e.g. external clock
        // start/stop, or transport panel), reflect into our running flag.
        if (state === 'playing' && !this.running && this.mode !== 'STEP') {
          this.running = true;
          this.currentStepIdx = 0;
          this.tickCounter = 0;
          this.fire();
        } else if (state === 'stopped' && this.running) {
          this.running = false;
          this.synth.panic();
          this.fire();
        }
      },
      onSongPos: (positionIn16ths) => {
        const seq = this.getCurrentSequence();
        if (seq.steps.length === 0) return;
        this.currentStepIdx = positionIn16ths % seq.steps.length;
        this.tickCounter = 0;
        this.fire();
      },
    });
  }

  private fireStep(): void {
    const seq = this.getCurrentSequence();
    if (seq.steps.length === 0) {
      this.stop();
      return;
    }
    const step = seq.steps[this.currentStepIdx % seq.steps.length]!;

    if (step.type === 'program') {
      const p = presetBank.get(step.number);
      this.synth.setPreset(p);
    } else if (step.type === 'rest') {
      // No-op — tick budget already accounted for by the subdivision.
    } else {
      const note = step.note;
      const velocity = step.velocity / 127;
      // Approximate gate: 80% of one subdivision at the current BPM.
      const stepMs = (60_000 / this.transport.getBpm()) * (this.clockSubdiv / 24);
      const gateMs = stepMs * 0.8 * step.durationBeats;
      this.synth.noteOn(note, velocity);
      setTimeout(() => this.synth.noteOff(note), gateMs);
    }

    this.currentStepIdx = (this.currentStepIdx + 1) % seq.steps.length;
  }
}
