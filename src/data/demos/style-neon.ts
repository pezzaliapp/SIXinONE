/**
 * Neon Drive — synthwave brass stabs + mono bassline in Dm–F–C–G.
 *
 * ORIGINAL COMPOSITION. Alternates preset 2 (Brass 1) for the stabs and
 * preset 54 (Mono 1) for the sub bassline. The switch is bar-by-bar, so
 * the listener hears two complementary patches share one chord
 * progression — the synthwave staple.
 */

import type { Demo, DemoEvent } from '../demos';
import { chord, note, spb } from './_helpers';

function build(): Demo {
  const bpm = 100;
  const beat = spb(bpm); // 0.6 s
  const bar = beat * 4; // 2.4 s
  const sixteenth = beat / 4; // 0.15 s
  const events: DemoEvent[] = [];

  const chords: Array<{ stab: number[]; bassRoot: number }> = [
    { stab: [50, 53, 57], bassRoot: 38 }, // Dm: D F A / bass D2
    { stab: [53, 57, 60], bassRoot: 41 }, // F:  F A C / bass F2
    { stab: [48, 52, 55], bassRoot: 36 }, // C:  C E G / bass C2
    { stab: [55, 59, 62], bassRoot: 43 }, // G:  G B D / bass G2
  ];

  let t = 0;
  // Single cycle of Dm–F–C–G with brass+bass bars (8 bars = 19.2 s); the
  // tail stab brings the total to ~21 s, well under the advertised 25 s
  // window so the engine has time to release the FX tails.
  for (let cycle = 0; cycle < 1; cycle++) {
    for (const c of chords) {
      // --- Brass stab bar (preset 2) -----------------------------------
      events.push({ time: t, type: 'preset', presetNumber: 2 });
      // Four stabs on the downbeats with a short tail.
      for (let b = 0; b < 4; b++) {
        chord(events, t + b * beat + 0.005, c.stab, beat * 0.4, 0.95);
      }
      t += bar;

      // --- Bass bar (preset 54) ----------------------------------------
      events.push({ time: t, type: 'preset', presetNumber: 54 });
      // Syncopated 1/16 figure: R R 5 R | R 5 R 3 (semitones from root)
      const pattern = [0, 0, 7, 0, 0, 7, 0, 3, 0, 0, 7, 0, 12, 0, 7, 5];
      for (let i = 0; i < pattern.length; i++) {
        note(events, t + i * sixteenth, c.bassRoot + pattern[i]!, sixteenth * 0.8, 0.88);
      }
      t += bar;
    }
  }

  // Tail: one final brass stab on the tonic to end clean.
  events.push({ time: t, type: 'preset', presetNumber: 2 });
  chord(events, t + 0.02, [50, 53, 57], beat * 1.5, 1);

  events.sort((a, b) => a.time - b.time);

  return {
    id: 'neon-drive',
    title: 'Neon Drive',
    description: 'Synthwave brass stabs + mono bass alternation, Dm–F–C–G.',
    category: 'style',
    defaultPreset: 2,
    durationSec: 25,
    bpm,
    events,
    credits: 'Original composition — no copyrighted melodies.',
  };
}

export const neonDrive: Demo = build();
