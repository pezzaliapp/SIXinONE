/**
 * External MIDI clock receiver.
 *
 * Consumes the MIDI Real-Time clock byte stream (0xF8 at 24 ppqn) plus the
 * transport-start/continue/stop messages, exposes:
 *   - a live BPM estimate (moving average over one quarter = 24 ticks),
 *   - per-tick callbacks (so the sequencer can advance step-by-step),
 *   - per-quarter callbacks (UI BPM tally),
 *   - transport state.
 *
 * Treats prolonged silence (> SILENCE_THRESHOLD_MS without a 0xF8) as
 * "external clock disconnected": isPresent() returns false until a tick
 * arrives again. The sequencer uses that to fall back to its internal
 * clock automatically.
 */

const TICKS_PER_QUARTER = 24;
const SILENCE_THRESHOLD_MS = 1000;
const BPM_SMOOTHING = 8; // tighter than full 24 — faster reaction to tempo changes

import type { MidiMessage } from './messages';

export type TransportState = 'stopped' | 'running' | 'paused';

export interface ExternalClockListener {
  onTick?: (tickIndex: number, audioTime?: number) => void;
  onQuarter?: (bpm: number) => void;
  onTransport?: (state: TransportState) => void;
  onSongPos?: (positionIn16ths: number) => void;
  onPresenceChange?: (present: boolean) => void;
}

export class ExternalClock {
  private tickIntervals: number[] = [];
  private lastTickAt = -Infinity;
  private tickCount = 0;
  private bpmEstimate = 120;
  private listeners = new Set<ExternalClockListener>();
  private transport: TransportState = 'stopped';
  private present = false;
  private watchdog: number | null = null;

  subscribe(l: ExternalClockListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Hand the next MIDI message to the clock. No-op for non-clock messages. */
  handle(msg: MidiMessage): void {
    if (msg.type === 'clock') this.tick();
    else if (msg.type === 'start') this.setTransport('running', /*reset*/ true);
    else if (msg.type === 'continue') this.setTransport('running');
    else if (msg.type === 'stop') this.setTransport('stopped');
    else if (msg.type === 'songPos') {
      for (const l of this.listeners) l.onSongPos?.(msg.position);
    }
  }

  private tick(): void {
    const now = performance.now();
    if (Number.isFinite(this.lastTickAt)) {
      const dt = now - this.lastTickAt;
      this.tickIntervals.push(dt);
      if (this.tickIntervals.length > BPM_SMOOTHING) this.tickIntervals.shift();
      // BPM from tick interval: ticks/min = 60_000 / dt, quarters/min = ticks/24
      const avg = this.tickIntervals.reduce((a, b) => a + b, 0) / this.tickIntervals.length;
      this.bpmEstimate = avg > 0 ? 60_000 / (avg * TICKS_PER_QUARTER) : this.bpmEstimate;
    }
    this.lastTickAt = now;
    if (!this.present) {
      this.present = true;
      for (const l of this.listeners) l.onPresenceChange?.(true);
    }
    this.armWatchdog();
    this.tickCount = (this.tickCount + 1) % TICKS_PER_QUARTER;
    for (const l of this.listeners) l.onTick?.(this.tickCount);
    if (this.tickCount === 0) {
      for (const l of this.listeners) l.onQuarter?.(this.bpmEstimate);
    }
  }

  private armWatchdog(): void {
    if (this.watchdog !== null) clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      this.present = false;
      this.tickIntervals.length = 0;
      this.watchdog = null;
      for (const l of this.listeners) l.onPresenceChange?.(false);
    }, SILENCE_THRESHOLD_MS) as unknown as number;
  }

  private setTransport(state: TransportState, reset = false): void {
    if (reset) this.tickCount = 0;
    this.transport = state;
    for (const l of this.listeners) l.onTransport?.(state);
  }

  getBpm(): number {
    return this.bpmEstimate;
  }
  isPresent(): boolean {
    return this.present;
  }
  getTransport(): TransportState {
    return this.transport;
  }
}

export const externalClock = new ExternalClock();
