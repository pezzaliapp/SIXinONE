/**
 * Preset data model — mirrors the Memorymoog Plus panel state.
 * All continuous controls are stored as the physical knob position (0–10),
 * matching how the original instrument serialises programs. Runtime mapping
 * to seconds / Hz / cents lives in `preset-scales.ts`.
 */

export type Octave = 16 | 8 | 4 | 2;

export type LfoWave = 'TRI' | 'SAW+' | 'SAW-' | 'SQR' | 'S&H';

export type PresetCategory =
  | 'SYNTH'
  | 'STRINGS'
  | 'BRASS'
  | 'KB'
  | 'EFFECTS'
  | 'ORGAN/MONO';

/**
 * Keyboard mode. The Memorymoog has Mono modes (1/2/3 — triggering rules)
 * and Poly modes (POLY1..POLY4 — allocation rules: cyclic, cyclic w/ memory,
 * reset-to-A, reset-to-A w/ memory).
 */
export type KbMode = 1 | 2 | 3 | 'POLY1' | 'POLY2' | 'POLY3' | 'POLY4';

export interface WaveBlend {
  pulse: boolean;
  saw: boolean;
  tri: boolean;
}

export interface Osc1State {
  octave: Octave;
  sync2to1: boolean;
  pulseWidth: number; // 0–10 (0 = 0%, 10 = 50%, panel labelling)
  waves: WaveBlend;
}

export interface Osc2State {
  octave: Octave;
  coarse: number; // ±7 semitones
  fine: number; // ±100 cents
  pulseWidth: number;
  waves: WaveBlend;
}

export interface Osc3State {
  octave: Octave;
  frequency: number; // ±minor sixth (panel range), stored as semitones
  pulseWidth: number;
  waves: WaveBlend;
  low: boolean; // when true, runs in LFO mode
  keyboardControl: boolean; // KB tracking on/off
}

export interface MixerState {
  osc1: number;
  osc2: number;
  osc3: number;
  noise: number;
}

/** KB-Track: 0, 1/3, 2/3 or full keyboard following. */
export type FilterKbTrack = 0 | 0.333 | 0.667 | 1;

