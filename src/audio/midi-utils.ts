export const A4_HZ = 440;
export const A4_MIDI = 69;

export function midiToHz(midiNote: number): number {
  return A4_HZ * Math.pow(2, (midiNote - A4_MIDI) / 12);
}

export function semitonesToRatio(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export function centsToRatio(cents: number): number {
  return Math.pow(2, cents / 1200);
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiNoteName(midiNote: number): string {
  const name = NOTE_NAMES[midiNote % 12] ?? '?';
  const octave = Math.floor(midiNote / 12) - 1;
  return `${name}${octave}`;
}

/** Memorymoog 61-key range: C2 (MIDI 36) → C7 (MIDI 96). */
export const MM_LOWEST_KEY = 36;
export const MM_HIGHEST_KEY = 96;
