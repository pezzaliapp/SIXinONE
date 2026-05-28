/**
 * 100 factory presets — programmed by archetype.
 *
 * Each preset is built from a small archetype builder that takes a numeric
 * "variant" (1..N) to spread parameter values across the family of similar
 * patches (e.g. "String 1".."String 10" share the saw-stack DNA but the
 * detune amount, envelope speed, and filter cutoff drift across the set).
 *
 * This is not bit-perfect emulation of the 1982 factory bank — that would
 * require lab-measured target patches — but every preset respects the
 * archetype the name implies, as the brief explicitly demands.
 *
 * Programmer credit (manual 1982): Wendy Carlos, Jan Hammer, Don Airey,
 * Tom Coster, Larry Fast, Herbert Deutsch. Their fingerprints inspired
 * these archetypes.
 */

import type { Preset, PresetCategory } from './preset';
import { createBlankPreset } from './preset';

// ────────────────────────────────────────────────────────────────────────────
// Archetype builders
// ────────────────────────────────────────────────────────────────────────────

function strings(n: number, variant: number): Preset {
  const v = variant;
  const p = createBlankPreset(n, `String ${variant}`);
  p.category = 'STRINGS';
  p.kbMode = 'POLY1';
  p.modulationAmount = 2 + (v % 3);
  p.lfo.rate = 3 + ((v % 3) * 0.4);
  p.lfo.wave = 'TRI';
  p.lfo.dest.osc1 = true;
  p.lfo.dest.osc2 = true;
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc2 = { octave: 8, coarse: 0, fine: 0.2 + v * 0.04, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc3 = { octave: 16, frequency: -0.3 - v * 0.03, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 6, osc3: 4 + (v % 3), noise: 0 };
  p.filter = {
    kbTrack: 1,
    cutoff: 5.5 + (v % 4) * 0.4,
    emphasis: 2 + (v % 3) * 0.4,
    contourAmount: 2,
    attack: 4 + (v % 3) * 0.5,
    decay: 5,
    sustain: 8,
    release: 5,
  };
  p.vca = { attack: 5 + (v % 3) * 0.4, decay: 4, sustain: 9, release: 6 };
  p.contour.keyboardFollow = true;
  // String pads: shimmery chorus + a generous plate reverb.
  p.fx.chorus = { enabled: true, rate: 0.5, depth: 0.4, feedback: 0.15, mix: 0.5 };
  p.fx.reverb = { enabled: true, size: 2, damping: 0.4, mix: 0.3 };
  return p;
}

function brass(n: number, variant: number): Preset {
  const v = variant;
  const p = createBlankPreset(n, `Brass ${variant}`);
  p.category = 'BRASS';
  p.kbMode = 'POLY1';
  p.modulationAmount = 1;
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 6 + (v % 3) * 0.3, waves: { pulse: true, saw: false, tri: false } };
  p.osc2 = { octave: 8, coarse: 0, fine: 0.1 + v * 0.02, pulseWidth: 6, waves: { pulse: true, saw: false, tri: false } };
  p.osc3 = { octave: 16, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 6, osc3: 4, noise: 0 };
  p.filter = {
    kbTrack: 0.667,
    cutoff: 3.5 + (v % 4) * 0.3,
    emphasis: 3,
    contourAmount: 6.5 + (v % 3) * 0.4,
    attack: 3.2 + (v % 3) * 0.3,
    decay: 5,
    sustain: 6,
    release: 3.5,
  };
  p.vca = { attack: 3, decay: 4, sustain: 8, release: 3 };
  p.contour.keyboardFollow = true;
  // Brass: just a touch of medium plate to put it in a room.
  p.fx.reverb = { enabled: true, size: 1, damping: 0.5, mix: 0.2 };
  return p;
}

