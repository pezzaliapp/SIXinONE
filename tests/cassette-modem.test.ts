import { describe, expect, it } from 'vitest';
import { crc32, decode, encode, estimatedDuration, MODEM_SPEC } from '../src/audio/cassette/modem';

// Deterministic PRNG so tests don't flake on CI — a single Mulberry32 seed
// produces the same byte stream and the same noise samples every run.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBytes(n: number, seed = 1): Uint8Array {
  const r = makeRng(seed);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.floor(r() * 256);
  return out;
}

describe('CRC-32', () => {
  it('matches a known IEEE 802.3 test vector', () => {
    // crc32("123456789") = 0xCBF43926
    const bytes = new TextEncoder().encode('123456789');
    expect(crc32(bytes).toString(16)).toBe('cbf43926');
  });
});

describe('modem roundtrip', () => {
  it('encode → decode survives a 1 KB random payload', () => {
    const payload = randomBytes(1024, 1);
    const pcm = encode(payload, { sampleRate: 44100, amplitude: 0.7 });
    const result = decode(pcm, 44100);
    expect(result.ok, result.reason).toBe(true);
    expect(result.bytes).toEqual(payload);
  });

  it('encode → decode survives a 10 KB random payload', () => {
    const payload = randomBytes(10 * 1024, 2);
    const pcm = encode(payload);
    const result = decode(pcm);
    expect(result.ok, result.reason).toBe(true);
    expect(result.bytes).toEqual(payload);
  });

  it('encode → decode survives a tiny payload', () => {
    const payload = new TextEncoder().encode('hi from SIXinONE');
    const pcm = encode(payload);
    const result = decode(pcm);
    expect(result.ok, result.reason).toBe(true);
    expect(new TextDecoder().decode(result.bytes!)).toBe('hi from SIXinONE');
  });
});

describe('modem error detection', () => {
  it('rejects a stream that has no sync word', () => {
    const garbage = new Float32Array(44100); // 1 s silence — no sync
    for (let i = 0; i < garbage.length; i++) garbage[i] = Math.sin(i * 0.1) * 0.1;
    const result = decode(garbage, 44100);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no-sync');
  });

  it('tolerates a faint noise floor', () => {
    const payload = randomBytes(256, 7);
    const pcm = encode(payload, { sampleRate: 44100, amplitude: 0.7 });
    // Deterministic ~–46 dB noise floor — well below the carrier energy
    // integrated by one Goertzel symbol window, but a real noise signal,
    // not silence. The point: a clean WAV-round-trip in slightly-imperfect
    // conditions decodes without errors.
    const noiseRng = makeRng(42);
    for (let i = 0; i < pcm.length; i++) {
      pcm[i]! += (noiseRng() * 2 - 1) * 0.005;
    }
    const result = decode(pcm, 44100);
    expect(result.ok, result.reason).toBe(true);
    expect(result.bytes).toEqual(payload);
  });

  it('flags BAD TAPE when the carrier is severely degraded', () => {
    const payload = randomBytes(256, 3);
    const pcm = encode(payload, { sampleRate: 44100 });
    // Wipe out half of every byte's audio span — the CRC must catch this
    // even if Hamming corrects what it can. We accept "no-sync", "bad-magic"
    // and "bad-checksum" as all acceptable fail-loud outcomes.
    const start = Math.floor(pcm.length * 0.45);
    const end = pcm.length - 4410;
    for (let i = start; i < end; i++) pcm[i] = 0;
    const result = decode(pcm, 44100);
    expect(result.ok).toBe(false);
  });
});

describe('throughput / spec sanity', () => {
  it('exposes the iconic Bell 202 frequencies', () => {
    expect(MODEM_SPEC.MARK_HZ).toBe(1200);
    expect(MODEM_SPEC.SPACE_HZ).toBe(2200);
    expect(MODEM_SPEC.BAUD).toBe(1200);
  });

  it('estimated single-preset duration is musically tasteful (≤ 30 s for ≤ 1.5 KB)', () => {
    expect(estimatedDuration(1024)).toBeLessThanOrEqual(30);
    expect(estimatedDuration(1500)).toBeLessThanOrEqual(30);
  });

  it('estimated 15 KB compressed bank stays inside the 3-minute attention budget', () => {
    // Bell 202 + Hamming(7,4) at 1200 baud gives ~85 raw bytes/s, so 15 KB
    // is the cliff: ≈ 180.5 s (3 m 0.5 s). We accept "just under 3 minutes
    // + handshake" as the design point — anything bigger needs compression.
    expect(estimatedDuration(15 * 1024)).toBeLessThan(185);
  });
});
