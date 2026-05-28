/**
 * Cassette payload — the bytes the modem actually carries.
 *
 * Layout (all UTF-8 + a one-byte type discriminator):
 *
 *   [0]: 0x01 = single preset, 0x02 = full bank (gzipped JSON)
 *   [1..]: UTF-8 JSON
 *
 * Single preset is small enough that gzip would barely help, so we skip
 * it. Bank is always gzipped — a 100-preset bank goes from ~80 KB raw
 * JSON to ~12-15 KB after gzip, which is the only way it fits inside the
 * 3-minute attention window.
 */

import type { Preset } from '../../data/preset';
import { clonePreset, deserializePreset, serializePreset } from '../../data/preset';

const TYPE_SINGLE = 0x01;
const TYPE_BANK = 0x02;

const enc = new TextEncoder();
const dec = new TextDecoder();

export type CassettePayload =
  | { kind: 'preset'; preset: Preset }
  | { kind: 'bank'; presets: Preset[] };

export async function encodePayload(payload: CassettePayload): Promise<Uint8Array> {
  if (payload.kind === 'preset') {
    const json = JSON.stringify(serializePreset(payload.preset));
    const bytes = enc.encode(json);
    const out = new Uint8Array(1 + bytes.length);
    out[0] = TYPE_SINGLE;
    out.set(bytes, 1);
    return out;
  }
  const json = JSON.stringify({
    schema: 'sixinone-cassette-bank',
    version: 1,
    presets: payload.presets.map(serializePreset),
  });
  const gz = await gzip(enc.encode(json));
  const out = new Uint8Array(1 + gz.length);
  out[0] = TYPE_BANK;
  out.set(gz, 1);
  return out;
}

export async function decodePayload(bytes: Uint8Array): Promise<CassettePayload> {
  if (bytes.length < 2) throw new Error('payload too short');
  const type = bytes[0];
  if (type === TYPE_SINGLE) {
    const json = dec.decode(bytes.subarray(1));
    const parsed = JSON.parse(json) as ReturnType<typeof serializePreset>;
    return { kind: 'preset', preset: deserializePreset(parsed) };
  }
  if (type === TYPE_BANK) {
    const raw = await gunzip(bytes.subarray(1));
    const parsed = JSON.parse(dec.decode(raw)) as {
      schema?: string;
      presets?: ReturnType<typeof serializePreset>[];
    };
    if (parsed.schema !== 'sixinone-cassette-bank' || !Array.isArray(parsed.presets)) {
      throw new Error('unrecognised bank schema');
    }
    return { kind: 'bank', presets: parsed.presets.map(deserializePreset) };
  }
  throw new Error(`unknown payload type 0x${type?.toString(16)}`);
}

async function gzip(input: Uint8Array): Promise<Uint8Array> {
  const CS = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream;
  if (!CS) throw new Error('compression unavailable in this browser');
  const blob = new Blob([input as BlobPart]);
  const stream = blob.stream().pipeThrough(new CS('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(input: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (!DS) throw new Error('decompression unavailable in this browser');
  const blob = new Blob([input as BlobPart]);
  const stream = blob.stream().pipeThrough(new DS('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Approximate (post-encoding) byte count — used by the UI to estimate duration. */
export function estimatePayloadBytes(payload: CassettePayload): number {
  if (payload.kind === 'preset') {
    return 1 + enc.encode(JSON.stringify(serializePreset(payload.preset))).length;
  }
  // We can't know the gzip size without running it, so estimate 5× JSON
  // compression — empirically observed for our preset JSON. Worst-case
  // user just sees a slightly off duration estimate; nothing breaks.
  const json = JSON.stringify({
    schema: 'sixinone-cassette-bank',
    version: 1,
    presets: payload.presets.map(serializePreset),
  });
  return 1 + Math.round(enc.encode(json).length / 5);
}

export function clonePresets(presets: Preset[]): Preset[] {
  return presets.map(clonePreset);
}
