import { describe, expect, it } from 'vitest';
import { encodeWav } from '../src/audio/cassette/wav-encoder';

describe('WAV encoder', () => {
  it('writes a valid RIFF/WAVE header', async () => {
    const pcm = new Float32Array(1000);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.sin(i * 0.1);
    const blob = encodeWav(pcm, 44100);
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const tag = (offset: number): string => {
      let s = '';
      for (let i = 0; i < 4; i++) s += String.fromCharCode(view.getUint8(offset + i));
      return s;
    };
    expect(tag(0)).toBe('RIFF');
    expect(tag(8)).toBe('WAVE');
    expect(tag(12)).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16); // fmt sub-chunk size
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint16(34, true)).toBe(16); // 16-bit
    expect(tag(36)).toBe('data');
    expect(view.getUint32(40, true)).toBe(pcm.length * 2);
  });

  it('clamps samples outside [-1, +1]', async () => {
    const pcm = Float32Array.from([2, -2, 0, 0.5]);
    const blob = encodeWav(pcm, 44100);
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    expect(view.getInt16(44, true)).toBe(0x7fff);
    expect(view.getInt16(46, true)).toBe(-0x7fff);
    expect(view.getInt16(48, true)).toBe(0);
    expect(view.getInt16(50, true)).toBe(Math.round(0.5 * 0x7fff));
  });
});
