/**
 * Tiny helpers shared across demo builders. Kept private to the demos
 * folder — outside code only ever touches the top-level Demo objects.
 */

import type { DemoEvent } from '../demos';

/** Push a noteOn + a noteOff `durSec` later. */
export function note(
  events: DemoEvent[],
  t: number,
  midi: number,
  durSec: number,
  velocity = 0.85,
): void {
  events.push({ time: t, type: 'noteOn', note: midi, velocity });
  events.push({ time: t + durSec, type: 'noteOff', note: midi });
}

/** Push the same note for every MIDI value in `notes` (e.g. a chord). */
export function chord(
  events: DemoEvent[],
  t: number,
  notes: number[],
  durSec: number,
  velocity = 0.85,
): void {
  for (const n of notes) note(events, t, n, durSec, velocity);
}

/**
 * Emit a series of `param` events that linearly sweep `target` from `v0` to
 * `v1` between `t0` and `t1`. Lots of small steps so the on-screen knob
 * animates smoothly (the engine doesn't interpolate `mutate()` calls).
 */
export function ramp(
  events: DemoEvent[],
  target: string,
  t0: number,
  t1: number,
  v0: number,
  v1: number,
  stepsPerSec = 12,
): void {
  const steps = Math.max(1, Math.floor((t1 - t0) * stepsPerSec));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    events.push({
      time: t0 + (t1 - t0) * k,
      type: 'param',
      target,
      value: v0 + (v1 - v0) * k,
      ramp: 'linear',
    });
  }
}

/** Seconds-per-beat at the given BPM. */
export function spb(bpm: number): number {
  return 60 / bpm;
}