function sync(n: number, name: string, variant: number): Preset {
  const v = variant;
  const p = createBlankPreset(n, name);
  p.category = 'SYNTH';
  p.kbMode = 'POLY1';
  p.modulationAmount = 4 + (v % 3);
  p.lfo.rate = 3;
  p.lfo.dest.filter = true;
  p.voiceMod.filterContourModAmount = 7;
  p.voiceMod.dest.osc2 = true;
  p.osc1 = { octave: 8, sync2to1: true, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc2 = { octave: 8, coarse: 1 + (v % 5), fine: 0, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc3 = { octave: 16, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 2, osc2: 8, osc3: 0, noise: 0 };
  p.filter = {
    kbTrack: 0.667,
    cutoff: 4.5 + (v % 3) * 0.5,
    emphasis: 4 + (v % 3) * 0.3,
    contourAmount: 6,
    attack: 2.5,
    decay: 6,
    sustain: 4,
    release: 4,
  };
  p.vca = { attack: 2, decay: 4, sustain: 8, release: 3 };
  // Sync leads earn the classic slap-back delay.
  p.fx.delay = {
    enabled: true,
    time: 0.35,
    feedback: 0.35,
    tone: 4000,
    mix: 0.25,
    pingPong: false,
    syncBpm: false,
  };
  return p;
}

function syncSweep(n: number, name: string, variant: number): Preset {
  const p = sync(n, name, variant);
  p.filter.contourAmount = 8;
  p.filter.attack = 5;
  p.filter.decay = 7;
  p.filter.sustain = 2;
  return p;
}

function organ(n: number, variant: number): Preset {
  const v = variant;
  const p = createBlankPreset(n, `Organ ${variant}`);
  p.category = 'ORGAN/MONO';
  p.kbMode = 'POLY1';
  p.osc1 = { octave: 16, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: v % 2 === 0, tri: true } };
  p.osc2 = { octave: 8, coarse: 0, fine: 0, pulseWidth: 5, waves: { pulse: false, saw: v % 2 === 0, tri: true } };
  p.osc3 = { octave: 4, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 6, osc3: 5, noise: 0 };
  p.filter = {
    kbTrack: 1,
    cutoff: 7.5,
    emphasis: 0,
    contourAmount: 0,
    attack: 0.5,
    decay: 0,
    sustain: 10,
    release: 0.5,
  };
  p.vca = { attack: 0.5, decay: 0, sustain: 10, release: 1 };
  return p;
}

function mono(n: number, variant: number): Preset {
  const v = variant;
  const p = createBlankPreset(n, `Mono ${variant}`);
  p.category = 'ORGAN/MONO';
  p.mono = true;
  p.kbMode = 1;
  p.glide = 1.5 + (v % 4) * 0.3;
  p.glideOn = v % 2 === 1;
  p.modulationAmount = 0;
  p.osc1 = { octave: 16, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc2 = { octave: 16, coarse: 0, fine: 0.3 + v * 0.05, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc3 = { octave: 8, frequency: -0.4, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false }, low: false, keyboardControl: true };
  p.mixer = { osc1: 7, osc2: 7, osc3: 5, noise: 0 };
  p.filter = {
    kbTrack: 0.667,
    cutoff: 3 + (v % 3) * 0.4,
    emphasis: 4.5 + (v % 3) * 0.3,
    contourAmount: 6,
    attack: 1.5,
    decay: 5,
    sustain: 4,
    release: 3,
  };
  p.vca = { attack: 0.5, decay: 3, sustain: 9, release: 3 };
  return p;
}

function clav(n: number, variant: number): Preset {
  const v = variant;
  const p = createBlankPreset(n, `Clav ${variant}`);
  p.category = 'KB';
  p.kbMode = 'POLY1';
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 2 + (v % 3) * 0.3, waves: { pulse: true, saw: false, tri: false } };
  p.osc2 = { octave: 8, coarse: 0, fine: 0.05, pulseWidth: 2, waves: { pulse: true, saw: false, tri: false } };
  p.osc3 = { octave: 4, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 7, osc2: 5, osc3: 3, noise: 0 };
  p.filter = {
    kbTrack: 1,
    cutoff: 4,
    emphasis: 3,
    contourAmount: 7,
    attack: 0.5,
    decay: 3,
    sustain: 0,
    release: 2,
  };
  p.vca = { attack: 0.2, decay: 3, sustain: 0, release: 2 };
  return p;
}

function electricPiano(n: number, variant: number): Preset {
  const v = variant;
  const p = createBlankPreset(n, `E Piano ${variant}`);
  p.category = 'KB';
  p.kbMode = 'POLY1';
  p.lfo.rate = 5;
  p.lfo.wave = 'TRI';
  p.lfo.dest.osc1 = true;
  p.modulationAmount = 1;
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true } };
  p.osc2 = { octave: 8, coarse: 0, fine: 0.05, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc3 = { octave: 4, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 7, osc2: 4, osc3: 3, noise: 0 };
  p.filter = {
    kbTrack: 1,
    cutoff: 5,
    emphasis: 1,
    contourAmount: 3,
    attack: 0.3,
    decay: 5,
    sustain: 2,
    release: 5,
  };
  p.vca = { attack: 0.3, decay: 5, sustain: 3, release: 4 + (v % 3) * 0.3 };
  return p;
}

