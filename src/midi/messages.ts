/**
 * MIDI status byte helpers. We only deal with channel-voice messages.
 */

export const NOTE_OFF = 0x80;
export const NOTE_ON = 0x90;
export const CONTROL_CHANGE = 0xb0;
export const PROGRAM_CHANGE = 0xc0;
export const PITCH_BEND = 0xe0;

export const CC_MOD_WHEEL = 1;
export const CC_SUSTAIN = 64;
export const CC_ALL_NOTES_OFF = 123;

export interface NoteOnMsg {
  type: 'noteOn';
  channel: number;
  note: number;
  velocity: number;
}
export interface NoteOffMsg {
  type: 'noteOff';
  channel: number;
  note: number;
  velocity: number;
}
export interface CCMsg {
  type: 'cc';
  channel: number;
  controller: number;
  value: number;
}
export interface PitchBendMsg {
  type: 'pitchBend';
  channel: number;
  /** Centered around 0, range [-1, +1]. */
  value: number;
}
export interface ProgramChangeMsg {
  type: 'program';
  channel: number;
  number: number;
}

export type MidiMessage = NoteOnMsg | NoteOffMsg | CCMsg | PitchBendMsg | ProgramChangeMsg;

export function parseMidi(data: Uint8Array): MidiMessage | null {
  if (data.length < 1) return null;
  const status = data[0]!;
  const command = status & 0xf0;
  const channel = status & 0x0f;

  if (command === NOTE_ON || command === NOTE_OFF) {
    const note = data[1] ?? 0;
    const velocity = data[2] ?? 0;
    // A NoteOn with velocity 0 is a NoteOff (running-status idiom).
    if (command === NOTE_ON && velocity > 0) {
      return { type: 'noteOn', channel, note, velocity };
    }
    return { type: 'noteOff', channel, note, velocity };
  }
  if (command === CONTROL_CHANGE) {
    return {
      type: 'cc',
      channel,
      controller: data[1] ?? 0,
      value: data[2] ?? 0,
    };
  }
  if (command === PITCH_BEND) {
    const lsb = data[1] ?? 0;
    const msb = data[2] ?? 0;
    const raw = (msb << 7) | lsb; // 14-bit, 0..16383, center 8192
    return { type: 'pitchBend', channel, value: (raw - 8192) / 8192 };
  }
  if (command === PROGRAM_CHANGE) {
    return { type: 'program', channel, number: data[1] ?? 0 };
  }
  return null;
}

export function encodeNoteOn(channel: number, note: number, velocity: number): Uint8Array {
  return new Uint8Array([NOTE_ON | (channel & 0x0f), note & 0x7f, velocity & 0x7f]);
}
export function encodeNoteOff(channel: number, note: number, velocity = 0): Uint8Array {
  return new Uint8Array([NOTE_OFF | (channel & 0x0f), note & 0x7f, velocity & 0x7f]);
}
export function encodeCC(channel: number, controller: number, value: number): Uint8Array {
  return new Uint8Array([
    CONTROL_CHANGE | (channel & 0x0f),
    controller & 0x7f,
    value & 0x7f,
  ]);
}
export function encodePitchBend(channel: number, value: number): Uint8Array {
  const v = Math.max(-1, Math.min(1, value));
  const raw = Math.round((v + 1) * 8192);
  return new Uint8Array([
    PITCH_BEND | (channel & 0x0f),
    raw & 0x7f,
    (raw >> 7) & 0x7f,
  ]);
}
export function encodeProgramChange(channel: number, number: number): Uint8Array {
  return new Uint8Array([PROGRAM_CHANGE | (channel & 0x0f), number & 0x7f]);
}
