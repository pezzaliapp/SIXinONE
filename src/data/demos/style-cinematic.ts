/**
 * Cinematic Sweep — slow harmonic shift (Em7 → Cmaj9) with a giant filter
 * sweep, plate-reverb tail. The preset is loaded as-is from the bank
 * (preset 0 already ships with plate reverb on).
 */

import type { Demo, DemoEvent } from '../demos';
import { ramp } from './_helpers';

function build(): Demo {
  const events: DemoEvent[] = [];

  // Ensure the plate reverb is engaged (the preset default may already have
  // this on; emitting the param explicitly lets viewers see the FX LED).
  events.push({ time: 0, type: 'param', target: 'fx.reverb.enabled', value: 1 });
  events.push({ time: 0, type: 'param', target: 'fx.reverb.mix', value: 0.4 });

  // ── Em7: E3 G3 B3 D4 (MIDI 52 55 59 62) sustained 0..15s ────────────
  const em7 = [52, 55, 59, 62];
  for (const n of em7) {
    events.push({ time: 0.01, type: 'noteOn', note: n, velocity: 0.7 });
    events.push({ time: 15, type: 'noteOff', note: n });
  }

  // Filter cutoff 1 → 7, emphasis 2 → 5 over the first 12 seconds.
  ramp(events, 'filter.cutoff', 0.1, 12, 1, 7);
  ramp(events, 'filter.emphasis', 0.1, 12, 2, 5);

  // ── Cmaj9: C3 E3 G3 B3 D4 (48 52 55 59 62) sustained 15..30s ────────
  const cmaj9 = [48, 52, 55, 59, 62];
  for (const n of cmaj9) {
    events.push({ time: 15.05, type: 'noteOn', note: n, velocity: 0.7 });
    events.push({ time: 30, type: 'noteOff', note: n });
  }
  // Resolve the filter back to a brighter open setting on the new chord.
  ramp(events, 'filter.cutoff', 15.05, 27, 7, 8.5);
  ramp(events, 'filter.emphasis', 15.05, 27, 5, 3);

  events.sort((a, b) => a.time - b.time);

  return {
    id: 'cinematic-sweep',
    title: 'Cinematic Sweep',
    description: 'Em7 → Cmaj9 pad with a slow filter sweep and plate-reverb tail.',
    category: 'style',
    defaultPreset: 0,
    durationSec: 30,
    bpm: 60,
    events,
    credits: 'Original composition — no copyrighted melodies.',
  };
}

export const cinematicSweep: Demo = build();