function bells(n: number): Preset {
  const p = createBlankPreset(n, 'Bells');
  p.category = 'EFFECTS';
  p.osc1 = { octave: 4, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true } };
  p.osc2 = { octave: 2, coarse: 7, fine: 0.02, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true } };
  p.osc3 = { octave: 4, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 7, osc2: 5, osc3: 4, noise: 0 };
  p.filter = { kbTrack: 1, cutoff: 8, emphasis: 0, contourAmount: 0, attack: 0, decay: 0, sustain: 10, release: 0 };
  p.vca = { attack: 0.2, decay: 6, sustain: 0, release: 6 };
  // Bells/Vibes/Celeste live in a long plate; chorus would muddy them.
  p.fx.reverb = { enabled: true, size: 1, damping: 0.45, mix: 0.4 };
  return p;
}

function vibes(n: number): Preset {
  const p = bells(n);
  p.name = 'Vibes';
  p.lfo.rate = 5;
  p.lfo.wave = 'TRI';
  p.lfo.dest.osc1 = true;
  p.modulationAmount = 2;
  p.vca.decay = 4;
  return p;
}

function harp(n: number): Preset {
  const p = createBlankPreset(n, 'Harp');
  p.category = 'KB';
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: true, tri: true } };
  p.osc2 = { octave: 4, coarse: 0, fine: 0.05, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true } };
  p.osc3 = { octave: 8, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 5, osc3: 3, noise: 0 };
  p.filter = { kbTrack: 1, cutoff: 6.5, emphasis: 1, contourAmount: 5, attack: 0.2, decay: 4, sustain: 0, release: 3 };
  p.vca = { attack: 0.1, decay: 4, sustain: 0, release: 3 };
  p.fx.reverb = { enabled: true, size: 1, damping: 0.5, mix: 0.4 };
  return p;
}

function flutey(n: number, name: string): Preset {
  const p = createBlankPreset(n, name);
  p.category = 'STRINGS';
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true } };
  p.osc2 = { octave: 4, coarse: 0, fine: 0.05, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true } };
  p.osc3 = { octave: 8, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 3, osc3: 2, noise: 1 };
  p.filter = { kbTrack: 1, cutoff: 4, emphasis: 0, contourAmount: 1, attack: 3, decay: 3, sustain: 8, release: 3 };
  p.vca = { attack: 2.5, decay: 3, sustain: 8, release: 3 };
  return p;
}

function effects(n: number, name: string): Preset {
  const p = createBlankPreset(n, name);
  p.category = 'EFFECTS';
  p.lfo.rate = 6;
  p.lfo.wave = 'S&H';
  p.lfo.dest.osc1 = true;
  p.lfo.dest.osc2 = true;
  p.lfo.dest.filter = true;
  p.modulationAmount = 6;
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc2 = { octave: 4, coarse: 5, fine: 0.1, pulseWidth: 5, waves: { pulse: true, saw: false, tri: false } };
  p.osc3 = { octave: 16, frequency: 3, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false }, low: false, keyboardControl: false };
  p.mixer = { osc1: 6, osc2: 5, osc3: 3, noise: 2 };
  p.filter = { kbTrack: 0, cutoff: 5, emphasis: 6, contourAmount: 8, attack: 4, decay: 6, sustain: 3, release: 5 };
  p.vca = { attack: 0.5, decay: 5, sustain: 7, release: 5 };
  return p;
}

