/**
 * Five hand-crafted presets used for audio engine bring-up.
 * Each one targets an archetype documented in the design brief:
 *   #1  String 1     — slow lush polysynth strings (saw stack, detuned)
 *   #2  Brass 1      — pulse-wave brass with filter-env bite
 *   #8  Sync 1       — hard sync screamer with filter sweep
 *   #54 Mono 1       — fat detuned mono bass-lead
 *   #15 Bells        — bell-like triangle with no-sustain filter env
 *
 * These five are exported as a small array so the playback layer can iterate
 * without depending on the full 100-preset bank (programmed in Step 11).
 */

import type { Preset } from './preset';
import { createBlankPreset } from './preset';

function applyDefaults(base: Preset): Preset {
  return base;
}

const string1: Preset = applyDefaults({
  ...createBlankPreset(1, 'String 1'),
  category: 'STRINGS',
  glide: 0,
  glideOn: false,
  kbMode: 'POLY1',
  pitchBendAmount: 2,
  modulationAmount: 3,
  programmableVolume: 7,
  lfo: {
    rate: 4, // ~2 Hz
    wave: 'TRI',
    dest: {
      osc1: true,
      osc2: true,
      osc3: false,
      pw1: false,
      pw2: false,
      pw3: false,
      filter: false,
    },
  },
  voiceMod: {
    osc3ModAmount: 0,
    filterContourModAmount: 0,
    contouredOsc3: false,
    invert: false,
    dest: { osc1: false, osc2: false, pw1: false, pw2: false, filter: false },
  },
  osc1: {
    octave: 8,
    sync2to1: false,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
  },
  osc2: {
    octave: 8,
    coarse: 0,
    fine: 0.3,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
  },
  osc3: {
    octave: 16,
    frequency: -0.3,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
    low: false,
    keyboardControl: true,
  },
  mixer: { osc1: 6, osc2: 6, osc3: 5, noise: 0 },
  filter: {
    kbTrack: 1,
    cutoff: 6.5,
    emphasis: 2.5,
    contourAmount: 2,
    attack: 4, // ~150 ms
    decay: 5,
    sustain: 8,
    release: 5,
  },
  vca: { attack: 5.5, decay: 4, sustain: 9, release: 6 }, // ~300 ms attack, long release
  contour: {
    returnToZero: false,
    unconditional: false,
    keyboardFollow: true,
    release: true,
  },
});

const brass1: Preset = applyDefaults({
  ...createBlankPreset(2, 'Brass 1'),
  category: 'BRASS',
  kbMode: 'POLY1',
  modulationAmount: 2,
  programmableVolume: 7,
  lfo: {
    rate: 4,
    wave: 'TRI',
    dest: {
      osc1: false,
      osc2: false,
      osc3: false,
      pw1: false,
      pw2: false,
      pw3: false,
      filter: false,
    },
  },
  voiceMod: {
    osc3ModAmount: 0,
    filterContourModAmount: 0,
    contouredOsc3: false,
    invert: false,
    dest: { osc1: false, osc2: false, pw1: false, pw2: false, filter: false },
  },
  osc1: {
    octave: 8,
    sync2to1: false,
    pulseWidth: 7,
    waves: { pulse: true, saw: false, tri: false },
  },
  osc2: {
    octave: 8,
    coarse: 0,
    fine: 0.15,
    pulseWidth: 6,
    waves: { pulse: true, saw: false, tri: false },
  },
  osc3: {
    octave: 16,
    frequency: 0,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
    low: false,
    keyboardControl: true,
  },
  mixer: { osc1: 6, osc2: 6, osc3: 4, noise: 0 },
  filter: {
    kbTrack: 0.667,
    cutoff: 4,
    emphasis: 3,
    contourAmount: 7,
    attack: 3.5, // ~80ms — brass bite
    decay: 5,
    sustain: 6,
    release: 3.5,
  },
  vca: { attack: 3, decay: 4, sustain: 8, release: 3 },
  contour: {
    returnToZero: false,
    unconditional: false,
    keyboardFollow: true,
    release: true,
  },
});

