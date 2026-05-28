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
 * Timing: the arpeggiator no longer owns a clock. It subscribes to the
 * shared {@link TransportClock} and advances every `subdivision` ticks of
 * the 24-ppqn signal. Tempo, source (INT/EXT) and transport state are all
 * decided by the transport — so the arp stays in lockstep with the
 * Sequencer automatically.
 *
 * Hold latch: when `hold` is set, removeHeldNote is ignored; toggling hold
 * off clears the latched set. Lets the user "freeze" an arpeggio and walk
 * away from the keys, just like the original Memorymoog HOLD switch.
 */

import { transportClock as defaultTransport, type TransportClock } from './transport-clock';

export type ArpPattern = 'UP' | 'DOWN' | 'UP_DOWN' | 'UP_DOWN_INC' | 'RANDOM' | 'AS_PLAYED';
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
  private hold = false;
  /** Gate time as a fraction of step length (0..1). 0.8 = 80% legato-ish. */
  private gate = 0.8;

  private held = new Map<number, number>(); // note → velocity
  private pressOrder: number[] = [];
  private sequence: Array<{ note: number; velocity: number }> = [];
  private cursor = 0;

  private running = false;
  private transportUnsub: (() => void) | null = null;
  private tickCounter = 0;
  private lastPlayed: number | null = null;
  private lastPlayedReleaseTimer: number | null = null;

  /** Injected transport — defaults to the singleton; tests pass their own. */
  private transport: TransportClock;

  constructor(private cb: ArpCallbacks, transport: TransportClock = defaultTransport) {
    this.transport = transport;
    // Listen the whole life of the arp; cheap and means we never miss a
    // tick due to subscribe/unsubscribe races.
    this.transportUnsub = this.transport.subscribe({
      onTick: () => {
        if (!this.running) return;
        this.tickCounter++;
        if (this.tickCounter >= this.subdivision) {
          this.tickCounter = 0;
          this.fireStep();
        }
      },
      onTransport: (state) => {
        if (state === 'stopped') this.releaseLastPlayed();
      },
    });
  }

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
    this.tickCounter = 0;
  }
  getSubdivision(): ArpSubdiv {
    return this.subdivision;
  }
  setBpm(bpm: number): void {
    this.transport.setBpm(bpm);
  }
  getBpm(): number {
    return this.transport.getBpm();
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

  /** Free the transport subscription — only call on Synth teardown. */
  destroy(): void {
    if (this.transportUnsub) {
      this.transportUnsub();
      this.transportUnsub = null;
    }
    this.flushAllNotes();
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

  /** Step length in seconds at the current global tempo. */
  private computeStepSeconds(): number {
    return ((60 / this.transport.getBpm()) * this.subdivision) / 24;
  }

  // ── start/stop helpers (engagement with the shared transport) ─────────
  private startIfNeeded(): void {
    if (this.running || !this.enabled || this.sequence.length === 0) return;
    this.running = true;
    this.cursor = 0;
    this.tickCounter = 0;
  }
  private stopAndFlush(): void {
    if (!this.running && this.lastPlayed === null) return;
    this.running = false;
    this.releaseLastPlayed();
  }
}
