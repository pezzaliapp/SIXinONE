import { describe, expect, it } from 'vitest';
import { createBlankPreset } from '../src/data/preset';
import { BadTapeError, deserializeMmBank, diffPresets, serializeMmBank } from '../src/data/mm-bank';

describe('.mm-bank serializer', () => {
  it('round-trips a small bank', async () => {
    const presets = [createBlankPreset(0, 'INIT 0'), createBlankPreset(1, 'INIT 1')];
    const text = await serializeMmBank(presets);
    expect(text.startsWith('SIXinONE MM-BANK v1')).toBe(true);
    const out = await deserializeMmBank(text);
    expect(out.presets.length).toBe(2);
    expect(out.presets[0]?.name).toBe('INIT 0');
  });

  it('rejects a tampered body (bad checksum)', async () => {
    const presets = [createBlankPreset(0)];
    const text = await serializeMmBank(presets);
    // Replace a character in the JSON body — should invalidate the checksum.
    const tampered = text.replace('"name":"INIT"', '"name":"HACK"');
    await expect(deserializeMmBank(tampered)).rejects.toBeInstanceOf(BadTapeError);
  });

  it('rejects a file with a missing header', async () => {
    await expect(deserializeMmBank('{"some":"json"}')).rejects.toBeInstanceOf(BadTapeError);
  });

  it('diffPresets returns only changed slots', () => {
    const a = createBlankPreset(0, 'A');
    const b = createBlankPreset(0, 'B');
    const c = createBlankPreset(1, 'C');
    expect(diffPresets([a, c], [a, c])).toEqual([]);
    expect(diffPresets([a, c], [b, c]).map((p) => p.name)).toEqual(['B']);
  });
});