const sync1: Preset = applyDefaults({
  ...createBlankPreset(8, 'Sync 1'),
  category: 'SYNTH',
  kbMode: 'POLY1',
  modulationAmount: 5,
  programmableVolume: 7,
  lfo: {
    rate: 3,
    wave: 'TRI',
    dest: {
      osc1: false,
      osc2: false,
      osc3: false,
      pw1: false,
      pw2: false,
      pw3: false,
      filter: false,
    },
  },
  voiceMod: {
    osc3ModAmount: 0,
    filterContourModAmount: 7, // filter env modulates pitch of OSC2
    contouredOsc3: false,
    invert: false,
    dest: { osc1: false, osc2: true, pw1: false, pw2: false, filter: false },
  },
  osc1: {
    octave: 8,
    sync2to1: true, // hard sync OSC2 → OSC1
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
  },
  osc2: {
    octave: 8,
    coarse: 2,
    fine: 0,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
  },
  osc3: {
    octave: 16,
    frequency: 0,
    pulseWidth: 5,
    waves: { pulse: false, saw: false, tri: true },
    low: false,
    keyboardControl: true,
  },
  mixer: { osc1: 2, osc2: 8, osc3: 0, noise: 0 },
  filter: {
    kbTrack: 0.667,
    cutoff: 5,
    emphasis: 4,
    contourAmount: 6,
    attack: 2.5,
    decay: 6,
    sustain: 4,
    release: 4,
  },
  vca: { attack: 2, decay: 4, sustain: 8, release: 3 },
  contour: {
    returnToZero: false,
    unconditional: false,
    keyboardFollow: true,
    release: true,
  },
});

const mono1: Preset = applyDefaults({
  ...createBlankPreset(54, 'Mono 1'),
  category: 'ORGAN/MONO',
  mono: true,
  kbMode: 1,
  glide: 2,
  glideOn: true,
  modulationAmount: 0,
  programmableVolume: 8,
  voiceMod: {
    osc3ModAmount: 0,
    filterContourModAmount: 0,
    contouredOsc3: false,
    invert: false,
    dest: { osc1: false, osc2: false, pw1: false, pw2: false, filter: false },
  },
  lfo: {
    rate: 3,
    wave: 'TRI',
    dest: {
      osc1: false,
      osc2: false,
      osc3: false,
      pw1: false,
      pw2: false,
      pw3: false,
      filter: false,
    },
  },
  osc1: {
    octave: 16,
    sync2to1: false,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
  },
  osc2: {
    octave: 16,
    coarse: 0,
    fine: 0.4,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
  },
  osc3: {
    octave: 8,
    frequency: -0.4,
    pulseWidth: 5,
    waves: { pulse: false, saw: true, tri: false },
    low: false,
    keyboardControl: true,
  },
  mixer: { osc1: 7, osc2: 7, osc3: 5, noise: 0 },
  filter: {
    kbTrack: 0.667,
    cutoff: 3.5,
    emphasis: 5,
    contourAmount: 6,
    attack: 1.5,
    decay: 5,
    sustain: 4,
    release: 3,
  },
  vca: { attack: 0.5, decay: 3, sustain: 9, release: 3 },
  contour: {
    returnToZero: false,
    unconditional: false,
    keyboardFollow: false,
    release: true,
  },
});

const bells: Preset = applyDefaults({
  ...createBlankPreset(15, 'Bells'),
  category: 'EFFECTS',
  kbMode: 'POLY1',
  modulationAmount: 1,
  programmableVolume: 7,
  lfo: {
    rate: 5,
    wave: 'TRI',
    dest: {
      osc1: false,
      osc2: false,
      osc3: false,
      pw1: false,
      pw2: false,
      pw3: false,
      filter: false,
    },
  },
  voiceMod: {
    osc3ModAmount: 0,
    filterContourModAmount: 0,
    contouredOsc3: false,
    invert: false,
    dest: { osc1: false, osc2: false, pw1: false, pw2: false, filter: false },
  },
  osc1: {
    octave: 4,
    sync2to1: false,
    pulseWidth: 5,
    waves: { pulse: false, saw: false, tri: true },
  },
  osc2: {
    octave: 2,
    coarse: 7,
    fine: 0.02,
    pulseWidth: 5,
    waves: { pulse: false, saw: false, tri: true },
  },
  osc3: {
    octave: 4,
    frequency: 0,
    pulseWidth: 5,
    waves: { pulse: false, saw: false, tri: true },
    low: false,
    keyboardControl: true,
  },
  mixer: { osc1: 7, osc2: 5, osc3: 4, noise: 0 },
  filter: {
    kbTrack: 1,
    cutoff: 8,
    emphasis: 0,
    contourAmount: 0,
    attack: 0,
    decay: 0,
    sustain: 10,
    release: 0,
  },
  vca: { attack: 0.2, decay: 6, sustain: 0, release: 6 }, // sharp + long ring-out
  contour: {
    returnToZero: false,
    unconditional: false,
    keyboardFollow: true,
    release: true,
  },
});

export const TEST_PRESETS: Preset[] = [string1, brass1, sync1, mono1, bells];

export const TEST_PRESETS_BY_NAME: Record<string, Preset> = Object.fromEntries(
  TEST_PRESETS.map((p) => [p.name, p]),
);
