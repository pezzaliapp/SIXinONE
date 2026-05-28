/**
 * Memorymoog-style arpeggiator.
 *
 * Six panel modes (1..6, 0 = off, matching `Preset.arpeggiator`):
 *   1 UP             ascending through held notes
 *   2 DOWN           descending
 *   3 UP/DOWN        alternates without repeating endpoints (ABCBA)
 *   4 UP/DOWN INC    alternates and repeats endpoints (ABCCBA)
 *   5 RANDOM         picks a random held note each step
 *   6 AS PLAYED      order in which keys were pressed
 *
 * Held notes come in via {@link Arpeggiator.addHeldNote} /
 * {@link Arpeggiator.removeHeldNote}; the engine schedules the actual voice
 * `noteOn` / `noteOff` calls via two callbacks supplied at construction.
 *
 * Timing:
 *   - source = 'INT' → JS interval scheduler at the arpeggiator's BPM
 *     scaled by subdivision (1/4 .. 1/32).
 *   - source = 'EXT' → subscribes to {@link externalClock}; advances every
 *     `subdivision` ticks of the 24-ppqn MIDI clock.
 *
 * Hold latch: when `hold` is set, removeHeldNote is ignored; toggling hold
 * off clears the latched set. Lets the user "freeze" an arpeggio and walk
 * away from the keys, just like the original Memorymoog HOLD switch.
 */

import { externalClock } from '../midi/external-clock';

export type ArpPattern = 'UP' | 'DOWN' | 'UP_DOWN' | 'UP_DOWN_INC' | 'RANDOM' | 'AS_PLAYED';
export type ArpClockSource = 'INT' | 'EXT';
/** Ticks-of-24ppqn per arpeggiator step. 6 = 16th note (default). */
export type ArpSubdiv = 24 | 12 | 6 | 3;

const PATTERN_BY_NUMBER: Record<1 | 2 | 3 | 4 | 5 | 6, ArpPattern> = {
  1: 'UP',
  2: 'DOWN',
  3: 'UP_DOWN',
  4: 'UP_DOWN_INC',
  5: 'RANDOM',
  6: 'AS_PLAYED',
};

export function patternFromPresetValue(v: number): ArpPattern | null {
  if (v === 0) return null;
  return PATTERN_BY_NUMBER[v as 1 | 2 | 3 | 4 | 5 | 6] ?? null;
}

export interface ArpCallbacks {
  noteOn: (note: number, velocity: number) => void;
  noteOff: (note: number) => void;
}

export class Arpeggiator {
  private enabled = false;
  private pattern: ArpPattern = 'UP';
  private octaveRange = 1; // 1..4
  private subdivision: ArpSubdiv = 6;
  private bpm = 120;
  private source: ArpClockSource = 'INT';
  private hold = false;
  /** Gate time as a fraction of step length (0..1). 0.8 = 80% legato-ish. */
  private gate = 0.8;

  private held = new Map<number, number>(); // note → velocity
  private pressOrder: number[] = [];
  private sequence: Array<{ note: number; velocity: number }> = [];
  private cursor = 0;

  private running = false;
  private internalScheduler: number | null = null;
  private externalUnsub: (() => void) | null = null;
  private externalTickCounter = 0;
  private lastPlayed: number | null = null;
  private lastPlayedReleaseTimer: number | null = null;

  constructor(private cb: ArpCallbacks) {}

