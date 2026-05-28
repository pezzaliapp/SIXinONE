import { describe, expect, it } from 'vitest';
import { decode, encode } from '../src/audio/cassette/modem';
import { decodePayload, encodePayload } from '../src/audio/cassette/payload';
import { createBlankPreset } from '../src/data/preset';

describe('full cassette pipeline (no audio I/O)', () => {
  it('encodes a single preset to PCM and decodes it back identically', async () => {
    const p = createBlankPreset(42, 'TEST PATCH');
    p.filter.cutoff = 6.5;
    p.filter.emphasis = 7;
    p.osc2.coarse = 3;

    const payload = await encodePayload({ kind: 'preset', preset: p });
    const pcm = encode(payload, { sampleRate: 44100, amplitude: 0.7 });
    const decoded = decode(pcm, 44100);
    expect(decoded.ok, decoded.reason).toBe(true);
    const out = await decodePayload(decoded.bytes!);
    expect(out.kind).toBe('preset');
    if (out.kind === 'preset') {
      expect(out.preset.number).toBe(42);
      expect(out.preset.name).toBe('TEST PATCH');
      expect(out.preset.filter.cutoff).toBeCloseTo(6.5);
      expect(out.preset.filter.emphasis).toBe(7);
      expect(out.preset.osc2.coarse).toBe(3);
    }
  });

  it('encodes a 5-preset bank, gzipped, and decodes back exactly', async () => {
    const presets = [0, 1, 2, 3, 4].map((n) => {
      const p = createBlankPreset(n, `SLOT ${n}`);
      p.filter.cutoff = n + 1;
      return p;
    });
    const payload = await encodePayload({ kind: 'bank', presets });
    const pcm = encode(payload, { sampleRate: 44100 });
    const decoded = decode(pcm, 44100);
    expect(decoded.ok, decoded.reason).toBe(true);
    const out = await decodePayload(decoded.bytes!);
    expect(out.kind).toBe('bank');
    if (out.kind === 'bank') {
      expect(out.presets.length).toBe(5);
      expect(out.presets[0]!.name).toBe('SLOT 0');
      expect(out.presets[4]!.filter.cutoff).toBe(5);
    }
  });
});