export interface FilterState {
  kbTrack: FilterKbTrack;
  cutoff: number; // 0–10; mapped runtime to −5..+5 octaves around base
  emphasis: number; // 0–10; >7 self-oscillates
  contourAmount: number; // 0–10
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface VcaState {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface LfoState {
  rate: number; // 0–10, mapped log to 0.1..100 Hz
  wave: LfoWave;
  dest: {
    osc1: boolean;
    osc2: boolean;
    osc3: boolean;
    pw1: boolean;
    pw2: boolean;
    pw3: boolean;
    filter: boolean;
  };
}

export interface VoiceModState {
  osc3ModAmount: number;
  filterContourModAmount: number;
  contouredOsc3: boolean;
  invert: boolean;
  dest: {
    osc1: boolean;
    osc2: boolean;
    pw1: boolean;
    pw2: boolean;
    filter: boolean;
  };
}

export interface PedalState {
  amount: number;
  dest: Record<string, boolean>;
}

export interface ContourFlags {
  returnToZero: boolean;
  unconditional: boolean;
  keyboardFollow: boolean;
  release: boolean;
}

/**
 * FX rack state — chorus / plate reverb / tape delay. Lives inside the
 * preset (so each program can store its own FX setup) but the FX rack UI
 * also offers a "global" toggle that ignores preset values.
 */
export interface PresetFxChorus {
  enabled: boolean;
  rate: number;
  depth: number;
  feedback: number;
  mix: number;
}
export interface PresetFxReverb {
  enabled: boolean;
  size: 0 | 1 | 2;
  damping: number;
  mix: number;
}
export interface PresetFxDelay {
  enabled: boolean;
  time: number;
  feedback: number;
  tone: number;
  mix: number;
  pingPong: boolean;
  syncBpm: boolean;
}
export interface PresetFx {
  chorus: PresetFxChorus;
  reverb: PresetFxReverb;
  delay: PresetFxDelay;
}

export interface Preset {
  number: number; // 0–99
  name: string;
  category: PresetCategory;

  // Performance
  glide: number;
  glideOn: boolean;
  mono: boolean;
  multipleTrigger: boolean;
  kbMode: KbMode;
  hold: boolean;
  arpeggiator: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  pitchBendAmount: number;
  modulationAmount: number;
  programmableVolume: number;

  // Footpedals
  pedal1: PedalState; // dests: pitch, volume, filter
  pedal2: PedalState; // dests: modAmt, osc2

  // Modulation
  lfo: LfoState;
  voiceMod: VoiceModState;

  // Oscillators
  osc1: Osc1State;
  osc2: Osc2State;
  osc3: Osc3State;

  // Mixer
  mixer: MixerState;

  // Filter + VCA
  filter: FilterState;
  vca: VcaState;

  // Global contour controls (apply to BOTH envelopes)
  contour: ContourFlags;

  // v2 — FX rack (chorus → plate reverb → tape delay)
  fx: PresetFx;
}

export const DEFAULT_PRESET_FX: PresetFx = {
  chorus: { enabled: false, rate: 0.6, depth: 0.5, feedback: 0.2, mix: 0.4 },
  reverb: { enabled: false, size: 1, damping: 0.5, mix: 0.3 },
  delay: {
    enabled: false,
    time: 0.35,
    feedback: 0.35,
    tone: 4000,
    mix: 0.25,
    pingPong: false,
    syncBpm: false,
  },
};

export const PRESET_SCHEMA_VERSION = 1;

/** A "zero" preset — useful as a starting point. */
export function createBlankPreset(number = 0, name = 'INIT'): Preset {
  return {
    number,
    name,
    category: 'SYNTH',
    glide: 0,
    glideOn: false,
    mono: false,
    multipleTrigger: false,
    kbMode: 'POLY1',
    hold: false,
    arpeggiator: 0,
    pitchBendAmount: 2,
    modulationAmount: 0,
    programmableVolume: 7,
    pedal1: { amount: 0, dest: { pitch: false, volume: false, filter: false } },
    pedal2: { amount: 0, dest: { modAmt: false, osc2: false } },
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
      pulseWidth: 5,
      waves: { pulse: false, saw: true, tri: false },
    },
    osc2: {
      octave: 8,
      coarse: 0,
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
    mixer: { osc1: 5, osc2: 0, osc3: 0, noise: 0 },
    filter: {
      kbTrack: 1,
      cutoff: 5,
      emphasis: 0,
      contourAmount: 0,
      attack: 0,
      decay: 0,
      sustain: 10,
      release: 0,
    },
    vca: { attack: 0, decay: 0, sustain: 10, release: 1 },
    contour: {
      returnToZero: false,
      unconditional: false,
      keyboardFollow: false,
      release: true,
    },
    fx: JSON.parse(JSON.stringify(DEFAULT_PRESET_FX)) as PresetFx,
  };
}

/** Deep clone (cheap, JSON-safe since the model is plain data). */
export function clonePreset(p: Preset): Preset {
  return JSON.parse(JSON.stringify(p)) as Preset;
}

export interface SerializedPreset {
  v: number;
  preset: Preset;
}

export function serializePreset(p: Preset): SerializedPreset {
  return { v: PRESET_SCHEMA_VERSION, preset: clonePreset(p) };
}

export function deserializePreset(data: SerializedPreset | unknown): Preset {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('preset' in data) ||
    !('v' in data)
  ) {
    throw new Error('Invalid serialised preset payload');
  }
  const { v, preset } = data as SerializedPreset;
  if (v !== PRESET_SCHEMA_VERSION) {
    throw new Error(`Unsupported preset schema version: ${v}`);
  }
  // Future-proofing: merge with blank to ensure missing fields are filled in.
  // Explicitly merge the FX block so a pre-v2 preset (no `fx`) still works.
  const base = createBlankPreset(preset.number, preset.name);
  const fx = preset.fx
    ? {
        chorus: { ...base.fx.chorus, ...preset.fx.chorus },
        reverb: { ...base.fx.reverb, ...preset.fx.reverb },
        delay: { ...base.fx.delay, ...preset.fx.delay },
      }
    : base.fx;
  return { ...base, ...preset, fx };
}
