import { describe, it, expect } from 'vitest';
import {
  createBlankPreset,
  clonePreset,
  serializePreset,
  deserializePreset,
} from '../src/data/preset';
import { TEST_PRESETS } from '../src/data/test-presets';
import {
  attackSeconds,
  decayReleaseSeconds,
  filterCutoffHz,
  lfoRateHz,
  octaveSemitones,
  pitchBendSemitones,
  pulseWidthDuty,
} from '../src/data/preset-scales';

describe('Preset model', () => {
  it('creates a blank preset with valid defaults', () => {
    const p = createBlankPreset(0, 'INIT');
    expect(p.number).toBe(0);
    expect(p.name).toBe('INIT');
    expect(p.osc1.octave).toBe(8);
    expect(p.filter.kbTrack).toBe(1);
  });

  it('clonePreset returns an independent copy', () => {
    const a = createBlankPreset();
    const b = clonePreset(a);
    b.name = 'CHANGED';
    b.mixer.osc1 = 9;
    expect(a.name).toBe('INIT');
    expect(a.mixer.osc1).toBe(5);
  });

  it('serialise → deserialise round-trips identically', () => {
    for (const p of TEST_PRESETS) {
      const restored = deserializePreset(serializePreset(p));
      expect(restored).toEqual(p);
    }
  });

  it('deserialise rejects malformed payloads', () => {
    expect(() => deserializePreset(null)).toThrow();
    expect(() => deserializePreset({ v: 99, preset: createBlankPreset() })).toThrow();
  });

  it('test preset bank has 5 archetypes', () => {
    expect(TEST_PRESETS).toHaveLength(5);
    expect(TEST_PRESETS.map((p) => p.name)).toEqual([
      'String 1',
      'Brass 1',
      'Sync 1',
      'Mono 1',
      'Bells',
    ]);
  });
});

describe('Preset scales', () => {
  it('attack maps 0..10 → 1ms..10s monotonically', () => {
    expect(attackSeconds(0)).toBeCloseTo(0.001, 5);
    expect(attackSeconds(10)).toBeCloseTo(10, 3);
    expect(attackSeconds(5)).toBeGreaterThan(attackSeconds(2));
    expect(attackSeconds(8)).toBeLessThan(attackSeconds(10));
  });

  it('decay/release maps 0..10 → 2ms..20s', () => {
    expect(decayReleaseSeconds(0)).toBeCloseTo(0.002, 5);
    expect(decayReleaseSeconds(10)).toBeCloseTo(20, 3);
  });

  it('LFO rate maps 0..10 → 0.1..100 Hz', () => {
    expect(lfoRateHz(0)).toBeCloseTo(0.1, 5);
    expect(lfoRateHz(10)).toBeCloseTo(100, 3);
  });

  it('filter cutoff covers ±5 octaves around 440 Hz', () => {
    expect(filterCutoffHz(0)).toBeCloseTo(440 / 32, 2);
    expect(filterCutoffHz(5)).toBeCloseTo(440, 2);
    expect(filterCutoffHz(10)).toBeCloseTo(440 * 32, 1);
  });

  it('octave switch maps to semitones from 8\'', () => {
    expect(octaveSemitones(16)).toBe(-12);
    expect(octaveSemitones(8)).toBe(0);
    expect(octaveSemitones(4)).toBe(12);
    expect(octaveSemitones(2)).toBe(24);
  });

  it('pitch bend amount 10 → 12 semitones (one octave)', () => {
    expect(pitchBendSemitones(10)).toBe(12);
    expect(pitchBendSemitones(0)).toBe(0);
  });

  it('pulse width stays within sane duty cycle range', () => {
    expect(pulseWidthDuty(0)).toBeCloseTo(0.05, 5);
    expect(pulseWidthDuty(10)).toBeCloseTo(0.5, 5);
  });
});
