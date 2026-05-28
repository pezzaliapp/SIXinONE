/**
 * Funk Bass Workout — original syncopated bassline in E minor, 110 BPM,
 * with intermittent glide so the listener hears the classic mono synth
 * portamento between notes.
 */

import type { Demo, DemoEvent } from '../demos';
import { note, spb } from './_helpers';

function build(): Demo {
  const bpm = 110;
  const beat = spb(bpm); // ≈ 0.545 s
  const sixteenth = beat / 4;
  const events: DemoEvent[] = [];

  // Engage glide for the duration of the demo — short slide for funk feel.
  events.push({ time: 0, type: 'param', target: 'glide', value: 0.7 });
  events.push({ time: 0, type: 'param', target: 'glideOn', value: 1 });

  // E minor pentatonic on the lower octave: E2=40, G2=43, A2=45, B2=47, D3=50, E3=52
  const phrase: Array<[number, number]> = [
    // [pitch, durationInSixteenths]
    [40, 2], [40, 1], [45, 1], [40, 2], [43, 1], [40, 1], [47, 2], [50, 2], // bar A
    [40, 1], [40, 1], [40, 1], [45, 1], [43, 2], [40, 1], [40, 1], [38, 4], // bar B  D2 tail
  ];

  let t = 0;
  // Repeat the 8-bar phrase enough times to cover 20 s with a 0.2 s ramp-out.
  while (t < 19.5) {
    for (const [pitch, dur] of phrase) {
      const lenSec = dur * sixteenth;
      note(events, t, pitch, lenSec * 0.85, 0.9);
      t += lenSec;
      if (t >= 19.5) break;
    }
  }

  events.sort((a, b) => a.time - b.time);

  return {
    id: 'funk-bass-workout',
    title: 'Funk Bass Workout',
    description: 'Syncopated original mono bassline in E minor with glide.',
    category: 'style',
    defaultPreset: 54,
    durationSec: 20,
    bpm,
    events,
    credits: 'Original composition — no copyrighted melodies.',
  };
}

export const funkBassWorkout: Demo = build();
