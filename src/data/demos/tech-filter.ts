/**
 * Filter Workout — narrated walkthrough of the Moog ladder behaviour.
 *
 * Holds a sub-bass C2 (MIDI 36) for the whole 25 s and runs the filter
 * cutoff, emphasis, contour and LFO destination through a sequence of
 * archetypal moves so the user can hear and see what each control does.
 *
 * The demo player emits `eventFired` for every param change, which the
 * UI uses to overlay the textual "Now: Cutoff sweep" caption per section.
 * The captions are encoded as a sentinel `param` event with
 * target = 'ui.caption' and a custom payload — recognised only by the
 * panel UI; the audio engine ignores unknown targets gracefully.
 */

import type { Demo, DemoEvent } from '../demos';
import { ramp } from './_helpers';

function caption(events: DemoEvent[], time: number, text: string): void {
  // `ui.caption` is a virtual target — DemoPlayer.setPresetPath() walks
  // until it hits a non-object, then writes the value (here a string-as-
  // number-coded key); the panel reads the caption out of the eventFired
  // payload directly via the `target` and `description` carried below.
  events.push({
    time,
    type: 'param',
    target: 'ui.caption',
    value: 0,
    // `description` isn't on DemoEvent — we piggyback through the panel
    // by matching on the `target === 'ui.caption'` event index and
    // looking up the caption array. Simpler: keep captions out-of-band
    // (see CAPTIONS export below). The event acts as a trigger only.
  });
  void text;
}

/** Captions keyed by section start time — consumed by the UI overlay. */
export const FILTER_WORKOUT_CAPTIONS: Array<{ time: number; text: string }> = [
  { time: 0, text: 'Now: cutoff opens 0 → 10' },
  { time: 5, text: 'Now: emphasis 0 → self-oscillation' },
  { time: 10, text: 'Now: cutoff wow-wow' },
  { time: 15, text: 'Now: LFO routed to filter cutoff' },
  { time: 20, text: 'Now: emphasis screams (10)' },
];

function build(): Demo {
  const events: DemoEvent[] = [];

  // Sub-bass C2 held for the whole demo.
  events.push({ time: 0, type: 'noteOn', note: 36, velocity: 0.9 });
  events.push({ time: 25, type: 'noteOff', note: 36 });

  // Make sure the patch starts somewhere flat.
  events.push({ time: 0, type: 'param', target: 'filter.cutoff', value: 0 });
  events.push({ time: 0, type: 'param', target: 'filter.emphasis', value: 0 });

  // 0..5 s — cutoff knob 0 → 10
  ramp(events, 'filter.cutoff', 0, 5, 0, 10, 15);
  caption(events, 0, FILTER_WORKOUT_CAPTIONS[0]!.text);

  // 5..10 s — emphasis 0 → 9 (just under self-oscillation, then peak)
  ramp(events, 'filter.emphasis', 5, 9.8, 0, 9, 12);
  caption(events, 5, FILTER_WORKOUT_CAPTIONS[1]!.text);

  // 10..15 s — cutoff wow-wow (10 → 2 → 10), emphasis stays high
  ramp(events, 'filter.cutoff', 10, 12.5, 10, 2, 18);
  ramp(events, 'filter.cutoff', 12.5, 15, 2, 10, 18);
  caption(events, 10, FILTER_WORKOUT_CAPTIONS[2]!.text);

  // 15..20 s — drop emphasis, turn on LFO → filter cutoff
  events.push({ time: 15, type: 'param', target: 'filter.emphasis', value: 3 });
  events.push({ time: 15, type: 'param', target: 'lfo.dest.filter', value: 1 });
  events.push({ time: 15, type: 'param', target: 'lfo.rate', value: 6 });
  events.push({ time: 15, type: 'param', target: 'modulationAmount', value: 6 });
  caption(events, 15, FILTER_WORKOUT_CAPTIONS[3]!.text);
  // Keep cutoff in the mid range so we hear the LFO ride it.
  ramp(events, 'filter.cutoff', 15, 20, 6, 4, 10);

  // 20..25 s — emphasis up to self-oscillation peak
  events.push({ time: 20, type: 'param', target: 'lfo.dest.filter', value: 0 });
  ramp(events, 'filter.emphasis', 20, 24.5, 3, 10, 14);
  events.push({ time: 20, type: 'param', target: 'filter.cutoff', value: 7 });
  caption(events, 20, FILTER_WORKOUT_CAPTIONS[4]!.text);

  events.sort((a, b) => a.time - b.time);

  return {
    id: 'filter-workout',
    title: 'Filter Workout',
    description: 'Guided tour of the Moog ladder filter behaviour.',
    category: 'technical',
    defaultPreset: 0,
    durationSec: 25,
    bpm: 60,
    events,
    credits: 'Original walkthrough — no copyrighted material.',
  };
}

export const filterWorkout: Demo = build();