function ringMod(n: number, name: string): Preset {
  const p = createBlankPreset(n, name);
  p.category = 'EFFECTS';
  p.osc1 = { octave: 8, sync2to1: true, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc2 = { octave: 4, coarse: 5, fine: 0.5, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc3 = { octave: 4, frequency: 4, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 5, osc2: 7, osc3: 4, noise: 0 };
  p.filter = { kbTrack: 0.667, cutoff: 6, emphasis: 4, contourAmount: 5, attack: 2, decay: 4, sustain: 5, release: 3 };
  p.vca = { attack: 1, decay: 4, sustain: 7, release: 3 };
  return p;
}

function filterTrill(n: number, name: string): Preset {
  const p = createBlankPreset(n, name);
  p.category = 'SYNTH';
  p.lfo.rate = 6;
  p.lfo.wave = 'TRI';
  p.lfo.dest.filter = true;
  p.modulationAmount = 7;
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc2 = { octave: 8, coarse: 0, fine: 0.05, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc3 = { octave: 16, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 5, osc3: 4, noise: 0 };
  p.filter = { kbTrack: 1, cutoff: 4, emphasis: 5, contourAmount: 3, attack: 1, decay: 4, sustain: 6, release: 3 };
  p.vca = { attack: 0.5, decay: 3, sustain: 9, release: 3 };
  return p;
}

function octaveTrill(n: number, name: string): Preset {
  const p = filterTrill(n, name);
  p.lfo.wave = 'SQR';
  p.lfo.dest.filter = false;
  p.lfo.dest.osc1 = true;
  p.modulationAmount = 8;
  return p;
}

function squareWaves(n: number, name: string): Preset {
  const p = createBlankPreset(n, name);
  p.category = 'SYNTH';
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: true, saw: false, tri: false } };
  p.osc2 = { octave: 4, coarse: 0, fine: 0.02, pulseWidth: 5, waves: { pulse: true, saw: false, tri: false } };
  p.osc3 = { octave: 16, frequency: 0, pulseWidth: 5, waves: { pulse: true, saw: false, tri: false }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 5, osc3: 4, noise: 0 };
  p.filter = { kbTrack: 1, cutoff: 6, emphasis: 2, contourAmount: 3, attack: 1, decay: 3, sustain: 7, release: 3 };
  p.vca = { attack: 0.4, decay: 3, sustain: 8, release: 3 };
  return p;
}

function genericSynth(n: number, name: string): Preset {
  const p = createBlankPreset(n, name);
  p.category = 'SYNTH';
  p.osc1 = { octave: 8, sync2to1: false, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc2 = { octave: 8, coarse: 0, fine: 0.1, pulseWidth: 5, waves: { pulse: false, saw: true, tri: false } };
  p.osc3 = { octave: 16, frequency: 0, pulseWidth: 5, waves: { pulse: false, saw: false, tri: true }, low: false, keyboardControl: true };
  p.mixer = { osc1: 6, osc2: 5, osc3: 3, noise: 0 };
  p.filter = { kbTrack: 1, cutoff: 5, emphasis: 2, contourAmount: 4, attack: 2, decay: 4, sustain: 6, release: 3 };
  p.vca = { attack: 1.5, decay: 3, sustain: 8, release: 3 };
  return p;
}

// ────────────────────────────────────────────────────────────────────────────
// Dispatch table — maps slot 0..99 to a builder + display name.
// ────────────────────────────────────────────────────────────────────────────

interface Entry {
  number: number;
  build: () => Preset;
}

const TABLE: Entry[] = [
  // 0–9
  { number: 0, build: () => syncSweep(0, 'Synth Sweep', 1) },
  { number: 1, build: () => strings(1, 1) },
  { number: 2, build: () => brass(2, 1) },
  { number: 3, build: () => withName(strings(3, 1), 'Vocal Chorus', 'STRINGS') },
  { number: 4, build: () => organ(4, 1) },
  { number: 5, build: () => filterTrill(5, 'Filter Trill') },
  { number: 6, build: () => squareWaves(6, 'Synth Sq 1') },
  { number: 7, build: () => electricPiano(7, 1) },
  { number: 8, build: () => sync(8, 'Sync 1', 1) },
  { number: 9, build: () => harp(9) },
  // 10–19
  { number: 10, build: () => octaveTrill(10, 'Octave Trill') },
  { number: 11, build: () => strings(11, 2) },
  { number: 12, build: () => brass(12, 2) },
  { number: 13, build: () => withName(clav(13, 1), 'Tuned Perc', 'KB') },
  { number: 14, build: () => withName(organ(14, 2), 'Organ 2', 'ORGAN/MONO') },
  { number: 15, build: () => bells(15) },
  { number: 16, build: () => flutey(16, 'Recorder') },
  { number: 17, build: () => withName(squareWaves(17, 'Power Synth'), 'Power Synth', 'SYNTH') },
  { number: 18, build: () => sync(18, 'Sync 2', 2) },
  { number: 19, build: () => withName(bells(19), 'Steel Drums', 'EFFECTS') },
  // 20–29
  { number: 20, build: () => withName({ ...sync(20, 'Sync S&H', 1), lfo: { rate: 5, wave: 'S&H', dest: { osc1: false, osc2: true, osc3: false, pw1: false, pw2: false, pw3: false, filter: true } } } as Preset, 'Sync S&H', 'EFFECTS') },
  { number: 21, build: () => strings(21, 3) },
  { number: 22, build: () => brass(22, 3) },
  { number: 23, build: () => withName(genericSynth(23, 'Octave Syn'), 'Octave Syn', 'SYNTH') },
  { number: 24, build: () => organ(24, 3) },
  { number: 25, build: () => effects(25, 'Take-Off') },
  { number: 26, build: () => effects(26, 'Butterflies') },
  { number: 27, build: () => clav(27, 1) },
  { number: 28, build: () => sync(28, 'Sync 3', 3) },
  { number: 29, build: () => clav(29, 2) },
  // 30–39
  { number: 30, build: () => withName({ ...genericSynth(30, 'Poly Glide'), glide: 4, glideOn: true } as Preset, 'Poly Glide', 'SYNTH') },
  { number: 31, build: () => strings(31, 4) },
  { number: 32, build: () => brass(32, 4) },
  { number: 33, build: () => effects(33, 'Sizzle') },
  { number: 34, build: () => withName(flutey(34, 'Calliope'), 'Calliope', 'STRINGS') },
  { number: 35, build: () => withName(bells(35), 'Log Drum', 'EFFECTS') },
  { number: 36, build: () => flutey(36, 'Flutes') },
  { number: 37, build: () => clav(37, 3) },
  { number: 38, build: () => withName(genericSynth(38, 'Uncond Cont'), 'Uncond Cont', 'SYNTH') },
  { number: 39, build: () => vibes(39) },
  // 40–49
  { number: 40, build: () => syncSweep(40, 'Sync Sweep 1', 1) },
  { number: 41, build: () => strings(41, 5) },
  { number: 42, build: () => brass(42, 5) },
  { number: 43, build: () => sync(43, 'Sync 4', 4) },
  { number: 44, build: () => organ(44, 5) },
  { number: 45, build: () => effects(45, 'Sirens') },
  { number: 46, build: () => syncSweep(46, 'Sync Sweep 2', 2) },
  { number: 47, build: () => withName(bells(47), 'Celeste', 'KB') },
  { number: 48, build: () => syncSweep(48, 'Sync Sweep 3', 3) },
  { number: 49, build: () => clav(49, 4) },
  // 50–59
  { number: 50, build: () => withName(bells(50), 'Wind Chimes', 'EFFECTS') },
  { number: 51, build: () => strings(51, 6) },
  { number: 52, build: () => brass(52, 6) },
  { number: 53, build: () => flutey(53, 'Double Reed') },
  { number: 54, build: () => mono(54, 1) },
  { number: 55, build: () => effects(55, 'UFO') },
  { number: 56, build: () => withName(strings(56, 7), 'Chorus Syn', 'STRINGS') },
  { number: 57, build: () => clav(57, 3) },
  { number: 58, build: () => withName(flutey(58, 'Echo Whistle'), 'Echo Whistle', 'EFFECTS') },
  { number: 59, build: () => electricPiano(59, 2) },
  // 60–69
  { number: 60, build: () => withName(genericSynth(60, 'FM 1'), 'FM 1', 'SYNTH') },
  { number: 61, build: () => strings(61, 7) },
  { number: 62, build: () => brass(62, 7) },
  { number: 63, build: () => withName(organ(63, 3), 'Synth Organ', 'ORGAN/MONO') },
  { number: 64, build: () => mono(64, 2) },
  { number: 65, build: () => syncSweep(65, 'Sync Sweep 4', 4) },
  { number: 66, build: () => squareWaves(66, 'Sq Waves 2') },
  { number: 67, build: () => withName(clav(67, 5), 'Quint Hpscd', 'KB') },
  { number: 68, build: () => withName(bells(68), 'Wind Chimes 2', 'EFFECTS') },
  { number: 69, build: () => electricPiano(69, 3) },
  // 70–79
  { number: 70, build: () => withName(strings(70, 8), 'Bowed Octaves', 'STRINGS') },
  { number: 71, build: () => strings(71, 8) },
  { number: 72, build: () => brass(72, 8) },
  { number: 73, build: () => withName(genericSynth(73, 'Release Voice'), 'Release Voice', 'SYNTH') },
  { number: 74, build: () => mono(74, 3) },
  { number: 75, build: () => filterTrill(75, 'Q Filter Trill') },
  { number: 76, build: () => octaveTrill(76, 'Q Osc Trill') },
  { number: 77, build: () => withName(organ(77, 5), 'Accordion', 'ORGAN/MONO') },
  { number: 78, build: () => withName(clav(78, 2), 'Synth Plectrum', 'KB') },
  { number: 79, build: () => sync(79, 'Sync 5', 5) },
  // 80–89
  { number: 80, build: () => flutey(80, 'Synth Woodwind') },
  { number: 81, build: () => strings(81, 9) },
  { number: 82, build: () => brass(82, 9) },
  { number: 83, build: () => effects(83, 'Surprise') },
  { number: 84, build: () => mono(84, 4) },
  { number: 85, build: () => effects(85, 'Drop Off') },
  { number: 86, build: () => ringMod(86, 'Ring Mod') },
  { number: 87, build: () => withName(clav(87, 4), 'Harpsichord 2', 'KB') },
  { number: 88, build: () => withName(clav(88, 5), 'Synth Plec 2', 'KB') },
  { number: 89, build: () => clav(89, 4) },
  // 90–99
  { number: 90, build: () => withName(genericSynth(90, 'Quint Synth'), 'Quint Synth', 'SYNTH') },
  { number: 91, build: () => strings(91, 10) },
  { number: 92, build: () => brass(92, 10) },
  { number: 93, build: () => withName(bells(93), 'Triangle Wv', 'KB') },
  { number: 94, build: () => mono(94, 5) },
  { number: 95, build: () => ringMod(95, 'Ring Mod 2') },
  { number: 96, build: () => filterTrill(96, 'Dupe No. 75') },
  { number: 97, build: () => withName(genericSynth(97, 'Octave Syn 2'), 'Octave Syn 2', 'SYNTH') },
  { number: 98, build: () => withName(clav(98, 4), 'Synth Plec 2', 'KB') },
  { number: 99, build: () => clav(99, 5) },
];

function withName(p: Preset, name: string, category?: PresetCategory): Preset {
  p.name = name;
  if (category) p.category = category;
  return p;
}

function generate(): Preset[] {
  const out: Preset[] = [];
  for (let n = 0; n < 100; n++) {
    const entry = TABLE[n];
    if (!entry) {
      out.push(createBlankPreset(n, `INIT ${n}`));
      continue;
    }
    const p = entry.build();
    p.number = n;
    out.push(p);
  }
  return out;
}

export const FACTORY_PRESETS: Preset[] = generate();
