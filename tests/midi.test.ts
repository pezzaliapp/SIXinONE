import { describe, it, expect } from 'vitest';
import {
  encodeCC,
  encodeNoteOff,
  encodeNoteOn,
  encodePitchBend,
  encodeProgramChange,
  parseMidi,
} from '../src/midi/messages';

describe('MIDI message parser', () => {
  it('parses Note On with velocity > 0', () => {
    const msg = parseMidi(new Uint8Array([0x90, 60, 100]));
    expect(msg).toEqual({ type: 'noteOn', channel: 0, note: 60, velocity: 100 });
  });

  it('treats Note On with velocity 0 as Note Off', () => {
    const msg = parseMidi(new Uint8Array([0x90, 60, 0]));
    expect(msg).toEqual({ type: 'noteOff', channel: 0, note: 60, velocity: 0 });
  });

  it('parses explicit Note Off', () => {
    const msg = parseMidi(new Uint8Array([0x80, 64, 40]));
    expect(msg).toEqual({ type: 'noteOff', channel: 0, note: 64, velocity: 40 });
  });

  it('parses CC', () => {
    const msg = parseMidi(new Uint8Array([0xb2, 64, 127])); // sustain on, channel 2
    expect(msg).toEqual({ type: 'cc', channel: 2, controller: 64, value: 127 });
  });

  it('parses pitch bend centered', () => {
    const msg = parseMidi(new Uint8Array([0xe0, 0, 64]));
    expect(msg?.type).toBe('pitchBend');
    if (msg?.type === 'pitchBend') expect(msg.value).toBeCloseTo(0, 3);
  });

  it('parses program change', () => {
    const msg = parseMidi(new Uint8Array([0xc5, 27]));
    expect(msg).toEqual({ type: 'program', channel: 5, number: 27 });
  });

  it('round-trips encoders', () => {
    expect(parseMidi(encodeNoteOn(3, 60, 100))).toEqual({
      type: 'noteOn',
      channel: 3,
      note: 60,
      velocity: 100,
    });
    expect(parseMidi(encodeNoteOff(0, 64))).toMatchObject({ type: 'noteOff' });
    expect(parseMidi(encodeCC(0, 1, 64))).toEqual({
      type: 'cc',
      channel: 0,
      controller: 1,
      value: 64,
    });
    const pb = parseMidi(encodePitchBend(0, 0.5));
    if (pb?.type === 'pitchBend') {
      expect(pb.value).toBeCloseTo(0.5, 2);
    }
    expect(parseMidi(encodeProgramChange(1, 42))).toEqual({
      type: 'program',
      channel: 1,
      number: 42,
    });
  });
});