  // ── configuration ─────────────────────────────────────────────────────
  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (on) this.startIfNeeded();
    else this.stopAndFlush();
  }
  isEnabled(): boolean {
    return this.enabled;
  }
  setPattern(p: ArpPattern): void {
    this.pattern = p;
    this.rebuildSequence();
  }
  getPattern(): ArpPattern {
    return this.pattern;
  }
  setOctaveRange(n: number): void {
    this.octaveRange = Math.max(1, Math.min(4, Math.round(n)));
    this.rebuildSequence();
  }
  getOctaveRange(): number {
    return this.octaveRange;
  }
  setSubdivision(s: ArpSubdiv): void {
    this.subdivision = s;
    if (this.source === 'INT' && this.running) this.restartInternal();
  }
  getSubdivision(): ArpSubdiv {
    return this.subdivision;
  }
  setBpm(bpm: number): void {
    this.bpm = Math.max(30, Math.min(360, bpm));
    if (this.source === 'INT' && this.running) this.restartInternal();
  }
  getBpm(): number {
    return this.bpm;
  }
  setSource(src: ArpClockSource): void {
    if (src === this.source) return;
    this.source = src;
    if (this.running) {
      this.stopClockSubscriptions();
      this.startClockSubscriptions();
    }
  }
  getSource(): ArpClockSource {
    return this.source;
  }
  setHold(h: boolean): void {
    if (h === this.hold) return;
    this.hold = h;
    if (!h) {
      // Releasing the latch — drop any notes that were only kept alive by hold.
      this.held.clear();
      this.pressOrder.length = 0;
      this.rebuildSequence();
      if (this.sequence.length === 0) this.stopAndFlush();
    }
  }
  getHold(): boolean {
    return this.hold;
  }

  // ── held-note bookkeeping ─────────────────────────────────────────────
  addHeldNote(note: number, velocity: number): void {
    if (!this.enabled) return;
    if (!this.held.has(note)) this.pressOrder.push(note);
    this.held.set(note, velocity);
    this.rebuildSequence();
    this.startIfNeeded();
  }
  removeHeldNote(note: number): void {
    if (!this.enabled) return;
    if (this.hold) return; // latched
    this.held.delete(note);
    this.pressOrder = this.pressOrder.filter((n) => n !== note);
    this.rebuildSequence();
    if (this.held.size === 0) this.stopAndFlush();
  }

  /** Called when the engine is being disabled — make sure no notes leak out. */
  flushAllNotes(): void {
    this.releaseLastPlayed();
    this.held.clear();
    this.pressOrder.length = 0;
    this.sequence = [];
    this.cursor = 0;
  }

  // ── core loop ─────────────────────────────────────────────────────────
  private rebuildSequence(): void {
    let base: number[];
    if (this.pattern === 'AS_PLAYED') {
      base = this.pressOrder.slice();
    } else {
      base = Array.from(this.held.keys()).sort((a, b) => a - b);
    }

    let single: number[];
    switch (this.pattern) {
      case 'UP':
        single = base;
        break;
      case 'DOWN':
        single = base.slice().reverse();
        break;
      case 'UP_DOWN':
        // ABCBA — no repeated endpoints. For < 2 notes, fall back to UP.
        single = base.length <= 1 ? base : base.concat(base.slice(1, -1).reverse());
        break;
      case 'UP_DOWN_INC':
        // ABCCBA — repeated endpoints.
        single = base.concat(base.slice().reverse());
        break;
      case 'RANDOM':
      case 'AS_PLAYED':
        single = base;
        break;
    }

    // Apply octave range. Velocity for each step inherits from the original
    // held note so an octave-shifted A still plays at the velocity you used
    // to press the A.
    const out: Array<{ note: number; velocity: number }> = [];
    for (let o = 0; o < this.octaveRange; o++) {
      for (const n of single) {
        const shifted = n + 12 * o;
        if (shifted <= 127) out.push({ note: shifted, velocity: this.held.get(n) ?? 0.85 });
      }
    }
    this.sequence = out;
    if (this.cursor >= this.sequence.length) this.cursor = 0;
  }

  private fireStep(): void {
    if (this.sequence.length === 0) return;
    let step: { note: number; velocity: number };
    if (this.pattern === 'RANDOM') {
      const idx = Math.floor(Math.random() * this.sequence.length);
      step = this.sequence[idx]!;
    } else {
      step = this.sequence[this.cursor]!;
      this.cursor = (this.cursor + 1) % this.sequence.length;
    }

    this.releaseLastPlayed();
    this.cb.noteOn(step.note, step.velocity);
    this.lastPlayed = step.note;

    // Schedule note-off at the gate fraction of the step length.
    const stepSec = this.computeStepSeconds();
    if (stepSec > 0 && this.gate < 1) {
      const releaseInMs = stepSec * 1000 * this.gate;
      this.lastPlayedReleaseTimer = setTimeout(() => {
        if (this.lastPlayed !== null) {
          this.cb.noteOff(this.lastPlayed);
          // We don't null lastPlayed here — fireStep() will check + nullify.
        }
        this.lastPlayedReleaseTimer = null;
      }, releaseInMs) as unknown as number;
    }
  }

  private releaseLastPlayed(): void {
    if (this.lastPlayedReleaseTimer !== null) {
      clearTimeout(this.lastPlayedReleaseTimer);
      this.lastPlayedReleaseTimer = null;
    }
    if (this.lastPlayed !== null) {
      this.cb.noteOff(this.lastPlayed);
      this.lastPlayed = null;
    }
  }

  /** Step length in seconds for INT clock — derived from BPM + subdivision. */
  private computeStepSeconds(): number {
    if (this.source === 'EXT') {
      // External: we don't really know — use a reasonable default for gate timing.
      // The 24-ppqn external clock gives us ticks; one quarter at the most recent
      // BPM estimate ≈ 60/bpm. Step = quarter * (subdivision / 24).
      const extBpm = externalClock.getBpm();
      return ((60 / extBpm) * this.subdivision) / 24;
    }
    return ((60 / this.bpm) * this.subdivision) / 24;
  }

  // ── start/stop ────────────────────────────────────────────────────────
  private startIfNeeded(): void {
    if (this.running || !this.enabled || this.sequence.length === 0) return;
    this.running = true;
    this.cursor = 0;
    this.startClockSubscriptions();
  }
  private stopAndFlush(): void {
    if (!this.running && this.lastPlayed === null) return;
    this.running = false;
    this.stopClockSubscriptions();
    this.releaseLastPlayed();
  }
  private startClockSubscriptions(): void {
    if (this.source === 'INT') {
      this.restartInternal();
    } else {
      this.externalTickCounter = 0;
      this.externalUnsub = externalClock.subscribe({
        onTick: () => {
          if (!this.running) return;
          this.externalTickCounter++;
          if (this.externalTickCounter >= this.subdivision) {
            this.externalTickCounter = 0;
            this.fireStep();
          }
        },
        onTransport: (state) => {
          if (state === 'stopped') this.releaseLastPlayed();
        },
      });
    }
  }
  private stopClockSubscriptions(): void {
    if (this.internalScheduler !== null) {
      clearInterval(this.internalScheduler);
      this.internalScheduler = null;
    }
    if (this.externalUnsub) {
      this.externalUnsub();
      this.externalUnsub = null;
    }
  }
  private restartInternal(): void {
    if (this.internalScheduler !== null) {
      clearInterval(this.internalScheduler);
      this.internalScheduler = null;
    }
    const stepMs = this.computeStepSeconds() * 1000;
    if (stepMs <= 0) return;
    this.internalScheduler = setInterval(() => this.fireStep(), stepMs) as unknown as number;
  }
}
