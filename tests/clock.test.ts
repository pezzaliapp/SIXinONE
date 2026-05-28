import { describe, expect, it } from 'vitest';
import { parseMidi } from '../src/midi/messages';
import { ExternalClock } from '../src/midi/external-clock';

describe('MIDI Real-Time parsing', () => {
  it('parses clock, start, continue, stop', () => {
    expect(parseMidi(new Uint8Array([0xf8]))).toEqual({ type: 'clock' });
    expect(parseMidi(new Uint8Array([0xfa]))).toEqual({ type: 'start' });
    expect(parseMidi(new Uint8Array([0xfb]))).toEqual({ type: 'continue' });
    expect(parseMidi(new Uint8Array([0xfc]))).toEqual({ type: 'stop' });
  });

  it('parses Song Position Pointer', () => {
    // SPP: 0xF2 LSB MSB → position = (msb << 7) | lsb, in 16th notes
    expect(parseMidi(new Uint8Array([0xf2, 16, 0]))).toEqual({ type: 'songPos', position: 16 });
    expect(parseMidi(new Uint8Array([0xf2, 0, 1]))).toEqual({ type: 'songPos', position: 128 });
  });
});

describe('ExternalClock BPM estimation', () => {
  it('estimates 120 BPM from 24 evenly spaced ticks', async () => {
    const c = new ExternalClock();
    // 120 BPM → quarter = 500 ms → tick = 500/24 ≈ 20.833 ms
    const intervalMs = 500 / 24;
    let now = 1000;
    const origNow = performance.now.bind(performance);
    let mockNow = now;
    (performance as { now: () => number }).now = () => mockNow;
    try {
      for (let i = 0; i < 50; i++) {
        mockNow += intervalMs;
        c.handle({ type: 'clock' });
      }
      expect(c.getBpm()).toBeGreaterThan(115);
      expect(c.getBpm()).toBeLessThan(125);
      expect(c.isPresent()).toBe(true);
    } finally {
      (performance as { now: () => number }).now = origNow;
    }
  });
});
