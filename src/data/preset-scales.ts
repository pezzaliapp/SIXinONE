/**
 * Knob 0..10 → real-world value mappings.
 *
 * Source: Memorymoog Plus user manual (1982) front-panel scaling.
 * Time controls are logarithmic; the manual quotes:
 *   Attack: 1 ms → 10 s
 *   Decay / Release: 2 ms → 20 s
 *   LFO Rate: 0.1 Hz → 100 Hz
 *
 * Filter cutoff is calibrated to a generous range. Real MM cutoff spans
 * roughly −5 .. +5 octaves around a base centre; we use 440 Hz as base.
 */

const clamp01 = (v: number): number => Math.max(0, Math.min(10, v)) / 10;

/** Exponential map: 0 -> from, 10 -> to. */
function expMap(knob: number, from: number, to: number): number {
  const k = clamp01(knob);
  return from * Math.pow(to / from, k);
}

export const FILTER_BASE_HZ = 440;

export function attackSeconds(knob: number): number {
  return expMap(knob, 0.001, 10);
}

export function decayReleaseSeconds(knob: number): number {
  return expMap(knob, 0.002, 20);
}

export function sustainLevel(knob: number): number {
  return clamp01(knob);
}

export function lfoRateHz(knob: number): number {
  return expMap(knob, 0.1, 100);
}

/** Knob 0..10 → cutoff frequency in Hz, log around FILTER_BASE_HZ ±5 octaves. */
export function filterCutoffHz(knob: number): number {
  const k = clamp01(knob);
  const octaves = -5 + k * 10;
  return FILTER_BASE_HZ * Math.pow(2, octaves);
}

/** Knob 0..10 → resonance amount, 0..1 for engine consumption. */
export function emphasisAmount(knob: number): number {
  return clamp01(knob);
}

/** Pulse width knob 0..10 → duty cycle 0.05..0.5 (avoid degenerate 0% / 50% squareness). */
export function pulseWidthDuty(knob: number): number {
  const k = clamp01(knob);
  return 0.05 + k * 0.45;
}

/** Octave label (16/8/4/2) → pitch transposition in semitones from 8'. */
export function octaveSemitones(oct: 2 | 4 | 8 | 16): number {
  switch (oct) {
    case 16:
      return -12;
    case 8:
      return 0;
    case 4:
      return 12;
    case 2:
      return 24;
  }
}

/** Mixer level knob 0..10 → linear gain 0..2 (>1 produces analog-style soft-clip later). */
export function mixerLevelLinear(knob: number): number {
  return clamp01(knob) * 2;
}

/** Master volume / programmable volume 0..10 → linear gain 0..1. */
export function volumeLinear(knob: number): number {
  return clamp01(knob);
}

/** Pitch bend amount 0..10 → semitones up to ±12 (one octave). */
export function pitchBendSemitones(knob: number): number {
  return clamp01(knob) * 12;
}

/** Glide knob 0..10 → seconds per octave traversed, log map up to ~10 s end-to-end. */
export function glideTimeSeconds(knob: number): number {
  if (knob <= 0) return 0;
  return expMap(knob, 0.01, 10);
}

/** Filter KB-track knob → semitone-per-key multiplier (1.0 = full tracking). */
export function filterKbTrackToCoeff(kbTrack: 0 | 0.333 | 0.667 | 1): number {
  return kbTrack;
}
