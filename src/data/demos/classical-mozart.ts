/**
 * W. A. Mozart — Eine kleine Nachtmusik, K. 525, 1st movement (1787).
 *
 * Public domain: Mozart died in 1791. The demo plays the iconic opening
 * eight bars on a polyphonic string preset, with the three voices voiced
 * as melody + harmony fifth + bass octave — the same three-line texture
 * Mozart's first-violin/second-violin/viola section uses in the original.
 */

import type { Demo, DemoEvent } from '../demos';
import { note } from './_helpers';

const BPM = 130;
const BEAT = 60 / BPM;
const E = BEAT / 2; // eighth
const Q = BEAT;
const BAR = BEAT * 4;

function build(): Demo {
  const events: DemoEvent[] = [];

  // The opening "Allegro" motif, transcribed for three voices on the
  // synth. Each entry is [time, melody midi, harmony midi (-3rd or unison),
  // bass midi (root), duration].
  const stabs: Array<[number, number, number, number, number]> = [
    // Bar 1 — G G D D | G G D
    [0 * BAR + 0 * E, 67, 62, 55, Q], // G4 + D4 + G3, quarter
    [0 * BAR + 2 * E, 74, 67, 55, Q], // D5 + G4 + G3
    [0 * BAR + 4 * E, 67, 62, 55, Q], // G4 + D4 + G3
    [0 * BAR + 6 * E, 74, 67, 55, E], // D5 + G4 + G3, eighth
    [0 * BAR + 7 * E, 67, 62, 55, E], // G4 + D4 + G3, eighth

    // Bar 2 — G B D arpeggio response
    [1 * BAR + 0 * E, 67, 59, 55, E], // G4 + B3 + G3
    [1 * BAR + 1 * E, 71, 62, 55, E], // B4 + D4 + G3
    [1 * BAR + 2 * E, 74, 67, 55, Q], // D5 + G4 + G3
    [1 * BAR + 4 * E, 74, 62, 50, Q], // D5 + D4 + D3
    [1 * BAR + 6 * E, 74, 62, 50, Q], // D5 + D4 + D3 (held)

    // Bar 3 — same shape one note higher (A scaffold)
    [2 * BAR + 0 * E, 69, 62, 57, Q], // A4 + D4 + A3
    [2 * BAR + 2 * E, 74, 69, 57, Q], // D5 + A4 + A3
    [2 * BAR + 4 * E, 69, 62, 57, Q], // A4 + D4 + A3
    [2 * BAR + 6 * E, 74, 69, 57, E],
    [2 * BAR + 7 * E, 69, 62, 57, E],

    // Bar 4 — A C# E arpeggio response (D major triad)
    [3 * BAR + 0 * E, 69, 61, 57, E], // A4 + C#4 + A3
    [3 * BAR + 1 * E, 73, 64, 57, E], // C#5 + E4 + A3
    [3 * BAR + 2 * E, 76, 69, 57, Q], // E5 + A4 + A3
    [3 * BAR + 4 * E, 74, 67, 55, Q], // D5 + G4 + G3 (return)
    [3 * BAR + 6 * E, 74, 67, 55, Q],

    // Bar 5 — descending scale (V cadence)
    [4 * BAR + 0 * E, 74, 67, 55, E], // D5
    [4 * BAR + 1 * E, 72, 65, 55, E], // C5  (b7 — flavour)
    [4 * BAR + 2 * E, 71, 64, 55, E], // B4
    [4 * BAR + 3 * E, 69, 62, 55, E], // A4
    [4 * BAR + 4 * E, 67, 59, 55, Q], // G4
    [4 * BAR + 6 * E, 67, 59, 50, Q], // G4 + B3 + D3

    // Bar 6 — V7 → I cadence
    [5 * BAR + 0 * E, 74, 65, 50, Q], // D5 + F4 + D3
    [5 * BAR + 2 * E, 71, 62, 50, Q], // B4 + D4 + D3
    [5 * BAR + 4 * E, 67, 62, 55, Q], // G4 + D4 + G3 (I)
    [5 * BAR + 6 * E, 67, 62, 55, Q],

    // Bar 7 — reprise of bar 1 for a strong tag
    [6 * BAR + 0 * E, 67, 62, 55, Q],
    [6 * BAR + 2 * E, 74, 67, 55, Q],
    [6 * BAR + 4 * E, 67, 62, 55, Q],
    [6 * BAR + 6 * E, 74, 67, 55, E],
    [6 * BAR + 7 * E, 67, 62, 55, E],
  ];

  for (const [t, m, h, b, dur] of stabs) {
    note(events, t, m, dur * 0.92, 0.85);
    note(events, t, h, dur * 0.92, 0.7);
    note(events, t, b, dur * 0.92, 0.75);
  }

  // Bar 8 — final long G major chord held to fill out 20 s.
  const finalT = 7 * BAR;
  for (const n of [55, 62, 67, 71, 74]) {
    note(events, finalT, n, 20 - finalT - 0.05, 0.85);
  }

  events.sort((a, b) => a.time - b.time);

  return {
    id: 'mozart-eine-kleine',
    title: 'Mozart — Eine kleine Nachtmusik',
    description: 'K. 525 opening, three-voice strings in G major.',
    category: 'classical',
    defaultPreset: 1,
    durationSec: 20,
    bpm: BPM,
    events,
    credits: 'W. A. Mozart, K. 525 (public domain).',
  };
}

export const mozartEineKleine: Demo = build();
