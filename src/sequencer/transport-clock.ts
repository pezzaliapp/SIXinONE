/**
 * TransportClock — single source of musical time for the sequencer, the
 * arpeggiator, and any future module that needs to ride the project tempo.
 *
 * Concept:
 *   - One global BPM, one source (INT panel tempo, or EXT MIDI clock).
 *   - One transport state (playing / stopped) with start / stop / continue.
 *   - Emits ticks at 24 ppqn, exactly like a hardware MIDI clock. Subscribers
 *     decimate as they wish (Sequencer = step subdivision; Arp = step
 *     subdivision; FX = could resync delays). No one runs a private timer
 *     anymore, so cross-module drift is impossible by construction.
 *
 * INT mode:
 *   A `setInterval` paces a 24-ppqn tick. BPM changes rebuild the interval
 *   without losing the running state.
 *
 * EXT mode:
 *   We subscribe to {@link externalClock} (the MIDI Real-Time service from
 *   Step 6 of v2). Its onTick / onTransport / onSongPos callbacks are
 *   forwarded verbatim — so the DAW's start / stop / position move both
 *   the sequencer step cursor and the arp's note pointer together.
 *
 * Tap tempo:
 *   The user can tap a button; the last few intervals are averaged to a
 *   BPM. Resets after a 2-second silence so a fresh series of taps starts
 *   a new tempo instead of polluting the average.
 */

import { externalClock } from '../midi/external-clock';

export type ClockSource = 'INT' | 'EXT';
export type TransportPhase = 'stopped' | 'playing';

export interface TransportListener {
  onTick?: (tickIndex: number) => void;
  onQuarter?: (bpm: number) => void;
  onTransport?: (state: TransportPhase) => void;
  onSongPos?: (positionIn16ths: number) => void;
  onBpmChange?: (bpm: number) => void;
  onSourceChange?: (source: ClockSource) => void;
}

const TICKS_PER_QUARTER = 24;
const TAP_HISTORY = 4;
const TAP_RESET_MS = 2000;

export class TransportClock {
  private bpm = 120;
  private source: ClockSource = 'INT';
  private phase: TransportPhase = 'stopped';
  /** Continuous tick counter — never resets across stops, useful for stable indexing. */
  private tickCount = 0;
  private listeners = new Set<TransportListener>();

  private internalScheduler: number | null = null;
  private externalUnsub: (() => void) | null = null;

  private tapTimes: number[] = [];

  constructor() {
    // No automatic scheduler startup — wait for the first subscriber. Saves
    // CPU when nothing's listening and lets test code pace ticks under fake
    // timers (the scheduler is created after fake timers are installed).
  }

  // ── configuration ────────────────────────────────────────────────────
  setBpm(bpm: number, fromUser = true): void {
    const clamped = Math.max(30, Math.min(360, bpm));
    if (clamped === this.bpm) return;
    this.bpm = clamped;
    for (const l of this.listeners) l.onBpmChange?.(this.bpm);
    if (fromUser && this.source === 'INT') this.restartInternal();
  }
  getBpm(): number {
    return this.bpm;
  }

  setSource(src: ClockSource): void {
    if (src === this.source) return;
    this.source = src;
    this.stopAllClocks();
    this.startClock();
    for (const l of this.listeners) l.onSourceChange?.(src);
  }
  getSource(): ClockSource {
    return this.source;
  }

  // ── transport ────────────────────────────────────────────────────────
  start(): void {
    this.tickCount = 0;
    this.setPhase('playing');
  }
  continueTransport(): void {
    this.setPhase('playing');
  }
  stop(): void {
    this.setPhase('stopped');
  }
  toggle(): void {
    if (this.phase === 'playing') this.stop();
    else this.start();
  }
  isPlaying(): boolean {
    return this.phase === 'playing';
  }
  getPhase(): TransportPhase {
    return this.phase;
  }

  // ── tap tempo ────────────────────────────────────────────────────────
  tap(): number | null {
    const now = performance.now();
    const last = this.tapTimes[this.tapTimes.length - 1];
    if (last !== undefined && now - last > TAP_RESET_MS) this.tapTimes.length = 0;
    this.tapTimes.push(now);
    if (this.tapTimes.length > TAP_HISTORY) this.tapTimes.shift();
    if (this.tapTimes.length < 2) return null;
    const intervals: number[] = [];
    for (let i = 1; i < this.tapTimes.length; i++) {
      intervals.push(this.tapTimes[i]! - this.tapTimes[i - 1]!);
    }
    const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = 60_000 / avgMs;
    this.setBpm(bpm);
    return this.bpm;
  }

  // ── subscriptions ────────────────────────────────────────────────────
  subscribe(listener: TransportListener): () => void {
    const wasEmpty = this.listeners.size === 0;
    this.listeners.add(listener);
    // Hand subscribers the current state so they don't render stale UI.
    listener.onBpmChange?.(this.bpm);
    listener.onSourceChange?.(this.source);
    listener.onTransport?.(this.phase);
    if (wasEmpty) this.startClock();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stopAllClocks();
    };
  }

  // ── internals ────────────────────────────────────────────────────────
  private setPhase(p: TransportPhase): void {
    if (p === this.phase) return;
    this.phase = p;
    for (const l of this.listeners) l.onTransport?.(p);
  }

  private emitTick(): void {
    this.tickCount = (this.tickCount + 1) % (TICKS_PER_QUARTER * 4096);
    const tickInQuarter = this.tickCount % TICKS_PER_QUARTER;
    for (const l of this.listeners) l.onTick?.(this.tickCount);
    if (tickInQuarter === 0) {
      for (const l of this.listeners) l.onQuarter?.(this.bpm);
    }
  }

  private startClock(): void {
    if (this.source === 'INT') this.startInternalIfNeeded();
    else this.startExternalIfNeeded();
  }

  private startInternalIfNeeded(): void {
    if (this.internalScheduler !== null) return;
    const tickMs = 60_000 / (this.bpm * TICKS_PER_QUARTER);
    this.internalScheduler = setInterval(() => this.emitTick(), tickMs) as unknown as number;
  }
  private restartInternal(): void {
    if (this.internalScheduler !== null) {
      clearInterval(this.internalScheduler);
      this.internalScheduler = null;
    }
    this.startInternalIfNeeded();
  }
  private startExternalIfNeeded(): void {
    if (this.externalUnsub) return;
    this.externalUnsub = externalClock.subscribe({
      onTick: () => this.emitTick(),
      onTransport: (state) => {
        if (state === 'running') this.start();
        else if (state === 'stopped') this.stop();
      },
      onSongPos: (pos) => {
        for (const l of this.listeners) l.onSongPos?.(pos);
      },
      onQuarter: (bpm) => {
        // Mirror the external estimated BPM so UI shows a live number.
        this.bpm = Math.max(30, Math.min(360, bpm));
        for (const l of this.listeners) l.onBpmChange?.(this.bpm);
      },
    });
  }
  private stopAllClocks(): void {
    if (this.internalScheduler !== null) {
      clearInterval(this.internalScheduler);
      this.internalScheduler = null;
    }
    if (this.externalUnsub) {
      this.externalUnsub();
      this.externalUnsub = null;
    }
  }
}

export const transportClock = new TransportClock();
