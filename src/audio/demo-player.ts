/**
 * DemoPlayer — schedules a {@link Demo} against the live synth.
 *
 * Architecture:
 *  - Time base: `AudioContext.currentTime` (precise scheduling for audio).
 *    `setTimeout` is only used for *visual* knob mutations, where ±1 frame
 *    of drift is invisible.
 *  - noteOn/noteOff events flow through the existing voice allocator
 *    (`Synth.noteOn / noteOff`) — no parallel polyphony engine.
 *  - param events mutate the preset Signal via `mutate()`, so the panel
 *    knob/switch components reactively redraw. The next voice created by
 *    the engine picks up the new value automatically. (Modulating an
 *    AudioParam of an already-playing note isn't covered here — the v2.2
 *    engine retriggers per noteOn, so demos that need sweeps simply
 *    re-trigger or pre-emit a series of `param` events with a `linear`
 *    ramp interpreted as a stepped sweep on the UI side.)
 *  - preset events call `loadPreset(presetBank.get(N))`.
 *  - Stop semantics: cancel pending visual timers, panic the synth, and
 *    restore the demo's defaultPreset (matches the "leave nothing behind"
 *    UX in the spec).
 *  - Progress + event callbacks fire via a `requestAnimationFrame` loop
 *    so the UI can render at vsync without overrunning the event tape.
 */

import type { Synth } from './synth';
import { getAudioContext } from './context';
import { presetBank } from '../data/preset-bank';
import {
  currentPreset,
  loadPreset,
  mutate as mutateStore,
} from '../state/store';
import type { Demo, DemoEvent } from '../data/demos';
import type { Preset } from '../data/preset';

export type DemoPlayerEvent = 'progress' | 'end' | 'eventFired' | 'state';

export type DemoPlayerState = 'idle' | 'playing' | 'paused';

export interface ProgressInfo {
  currentTime: number;
  duration: number;
  fraction: number;
}

type Listener<T> = (payload: T) => void;

interface ScheduledTimer {
  id: number;
  type: 'setTimeout' | 'raf';
}

export class DemoPlayer {
  private demo: Demo | null = null;
  private state: DemoPlayerState = 'idle';
  private startedAtCtxTime = 0;
  private elapsedBeforePause = 0;
  private timers: ScheduledTimer[] = [];
  private rafHandle: number | null = null;
  private firedIdx = 0;
  private snapshotPreset: Preset | null = null;
  /** For long demos (presets tour) — quick jump indexing. */
  private presetMarkers: Array<{ time: number; presetNumber: number }> = [];

  private progressListeners = new Set<Listener<ProgressInfo>>();
  private endListeners = new Set<Listener<void>>();
  private eventListeners = new Set<Listener<DemoEvent>>();
  private stateListeners = new Set<Listener<DemoPlayerState>>();

  constructor(private synth: Synth) {}

  // ── public surface ───────────────────────────────────────────────────
  get isPlaying(): boolean {
    return this.state === 'playing';
  }
  get currentTime(): number {
    if (this.state === 'playing') {
      return getAudioContext().currentTime - this.startedAtCtxTime;
    }
    return this.elapsedBeforePause;
  }
  get currentDemo(): Demo | null {
    return this.demo;
  }
  getState(): DemoPlayerState {
    return this.state;
  }

  load(demo: Demo): void {
    this.stop();
    this.demo = demo;
    this.elapsedBeforePause = 0;
    this.firedIdx = 0;
    this.snapshotPreset = currentPreset.get();
    this.presetMarkers = demo.events
      .filter((e) => e.type === 'preset' && typeof e.presetNumber === 'number')
      .map((e) => ({ time: e.time, presetNumber: e.presetNumber! }));
    loadPreset(presetBank.get(demo.defaultPreset));
    this.setState('idle');
  }

  play(): void {
    if (!this.demo) return;
    if (this.state === 'playing') return;
    const ctx = getAudioContext();
    this.startedAtCtxTime = ctx.currentTime - this.elapsedBeforePause;
    this.setState('playing');
    this.scheduleRaf();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.elapsedBeforePause = this.currentTime;
    this.cancelRaf();
    this.cancelTimers();
    this.setState('paused');
  }

  stop(): void {
    if (!this.demo) return;
    this.cancelRaf();
    this.cancelTimers();
    this.synth.panic();
    if (this.snapshotPreset && this.demo && !this.demo.isLong) {
      loadPreset(this.snapshotPreset);
    } else if (this.snapshotPreset && this.demo?.isLong) {
      // Spec: the 100-presets tour leaves the last loaded preset for
      // discoverability. Other demos restore.
    }
    this.elapsedBeforePause = 0;
    this.firedIdx = 0;
    this.setState('idle');
  }

  seek(seconds: number): void {
    if (!this.demo) return;
    const target = Math.max(0, Math.min(this.demo.durationSec, seconds));
    const wasPlaying = this.state === 'playing';
    if (wasPlaying) this.pause();
    this.elapsedBeforePause = target;
    this.firedIdx = this.demo.events.findIndex((e) => e.time >= target);
    if (this.firedIdx < 0) this.firedIdx = this.demo.events.length;
    if (wasPlaying) this.play();
  }

