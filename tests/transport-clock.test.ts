import { describe, expect, it, vi } from 'vitest';
import { TransportClock } from '../src/sequencer/transport-clock';
import { Arpeggiator } from '../src/sequencer/arpeggiator';

function withFakeTime<T>(fn: () => T): T {
  vi.useFakeTimers();
  try {
    return fn();
  } finally {
    vi.useRealTimers();
  }
}

function mockPerformanceNow(times: number[]): () => void {
  const orig = performance.now.bind(performance);
  let i = 0;
  (performance as { now: () => number }).now = () => times[i++] ?? times[times.length - 1] ?? 0;
  return () => {
    (performance as { now: () => number }).now = orig;
  };
}

describe('TransportClock tap tempo', () => {
  it('returns null on the first tap (not enough history)', () => {
    const tc = new TransportClock();
    expect(tc.tap()).toBe(null);
  });

  it('computes 120 BPM from four 500 ms taps', () => {
    const restore = mockPerformanceNow([0, 500, 1000, 1500]);
    try {
      const tc = new TransportClock();
      tc.tap();
      tc.tap();
      tc.tap();
      const bpm = tc.tap();
      expect(bpm).not.toBe(null);
      expect(bpm!).toBeGreaterThan(119);
      expect(bpm!).toBeLessThan(121);
      expect(tc.getBpm()).toBeCloseTo(120, 0);
    } finally {
      restore();
    }
  });

  it('resets the tap history after a 2 s silence', () => {
    const restore = mockPerformanceNow([0, 500, 1000, 5000, 5300]);
    try {
      const tc = new TransportClock();
      tc.tap(); // t=0
      tc.tap(); // t=500
      tc.tap(); // t=1000 — average so far ≈ 500 ms (120 BPM)
      tc.tap(); // t=5000 — > 2 s silence → reset, new series starts
      const bpm = tc.tap(); // t=5300 — single 300 ms interval = 200 BPM
      expect(bpm).not.toBe(null);
      expect(bpm!).toBeGreaterThan(195);
      expect(bpm!).toBeLessThan(205);
    } finally {
      restore();
    }
  });
});

describe('TransportClock + Arpeggiator share tempo', () => {
  it('changing transport BPM changes the arp step interval live', () => {
    withFakeTime(() => {
      const transport = new TransportClock();
      const fires: number[] = [];
      const arp = new Arpeggiator(
        { noteOn: (n) => fires.push(n), noteOff: () => {} },
        transport,
      );
      arp.setEnabled(true);
      arp.setSubdivision(6);
      arp.setPattern('UP');
      arp.addHeldNote(60, 0.8);
      transport.setBpm(120);

      // 4 sixteenths at 120 BPM = 4 × 125 ms = 500 ms — should fire 4 notes.
      vi.advanceTimersByTime(500);
      expect(fires.length).toBe(4);

      // Halve the tempo. Same elapsed time → half the notes.
      transport.setBpm(60);
      const before = fires.length;
      vi.advanceTimersByTime(500);
      // Allow ±1 fire of slack because the tickCounter carries over.
      expect(fires.length - before).toBeGreaterThanOrEqual(1);
      expect(fires.length - before).toBeLessThanOrEqual(3);
    });
  });

  it('two arpeggiators on the same transport stay phase-locked', () => {
    withFakeTime(() => {
      const transport = new TransportClock();
      const aFires: number[] = [];
      const bFires: number[] = [];
      const arpA = new Arpeggiator({ noteOn: (n) => aFires.push(n), noteOff: () => {} }, transport);
      const arpB = new Arpeggiator({ noteOn: (n) => bFires.push(n), noteOff: () => {} }, transport);
      for (const arp of [arpA, arpB]) {
        arp.setEnabled(true);
        arp.setSubdivision(6);
        arp.setPattern('UP');
        arp.addHeldNote(60, 0.8);
      }
      transport.setBpm(120);
      vi.advanceTimersByTime(1000);
      // Same number of triggers from both — they're sharing the same tick stream.
      expect(aFires.length).toBe(bFires.length);
      expect(aFires.length).toBeGreaterThan(0);
    });
  });
});
