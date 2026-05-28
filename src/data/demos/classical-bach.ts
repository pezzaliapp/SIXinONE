/**
 * J. S. Bach — Invention no. 1 in C major, BWV 772 (1723).
 *
 * Public domain: Bach died in 1750. The demo plays the famous incipit on
 * a harpsichord patch, with the left-hand voice entering one bar later
 * (the canonical two-voice imitation that defines the piece).
 *
 * Tribute: this preset choice is a deliberate nod to Wendy Carlos and
 * "Switched-On Bach" (1968) — the album that put synth-classical on the
 * map and an explicit reference in the v2 prompt.
 */

import type { Demo, DemoEvent } from '../demos';
import { note } from './_helpers';

const BPM = 96;
const BEAT = 60 / BPM;
const SX = BEAT / 4; // sixteenth
const BAR = BEAT * 4;

/** RH incipit, exactly as written in the v2 prompt. */
const INCIPIT_RH = [72, 74, 76, 77, 74, 76, 72, 79, 84, 83, 84, 86, 79, 81, 83, 84];

/** A complementary scalar phrase in C major to extend the piece. */
const ANSWER_RH = [83, 81, 79, 77, 76, 77, 79, 81, 83, 84, 83, 81, 79, 77, 76, 72];

function playVoice(
  events: DemoEvent[],
  t0: number,
  midiSeq: number[],
  velocity = 0.85,
): number {
  let t = t0;
  for (const m of midiSeq) {
    note(events, t, m, SX * 0.9, velocity);
    t += SX;
  }
  return t;
}

function build(): Demo {
  const events: DemoEvent[] = [];

  // Bar 1 — RH solo statement (0 .. 2.5 s)
  playVoice(events, 0, INCIPIT_RH, 0.8);

  // Bar 2 — LH enters one octave down; RH plays the answer phrase
  playVoice(events, 1 * BAR, INCIPIT_RH.map((n) => n - 12), 0.8);
  playVoice(events, 1 * BAR, ANSWER_RH, 0.8);

  // Bar 3 — RH back to the incipit; LH plays the answer one octave down
  playVoice(events, 2 * BAR, INCIPIT_RH, 0.8);
  playVoice(events, 2 * BAR, ANSWER_RH.map((n) => n - 12), 0.8);

  // Bar 4 — both voices play the answer phrase, mirrored
  playVoice(events, 3 * BAR, ANSWER_RH, 0.8);
  playVoice(events, 3 * BAR, ANSWER_RH.map((n) => n - 12), 0.8);

  // Bar 5 — repeat the opening canon a tone higher (D minor flavour) to
  // keep the listener engaged into the back half
  playVoice(events, 4 * BAR, INCIPIT_RH.map((n) => n + 2), 0.8);
  playVoice(events, 4 * BAR, INCIPIT_RH.map((n) => n - 10), 0.8);

  // Bar 6 — return home, RH descending scale, LH closing material
  playVoice(events, 5 * BAR, ANSWER_RH, 0.8);
  playVoice(events, 5 * BAR, INCIPIT_RH.map((n) => n - 12), 0.8);

  // Bar 7 — third voice doubles in octaves for a fuller cadence push
  playVoice(events, 6 * BAR, INCIPIT_RH, 0.85);
  playVoice(events, 6 * BAR, INCIPIT_RH.map((n) => n - 12), 0.85);

  // Bar 8 — final cadence sequence (V → I), held C major chord
  playVoice(events, 7 * BAR, [79, 77, 76, 74, 72, 74, 76, 72], 0.85);
  // C major triad held to the end of the demo
  for (const n of [60, 64, 67, 72]) {
    note(events, 7 * BAR + 4 * SX, n, 30 - (7 * BAR + 4 * SX), 0.9);
  }

  events.sort((a, b) => a.time - b.time);

  return {
    id: 'bach-invention-no-1',
    title: 'Bach — Invention no. 1',
    description: 'BWV 772 in C major, two-voice canon on harpsichord.',
    category: 'classical',
    defaultPreset: 49,
    durationSec: 30,
    bpm: BPM,
    events,
    credits:
      'J. S. Bach, BWV 772 (public domain). Patch tribute to Wendy Carlos, Switched-On Bach (1968).',
  };
}

export const bachInvention: Demo = build();