  /** Skip to the next `preset` marker (only meaningful for long demos). */
  next(): void {
    if (!this.demo?.isLong) return;
    const now = this.currentTime + 0.01;
    const next = this.presetMarkers.find((m) => m.time > now);
    if (next) this.seek(next.time);
    else this.seek(this.demo.durationSec);
  }

  prev(): void {
    if (!this.demo?.isLong) return;
    const now = this.currentTime - 0.01;
    // The "current" marker is the most recent one in the past; PREV jumps
    // to the one before that — classic media-player semantics.
    const markersInPast = this.presetMarkers.filter((m) => m.time < now);
    if (markersInPast.length >= 2) {
      this.seek(markersInPast[markersInPast.length - 2]!.time);
    } else {
      this.seek(0);
    }
  }

  onProgress(cb: Listener<ProgressInfo>): () => void {
    this.progressListeners.add(cb);
    return () => this.progressListeners.delete(cb);
  }
  onEnd(cb: Listener<void>): () => void {
    this.endListeners.add(cb);
    return () => this.endListeners.delete(cb);
  }
  onEventFired(cb: Listener<DemoEvent>): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }
  onStateChange(cb: Listener<DemoPlayerState>): () => void {
    this.stateListeners.add(cb);
    cb(this.state);
    return () => this.stateListeners.delete(cb);
  }

  // ── internals ────────────────────────────────────────────────────────
  private setState(s: DemoPlayerState): void {
    if (s === this.state) return;
    this.state = s;
    for (const cb of this.stateListeners) cb(s);
  }

  private scheduleRaf(): void {
    if (this.rafHandle !== null) return;
    const loop = (): void => {
      this.rafHandle = null;
      if (this.state !== 'playing' || !this.demo) return;
      this.tick();
      if (this.state === 'playing') this.scheduleRaf();
    };
    this.rafHandle =
      typeof requestAnimationFrame !== 'undefined'
        ? requestAnimationFrame(loop)
        : (setTimeout(loop, 16) as unknown as number);
  }

  private cancelRaf(): void {
    if (this.rafHandle === null) return;
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafHandle);
    } else {
      clearTimeout(this.rafHandle);
    }
    this.rafHandle = null;
  }

  private cancelTimers(): void {
    for (const t of this.timers) {
      if (t.type === 'setTimeout') clearTimeout(t.id);
    }
    this.timers.length = 0;
  }

  private tick(): void {
    if (!this.demo) return;
    const now = this.currentTime;

    // Fire any events whose time has come.
    while (
      this.firedIdx < this.demo.events.length &&
      this.demo.events[this.firedIdx]!.time <= now
    ) {
      const ev = this.demo.events[this.firedIdx]!;
      this.applyEvent(ev);
      for (const cb of this.eventListeners) cb(ev);
      this.firedIdx++;
    }

    const info: ProgressInfo = {
      currentTime: now,
      duration: this.demo.durationSec,
      fraction: Math.min(1, now / this.demo.durationSec),
    };
    for (const cb of this.progressListeners) cb(info);

    if (now >= this.demo.durationSec) {
      this.handleEnd();
    }
  }

  private handleEnd(): void {
    const demo = this.demo;
    this.cancelRaf();
    this.cancelTimers();
    this.synth.panic();
    if (this.snapshotPreset && demo && !demo.isLong) {
      loadPreset(this.snapshotPreset);
    }
    this.elapsedBeforePause = 0;
    this.firedIdx = 0;
    this.setState('idle');
    for (const cb of this.endListeners) cb();
  }

  // ── per-event handlers ────────────────────────────────────────────────
  private applyEvent(ev: DemoEvent): void {
    switch (ev.type) {
      case 'noteOn':
        if (typeof ev.note === 'number') {
          this.synth.noteOn(ev.note, ev.velocity ?? 0.85);
        }
        break;
      case 'noteOff':
        if (typeof ev.note === 'number') this.synth.noteOff(ev.note);
        break;
      case 'preset':
        if (typeof ev.presetNumber === 'number') {
          loadPreset(presetBank.get(ev.presetNumber));
        }
        break;
      case 'pitchBend':
        this.synth.setPitchBend(ev.bendSemitones ?? 0);
        break;
      case 'modWheel':
        this.synth.setModWheel(ev.modWheelValue ?? 0);
        break;
      case 'param':
        if (ev.target && typeof ev.value === 'number') {
          setPresetPath(ev.target, ev.value);
        }
        break;
    }
  }
}

/** Mutate the preset signal via a dotted path. */
function setPresetPath(path: string, value: number): void {
  mutateStore((draft) => {
    const parts = path.split('.');
    let cursor: Record<string, unknown> = draft as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!;
      const next = cursor[key];
      if (next === undefined || next === null || typeof next !== 'object') return;
      cursor = next as Record<string, unknown>;
    }
    const last = parts[parts.length - 1]!;
    cursor[last] = value;
  });
}
