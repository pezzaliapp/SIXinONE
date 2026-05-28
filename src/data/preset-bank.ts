/**
 * Preset bank — virtual array of 100 presets, with factory defaults overlaid
 * by user-saved versions from IndexedDB.
 *
 * Factory entries fall back to `createBlankPreset(n, name)` until Step 11
 * fills in the archetype-based programming.
 */

import type { Preset } from './preset';
import { clonePreset, createBlankPreset } from './preset';
import { TEST_PRESETS } from './test-presets';

const FALLBACK_NAMES: string[] = [
  // 00–49
  'Synth Sweep', 'String 1', 'Brass 1', 'Vocal Chorus', 'Organ 1',
  'Filter Trill', 'Synth Sq 1', 'E Piano 1', 'Sync 1', 'Harp',
  'Octave Trill', 'String 2', 'Brass 2', 'Tuned Perc', 'Organ 2',
  'Bells', 'Recorder', 'Power Synth', 'Sync 2', 'Steel Drums',
  'Sync S&H', 'String 3', 'Brass 3', 'Octave Syn', 'Organ 3',
  'Take-Off', 'Butterflies', 'Clav 1', 'Sync 3', 'Clav 2',
  'Poly Glide', 'String 4', 'Brass 4', 'Sizzle', 'Calliope',
  'Log Drum', 'Flutes', 'Clav Wah', 'Uncond Cont', 'Vibes',
  'Sync Sweep 1', 'String 5', 'Brass 5', 'Sync 4', 'Organ 5',
  'Sirens', 'Sync Sweep 2', 'Celeste', 'Sync Sweep 3', 'Harpsichord 1',
  // 50–99
  'Wind Chimes', 'String 6', 'Brass 6', 'Double Reed', 'Mono 1',
  'UFO', 'Chorus Syn', 'Clav 3', 'Echo Whistle', 'E Piano 2',
  'FM 1', 'String 7', 'Brass 7', 'Synth Organ', 'Mono 2',
  'Sync Sweep 4', 'Sq Waves 2', 'Quint Hpscd', 'Wind Chimes 2', 'E Piano 3',
  'Bowed Octaves', 'String 8', 'Brass 8', 'Release Voice', 'Mono 3',
  'Q Filter Trill', 'Q Osc Trill', 'Accordion', 'Synth Plectrum', 'Sync 5',
  'Synth Woodwind', 'String 9', 'Brass 9', 'Surprise', 'Mono 4',
  'Drop Off', 'Dupe No. 75', 'Harpsichord 2', 'Synth Plec 2', 'Clav 4',
  'Quint Synth', 'String 10', 'Brass 10', 'Triangle Wv', 'Mono 5',
  'Ring Mod 2', 'Ring Mod', 'Octave Syn 2', 'Synth Plec 2', 'Clav 5',
];

function factoryFallback(n: number): Preset {
  const name = FALLBACK_NAMES[n] ?? `INIT ${n}`;
  return createBlankPreset(n, name);
}

/**
 * Bank: ordered 100-slot store. Lookups are O(1); factory presets are
 * generated lazily. Step 11 will replace `factoryFallback` with the
 * full archetype-aware programmer.
 */
export class PresetBank {
  private overrides = new Map<number, Preset>();
  private factory: Array<Preset | null> = new Array(100).fill(null);

  constructor(factoryPresets?: Preset[]) {
    if (factoryPresets) {
      for (const p of factoryPresets) {
        if (p.number >= 0 && p.number < 100) {
          this.factory[p.number] = clonePreset(p);
        }
      }
    }
    // Hand-tuned test presets — fill any matching slots up front so
    // even before Step 11 the bank produces audible material.
    for (const p of TEST_PRESETS) {
      if (p.number >= 0 && p.number < 100 && this.factory[p.number] === null) {
        this.factory[p.number] = clonePreset(p);
      }
    }
  }

  loadOverride(p: Preset): void {
    this.overrides.set(p.number, clonePreset(p));
  }

  loadOverrides(presets: Preset[]): void {
    for (const p of presets) this.loadOverride(p);
  }

  get(number: number): Preset {
    if (number < 0 || number > 99) throw new RangeError(`Preset number ${number} out of range`);
    const ov = this.overrides.get(number);
    if (ov) return clonePreset(ov);
    const f = this.factory[number] ?? factoryFallback(number);
    return clonePreset(f);
  }

  hasUserOverride(number: number): boolean {
    return this.overrides.has(number);
  }

  list(): Array<{ number: number; name: string; isUser: boolean }> {
    return Array.from({ length: 100 }, (_, n) => {
      const p = this.overrides.get(n) ?? this.factory[n] ?? factoryFallback(n);
      return { number: n, name: p.name, isUser: this.overrides.has(n) };
    });
  }
}

export const presetBank = new PresetBank();
