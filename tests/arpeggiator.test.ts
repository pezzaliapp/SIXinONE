import { describe, expect, it, vi } from 'vitest';
import { Arpeggiator, patternFromPresetValue } from '../src/sequencer/arpeggiator';
import { TransportClock } from '../src/sequencer/transport-clock';

function record(): {
  notes: number[];
  velocities: number[];
  noteOn(n: number, v: number): void;
  noteOff(n: number): void;
} {
  const notes: number[] = [];
  const velocities: number[] = [];
  return {
    notes,
    velocities,
    noteOn(n, v) {
      notes.push(n);
      velocities.push(v);
    },
    noteOff(_n) {
      // no-op for these sequence tests
    },
  };
}

describe('Arpeggiator pattern decoding', () => {
  it('maps preset values 1..6 to named patterns', () => {
    expect(patternFromPresetValue(0)).toBe(null);
    expect(patternFromPresetValue(1)).toBe('UP');
    expect(patternFromPresetValue(2)).toBe('DOWN');
    expect(patternFromPresetValue(6)).toBe('AS_PLAYED');
  });
});

describe('Arpeggiator sequence shapes', () => {
  function buildAndFire(
    pattern: 'UP' | 'DOWN' | 'UP_DOWN' | 'UP_DOWN_INC' | 'AS_PLAYED',
    notes: number[],
    octaves = 1,
    steps = 6,
  ): number[] {
    vi.useFakeTimers();
    const rec = record();
    // Fresh transport under fake timers so the scheduler interval is paced
    // by `vi.advanceTimersByTime`. The singleton is created at module load
    // (before fake timers) and would tick on real time.
    const transport = new TransportClock();
    const arp = new Arpeggiator({ noteOn: rec.noteOn, noteOff: rec.noteOff }, transport);
    arp.setEnabled(true);
    arp.setBpm(120);
    arp.setSubdivision(6);
    arp.setOctaveRange(octaves);
    arp.setPattern(pattern);
    for (const n of notes) arp.addHeldNote(n, 0.8);
    const stepMs = (60_000 / 120) * 6 / 24; // 125 ms
    for (let i = 0; i < steps; i++) vi.advanceTimersByTime(stepMs);
    arp.setEnabled(false);
    vi.useRealTimers();
    return rec.notes;
  }

  it('UP cycles ascending', () => {
    expect(buildAndFire('UP', [60, 64, 67], 1, 6)).toEqual([60, 64, 67, 60, 64, 67]);
  });

  it('DOWN cycles descending', () => {
    expect(buildAndFire('DOWN', [60, 64, 67], 1, 6)).toEqual([67, 64, 60, 67, 64, 60]);
  });

  it('UP_DOWN excludes repeated endpoints (ABCBA)', () => {
    expect(buildAndFire('UP_DOWN', [60, 64, 67], 1, 6)).toEqual([60, 64, 67, 64, 60, 64]);
  });

  it('UP_DOWN_INC includes repeated endpoints (ABCCBA)', () => {
    expect(buildAndFire('UP_DOWN_INC', [60, 64, 67], 1, 6)).toEqual([60, 64, 67, 67, 64, 60]);
  });

  it('AS_PLAYED follows press order', () => {
    expect(buildAndFire('AS_PLAYED', [67, 60, 64], 1, 3)).toEqual([67, 60, 64]);
  });

  it('octave range adds shifted copies', () => {
    expect(buildAndFire('UP', [60], 3, 6)).toEqual([60, 72, 84, 60, 72, 84]);
  });
});

describe('Arpeggiator hold latch', () => {
  it('keeps notes after release when hold is on', () => {
    vi.useFakeTimers();
    const rec = record();
    const transport = new TransportClock();
    const arp = new Arpeggiator({ noteOn: rec.noteOn, noteOff: rec.noteOff }, transport);
    arp.setEnabled(true);
    arp.setBpm(120);
    arp.setSubdivision(6);
    arp.setPattern('UP');
    arp.setHold(true);
    arp.addHeldNote(60, 0.8);
    arp.addHeldNote(64, 0.8);
    arp.removeHeldNote(60); // ignored — hold latched
    arp.removeHeldNote(64);
    const stepMs = (60_000 / 120) * 6 / 24;
    for (let i = 0; i < 4; i++) vi.advanceTimersByTime(stepMs);
    expect(rec.notes).toEqual([60, 64, 60, 64]);
    arp.setEnabled(false);
    vi.useRealTimers();
  });

  it('clears latched notes when hold is turned off', () => {
    vi.useFakeTimers();
    const rec = record();
    const transport = new TransportClock();
    const arp = new Arpeggiator({ noteOn: rec.noteOn, noteOff: rec.noteOff }, transport);
    arp.setEnabled(true);
    arp.setBpm(120);
    arp.setSubdivision(6);
    arp.setPattern('UP');
    arp.setHold(true);
    arp.addHeldNote(60, 0.8);
    arp.removeHeldNote(60);
    arp.setHold(false);
    // No notes should have been added after toggling hold off.
    const before = rec.notes.length;
    const stepMs = (60_000 / 120) * 6 / 24;
    vi.advanceTimersByTime(stepMs * 3);
    expect(rec.notes.length).toBe(before);
    arp.setEnabled(false);
    vi.useRealTimers();
  });
});
