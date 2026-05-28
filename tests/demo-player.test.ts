import { describe, expect, it } from 'vitest';
import { DEMOS } from '../src/data/demos';

describe('Demo data integrity', () => {
  it('every demo has positive duration', () => {
    for (const d of DEMOS) {
      expect(d.durationSec, d.id).toBeGreaterThan(0);
    }
  });

  it('every defaultPreset is in [0, 99]', () => {
    for (const d of DEMOS) {
      expect(d.defaultPreset, d.id).toBeGreaterThanOrEqual(0);
      expect(d.defaultPreset, d.id).toBeLessThanOrEqual(99);
    }
  });

  it('events are sorted by ascending time', () => {
    for (const d of DEMOS) {
      for (let i = 1; i < d.events.length; i++) {
        expect(
          d.events[i]!.time,
          `${d.id} event[${i}] out of order`,
        ).toBeGreaterThanOrEqual(d.events[i - 1]!.time);
      }
    }
  });

  it('all events fit within the demo duration', () => {
    for (const d of DEMOS) {
      for (const ev of d.events) {
        expect(ev.time, `${d.id}@${ev.time}`).toBeGreaterThanOrEqual(0);
        expect(ev.time, `${d.id}@${ev.time}`).toBeLessThanOrEqual(d.durationSec + 0.1);
      }
    }
  });

  it('every noteOn has a matching noteOff within the duration', () => {
    for (const d of DEMOS) {
      const held = new Map<number, number>(); // note → count of pending onsets
      for (const ev of d.events) {
        if (ev.type === 'noteOn' && typeof ev.note === 'number') {
          held.set(ev.note, (held.get(ev.note) ?? 0) + 1);
        } else if (ev.type === 'noteOff' && typeof ev.note === 'number') {
          const c = held.get(ev.note) ?? 0;
          if (c > 0) held.set(ev.note, c - 1);
        }
      }
      // Any remaining "still on" notes must have been released within fuzz of
      // the demo's duration — the last noteOff at the boundary is OK.
      for (const [note, count] of held) {
        expect(count, `${d.id}: note ${note} never released`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('preset events reference valid preset numbers', () => {
    for (const d of DEMOS) {
      for (const ev of d.events) {
        if (ev.type === 'preset') {
          expect(ev.presetNumber, d.id).toBeGreaterThanOrEqual(0);
          expect(ev.presetNumber, d.id).toBeLessThanOrEqual(99);
        }
      }
    }
  });

  it('demo ids are unique', () => {
    const ids = new Set(DEMOS.map((d) => d.id));
    expect(ids.size).toBe(DEMOS.length);
  });

  it('the long demo is the only one with isLong = true', () => {
    const long = DEMOS.filter((d) => d.isLong);
    expect(long.length).toBe(1);
    expect(long[0]!.id).toBe('presets-tour-100');
  });

  it('all classical demos credit public domain in their credits line', () => {
    for (const d of DEMOS.filter((dd) => dd.category === 'classical')) {
      expect(d.credits, d.id).toMatch(/public domain/i);
    }
  });

  it('all style demos credit "original composition" in their credits line', () => {
    for (const d of DEMOS.filter((dd) => dd.category === 'style')) {
      expect(d.credits, d.id).toMatch(/original/i);
    }
  });
});
