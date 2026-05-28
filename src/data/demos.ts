/**
 * Demo data model — event lists that drive the SIXinONE engine to
 * pre-recorded musical sequences without any audio files.
 *
 * A demo is a deterministic timeline of {@link DemoEvent}s scheduled
 * against `AudioContext.currentTime` by {@link DemoPlayer}. Each event
 * targets the synth's public API (noteOn / noteOff / preset change), the
 * preset signal (`param`) or per-voice controllers (pitch bend, mod wheel).
 *
 * Two reasons for the events-not-samples approach:
 *  1. The bundle stays tiny (an array of numbers, not megabytes of audio).
 *  2. The user *sees* the knobs move as the demo plays — that's the whole
 *     educational point. It's why we built the simulator in the first place.
 *
 * Legal: every "in-style" demo is an ORIGINAL composition in the mood of
 * an era, not a copy of a copyrighted song. Classical demos are sourced
 * from public-domain scores only.
 */

export type DemoCategory = 'style' | 'classical' | 'technical';

export type DemoEventType =
  | 'noteOn'
  | 'noteOff'
  | 'param'
  | 'preset'
  | 'pitchBend'
  | 'modWheel';

export type DemoRamp = 'linear' | 'exp' | 'step';

export interface DemoEvent {
  /** Seconds from the start of the demo. */
  time: number;
  type: DemoEventType;

  // noteOn / noteOff
  note?: number; // MIDI 0..127
  velocity?: number; // 0..1

  /**
   * Dotted-path into the preset object for `param` events
   * (e.g. 'filter.cutoff', 'osc2.coarse', 'fx.delay.mix').
   * The value is in the same units the panel knob uses (knob value 0..10,
   * boolean flags as 0/1, etc.) so the on-screen UI matches the audio.
   */
  target?: string;
  value?: number;
  ramp?: DemoRamp;

  // preset change
  presetNumber?: number; // 0..99

  // controllers
  bendSemitones?: number;
  modWheelValue?: number; // 0..127
}

export interface Demo {
  id: string;
  title: string;
  description: string;
  category: DemoCategory;
  /** Preset loaded when the demo starts (and restored when it stops). */
  defaultPreset: number;
  /** Wall-clock duration of the demo in seconds. */
  durationSec: number;
  bpm: number;
  events: DemoEvent[];
  /** Free-form credits/disclaimer line, surfaced under the player. */
  credits?: string;
  /**
   * `true` for the 100-presets tour — enables PREV/NEXT navigation in the
   * player UI to skip between automatic preset changes.
   */
  isLong?: boolean;
}

import { arenaSyncLead } from './demos/style-arena';
import { neonDrive } from './demos/style-neon';
import { cinematicSweep } from './demos/style-cinematic';
import { funkBassWorkout } from './demos/style-funk';
import { bachInvention } from './demos/classical-bach';
import { mozartEineKleine } from './demos/classical-mozart';
import { filterWorkout } from './demos/tech-filter';
import { presetsTour } from './demos/tech-presets-tour';

export const DEMOS: Demo[] = [
  arenaSyncLead,
  neonDrive,
  cinematicSweep,
  funkBassWorkout,
  bachInvention,
  mozartEineKleine,
  filterWorkout,
  presetsTour,
];

/** Lookup helper used by the per-preset PLAY button. */
export function findDemoForPreset(presetNumber: number): Demo | undefined {
  return DEMOS.find((d) => d.defaultPreset === presetNumber && !d.isLong);
}
