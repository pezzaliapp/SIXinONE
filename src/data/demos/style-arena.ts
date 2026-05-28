/**
 * Arena Sync Lead — early-80s arena-rock lead in the spirit of stadium
 * synth solos, in A minor.
 *
 * ORIGINAL COMPOSITION — no copyrighted melodies referenced. The riff sits
 * on the A minor pentatonic with a couple of Aeolian colour notes; the
 * second half automates OSC2 coarse around its centre to surface the
 * sync-scream effect that's the whole point of preset 8.
 */

import type { Demo, DemoEvent } from '../demos';
import { note, ramp, spb } from './_helpers';

function build(): Demo {
  const bpm = 120;
  const beat = spb(bpm);
  const eighth = beat / 2;
  const sixteenth = beat / 4;
  const half = beat * 2;
  const events: DemoEvent[] = [];

  // ── Bar 1 (0..2s): main motif (A minor pentatonic with a passing F) ──
  note(events, 0 * eighth, 69, sixteenth * 1.6); // A4
  note(events, 1 * eighth, 72, sixteenth * 1.6); // C5
  note(events, 2 * eighth, 76, sixteenth * 1.6); // E5
  note(events, 3 * eighth, 72, sixteenth * 1.6); // C5
  note(events, 4 * eighth, 74, eighth * 0.8); // D5
  note(events, 5 * eighth, 77, eighth * 0.8); // F5
  note(events, 6 * eighth, 76, beat * 0.8); // E5 half

  // ── Bar 2 (2..4s): rising contour ──
  note(events, 2 + 0 * eighth, 69, sixteenth * 1.6);
  note(events, 2 + 1 * eighth, 72, sixteenth * 1.6);
  note(events, 2 + 2 * eighth, 76, sixteenth * 1.6);
  note(events, 2 + 3 * eighth, 79, sixteenth * 1.6); // G5
  note(events, 2 + 4 * eighth, 81, eighth * 0.8); // A5
  note(events, 2 + 5 * eighth, 79, eighth * 0.8); // G5
  note(events, 2 + 6 * eighth, 76, beat * 0.8); // E5

  // ── Bar 3 (4..6s): descent to V ──
  note(events, 4 + 0 * eighth, 79, sixteenth * 1.6);
  note(events, 4 + 1 * eighth, 76, sixteenth * 1.6);
  note(events, 4 + 2 * eighth, 74, sixteenth * 1.6);
  note(events, 4 + 3 * eighth, 72, sixteenth * 1.6);
  note(events, 4 + 4 * eighth, 71, eighth * 0.8); // B4 (raised → minor 5th)
  note(events, 4 + 5 * eighth, 69, eighth * 0.8); // A4
  note(events, 4 + 6 * eighth, 67, beat * 0.8); // G4

  // ── Bar 4 (6..8s): cadence + sustain ──
  note(events, 6 + 0 * eighth, 69, sixteenth * 1.6);
  note(events, 6 + 1 * eighth, 72, sixteenth * 1.6);
  note(events, 6 + 2 * eighth, 76, half * 0.95); // E5 held

  // ── Bars 5..8 (8..16s): same riff transposed up an octave for impact ──
  for (let i = 0; i < 14; i++) {
    const srcA = events[i * 2]!;
    const srcB = events[i * 2 + 1]!;
    if (srcA.type !== 'noteOn' || srcB.type !== 'noteOff') continue;
    events.push({ ...srcA, time: srcA.time + 8, note: srcA.note! + 12 });
    events.push({ ...srcB, time: srcB.time + 8, note: srcB.note! + 12 });
  }

  // ── Tail (16..20s): sustained note with osc2 coarse sweep ──
  note(events, 16, 76, 4); // E5 held for 4 seconds
  // OSC2 coarse modulation: -5 → +5 → -3 in slow waves (this is the sync scream)
  ramp(events, 'osc2.coarse', 16.0, 17.5, -5, 5);
  ramp(events, 'osc2.coarse', 17.5, 18.8, 5, -3);
  ramp(events, 'osc2.coarse', 18.8, 19.9, -3, 0);

  // Sort by time so the player's linear scan works.
  events.sort((a, b) => a.time - b.time);

  return {
    id: 'arena-sync-lead',
    title: 'Arena Sync Lead',
    description: 'Early-80s arena-rock sync lead in A minor with a sync-scream tail.',
    category: 'style',
    defaultPreset: 8,
    durationSec: 20,
    bpm,
    events,
    credits: 'Original composition — no copyrighted melodies.',
  };
}

export const arenaSyncLead: Demo = build();
