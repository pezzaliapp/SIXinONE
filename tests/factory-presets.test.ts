import { describe, it, expect } from 'vitest';
import { FACTORY_PRESETS } from '../src/data/factory-presets';
import { serializePreset, deserializePreset } from '../src/data/preset';

describe('Factory preset bank', () => {
  it('contains exactly 100 entries, numbered 0..99', () => {
    expect(FACTORY_PRESETS).toHaveLength(100);
    for (let n = 0; n < 100; n++) {
      expect(FACTORY_PRESETS[n]?.number).toBe(n);
    }
  });

  it('every preset round-trips through serialize/deserialize', () => {
    for (const p of FACTORY_PRESETS) {
      const restored = deserializePreset(serializePreset(p));
      expect(restored.number).toBe(p.number);
      expect(restored.name).toBe(p.name);
    }
  });

  it('archetype invariants hold', () => {
    // String archetype: saw waveforms only on osc1/osc2; KB-track full.
    const stringPresets = FACTORY_PRESETS.filter((p) => p.category === 'STRINGS' && p.name.startsWith('String'));
    expect(stringPresets.length).toBeGreaterThan(0);
    for (const p of stringPresets) {
      expect(p.osc1.waves.saw).toBe(true);
      expect(p.osc1.waves.pulse).toBe(false);
      expect(p.filter.kbTrack).toBe(1);
    }

    // Sync archetype: hard sync engaged.
    const syncPresets = FACTORY_PRESETS.filter((p) => p.name.startsWith('Sync '));
    for (const p of syncPresets) {
      expect(p.osc1.sync2to1).toBe(true);
    }

    // Mono archetype: mono flag set.
    const monoPresets = FACTORY_PRESETS.filter((p) => p.name.startsWith('Mono '));
    for (const p of monoPresets) {
      expect(p.mono).toBe(true);
    }

    // Brass archetype: pulse on osc1.
    const brassPresets = FACTORY_PRESETS.filter((p) => p.name.startsWith('Brass '));
    for (const p of brassPresets) {
      expect(p.osc1.waves.pulse).toBe(true);
    }
  });
});
