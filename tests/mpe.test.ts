import { describe, expect, it, vi } from 'vitest';
import { createMpeRouter } from '../src/midi/mpe';

describe('MPE router', () => {
  it('starts inactive in auto mode', () => {
    const r = createMpeRouter();
    expect(r.isActive()).toBe(false);
    expect(r.masterChannel()).toBe(0);
  });

  it('auto-detects when 3+ channels send pitch bend in window', () => {
    vi.useFakeTimers();
    const r = createMpeRouter();
    for (let ch = 1; ch <= 3; ch++) {
      r.observe({ type: 'pitchBend', channel: ch, value: 0.1 });
    }
    expect(r.isActive()).toBe(true);
    expect(r.isVoiceChannel(2)).toBe(true);
    expect(r.isVoiceChannel(0)).toBe(false); // master in lower zone
    vi.useRealTimers();
  });

  it('manual on forces routing regardless of traffic', () => {
    const r = createMpeRouter({ mode: 'off' });
    r.setMode('on');
    expect(r.isActive()).toBe(true);
  });

  it('upper zone makes ch 15 the master and 1..14 voices', () => {
    const r = createMpeRouter({ mode: 'on', zone: 'upper' });
    expect(r.masterChannel()).toBe(15);
    expect(r.isVoiceChannel(0)).toBe(true);
    expect(r.isVoiceChannel(14)).toBe(true);
    expect(r.isVoiceChannel(15)).toBe(false);
  });

  it('detects MCM RPN 0,6 sequence', () => {
    const r = createMpeRouter();
    r.observe({ type: 'cc', channel: 0, controller: 101, value: 0 });
    r.observe({ type: 'cc', channel: 0, controller: 100, value: 6 });
    r.observe({ type: 'cc', channel: 0, controller: 6, value: 15 });
    expect(r.isActive()).toBe(true);
  });
});
