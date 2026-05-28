/**
 * Application-wide state. Three signals only:
 *   - currentPreset  : the active patch (deep clone of factory or user preset)
 *   - displayMessage : alphanumeric display text (EDIT, TUNING, etc.)
 *   - voiceActivity  : 6-element bool array driving slot LEDs
 *
 * `mutate()` produces a fresh cloned preset so subscribers see a new
 * reference and can rely on identity checks.
 */

import type { Preset } from '../data/preset';
import { clonePreset, createBlankPreset } from '../data/preset';
import { TEST_PRESETS } from '../data/test-presets';
import { Signal } from './signal';

export interface DisplayState {
  text: string;
  edit?: { from: string; to: string } | null;
}

const initialPreset = TEST_PRESETS[0] ?? createBlankPreset();

export const currentPreset = new Signal<Preset>(clonePreset(initialPreset));
export const displayMessage = new Signal<DisplayState>({
  text: '*MOOG*',
  edit: null,
});
export const voiceActivity = new Signal<boolean[]>([false, false, false, false, false, false]);

/** Apply an in-place mutation, but emit a fresh preset reference. */
export function mutate(fn: (draft: Preset) => void): void {
  const draft = clonePreset(currentPreset.get());
  fn(draft);
  currentPreset.set(draft);
}

export function loadPreset(p: Preset): void {
  currentPreset.set(clonePreset(p));
  displayMessage.set({ text: p.name.toUpperCase().slice(0, 12), edit: null });
}

export function showDisplay(text: string, ms = 1500): void {
  displayMessage.set({ text, edit: null });
  if (ms > 0) {
    window.setTimeout(() => {
      const cur = currentPreset.get();
      displayMessage.set({ text: cur.name.toUpperCase().slice(0, 12), edit: null });
    }, ms);
  }
}

export function flashEdit(from: string, to: string): void {
  displayMessage.set({ text: 'EDIT', edit: { from, to } });
}
