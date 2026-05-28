/**
 * 6-voice polyphonic allocator with voice stealing.
 *
 * Allocation modes correspond to the panel's KB Mode button:
 *   POLY1  cyclic                — next voice is (last + 1) mod 6
 *   POLY2  cyclic-with-memory    — reuse the voice that last played this note
 *   POLY3  reset-to-A            — always start scanning from voice 0
 *   POLY4  reset-to-A-with-memory
 *
 * Step 3 implements POLY1 + POLY2; the others fall back to POLY1 for now
 * (TODO: distinct reset-to-A scans land with the proper UI in Step 10).
 *
 * When all 6 voices are active and a new note arrives, the OLDEST voice is
 * stolen (the original Memorymoog also stole oldest first).
 */

import type { Voice } from './voice';

export interface AllocatorSlot {
  index: number;
  voice: Voice | null;
  midiNote: number | null;
  startTime: number;
}

export class VoiceAllocator {
  readonly maxVoices: number;
  private readonly slots: AllocatorSlot[];
  private cursor = 0;

  constructor(maxVoices = 6) {
    this.maxVoices = maxVoices;
    this.slots = Array.from({ length: maxVoices }, (_, i) => ({
      index: i,
      voice: null,
      midiNote: null,
      startTime: 0,
    }));
  }

  /**
   * Returns the slot index that should host the next note.
   * The caller is responsible for actually instantiating the Voice and
   * calling `placeVoice()` to commit.
   */
  pickSlot(midiNote: number, mode: 'POLY1' | 'POLY2' | 'POLY3' | 'POLY4'): number {
    if (mode === 'POLY2' || mode === 'POLY4') {
      const memo = this.slots.findIndex((s) => s.midiNote === midiNote && s.voice === null);
      if (memo >= 0) {
        this.cursor = memo;
        return memo;
      }
    }
    // First, look for a free slot in scan order.
    const startFrom = mode === 'POLY3' || mode === 'POLY4' ? 0 : this.cursor;
    for (let i = 0; i < this.maxVoices; i++) {
      const idx = (startFrom + i) % this.maxVoices;
      if (this.slots[idx]!.voice === null) {
        this.cursor = (idx + 1) % this.maxVoices;
        return idx;
      }
    }
    // No free slot — steal oldest.
    let oldest = 0;
    let oldestTime = Infinity;
    for (let i = 0; i < this.maxVoices; i++) {
      const s = this.slots[i]!;
      if (s.voice && s.startTime < oldestTime) {
        oldestTime = s.startTime;
        oldest = i;
      }
    }
    this.cursor = (oldest + 1) % this.maxVoices;
    return oldest;
  }

  placeVoice(slotIdx: number, voice: Voice, midiNote: number, startTime: number): void {
    const slot = this.slots[slotIdx]!;
    slot.voice = voice;
    slot.midiNote = midiNote;
    slot.startTime = startTime;
  }

  /** Release voices matching `midiNote` and return their release end times. */
  releaseNote(midiNote: number, at: number): number[] {
    const ends: number[] = [];
    for (const slot of this.slots) {
      if (slot.voice && slot.midiNote === midiNote) {
        ends.push(slot.voice.release(at));
        slot.midiNote = null;
        // Voice is left in slot until reapVoice() removes it.
      }
    }
    return ends;
  }

  /** Free slot bookkeeping for voices whose endTime has passed. */
  reapVoices(now: number): void {
    for (const slot of this.slots) {
      if (slot.voice && slot.voice.scheduledEnd <= now) {
        slot.voice = null;
        slot.midiNote = null;
      }
    }
  }

  /** Steal the slot at idx if currently occupied. */
  stealSlot(slotIdx: number, at: number): void {
    const slot = this.slots[slotIdx]!;
    if (slot.voice) {
      slot.voice.steal(at);
      slot.voice = null;
      slot.midiNote = null;
    }
  }

  panic(at: number): void {
    for (const slot of this.slots) {
      if (slot.voice) {
        slot.voice.steal(at);
        slot.voice = null;
        slot.midiNote = null;
      }
    }
  }

  forEachVoice(cb: (voice: Voice, slotIdx: number) => void): void {
    for (const slot of this.slots) {
      if (slot.voice) cb(slot.voice, slot.index);
    }
  }

  get activeSlotsSnapshot(): ReadonlyArray<AllocatorSlot> {
    return this.slots;
  }
}
