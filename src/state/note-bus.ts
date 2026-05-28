/**
 * Tiny event bus for played notes. The keyboard / MIDI in push to it; the
 * sequencer subscribes when recording. Decouples UI from sequencer state.
 */

type NoteListener = (note: number, velocity: number) => void;

const listeners = new Set<NoteListener>();

export function publishNote(note: number, velocity: number): void {
  for (const l of listeners) l(note, velocity);
}

export function subscribeNote(cb: NoteListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
