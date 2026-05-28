/**
 * .mm-bank — the cassette-tape archive format.
 *
 * File layout (UTF-8 text):
 *
 *   SIXinONE MM-BANK v1
 *   ─────────────────
 *   Created: 2026-05-28T15:42:00Z
 *   Presets: 100
 *   Checksum: <sha256-hex>
 *   ─────────────────
 *   {... json ...}
 *
 * The checksum is a SHA-256 of the JSON body (exactly the bytes after the
 * second separator line, no trailing whitespace). The format mirrors the
 * Memorymoog's classic "tape header" so corrupted bank files surface as
 * "BAD TAPE" — the same error the original synth would print on a bad
 * cassette load.
 */

import type { Preset } from './preset';
import { deserializePreset, serializePreset } from './preset';

export interface MmBankFile {
  version: number;
  createdAt: string;
  presets: Preset[];
}

const HEADER_LINE = 'SIXinONE MM-BANK v1';
const SEPARATOR = '─────────────────';

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const bytes = enc.encode(text);
  const subtle = (globalThis.crypto && (globalThis.crypto as Crypto).subtle) || undefined;
  if (!subtle) throw new Error('Web Crypto SubtleCrypto unavailable');
  const buf = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function serializeMmBank(presets: Preset[]): Promise<string> {
  const body = JSON.stringify({
    schema: 'sixinone-mm-bank',
    version: 1,
    presets: presets.map(serializePreset),
  });
  const sum = await sha256Hex(body);
  const header = [
    HEADER_LINE,
    SEPARATOR,
    `Created: ${new Date().toISOString()}`,
    `Presets: ${presets.length}`,
    `Checksum: ${sum}`,
    SEPARATOR,
    '',
  ].join('\n');
  return header + body;
}

export class BadTapeError extends Error {
  constructor(reason: string) {
    super(`Bad tape: ${reason}`);
    this.name = 'BadTapeError';
  }
}

export async function deserializeMmBank(text: string): Promise<MmBankFile> {
  if (!text.startsWith(HEADER_LINE)) throw new BadTapeError('header missing');
  const sepIdx2 = text.indexOf(SEPARATOR, text.indexOf(SEPARATOR) + SEPARATOR.length);
  if (sepIdx2 < 0) throw new BadTapeError('separator missing');
  const headerBlock = text.slice(0, sepIdx2 + SEPARATOR.length);
  const bodyStart = headerBlock.length;
  const body = text.slice(bodyStart).replace(/^\n+/, '');
  if (body.length === 0) throw new BadTapeError('empty body');

  // Pull checksum from header.
  const checksumLine = headerBlock.split('\n').find((l) => l.startsWith('Checksum: '));
  if (!checksumLine) throw new BadTapeError('checksum missing');
  const expected = checksumLine.slice('Checksum: '.length).trim();
  const actual = await sha256Hex(body);
  if (expected !== actual) throw new BadTapeError(`checksum mismatch (expected ${expected.slice(0, 8)}…)`);

  let payload: { presets?: Array<{ v?: number; preset?: Preset }>; schema?: string };
  try {
    payload = JSON.parse(body) as typeof payload;
  } catch (err) {
    throw new BadTapeError(`malformed JSON: ${(err as Error).message}`);
  }
  if (payload.schema !== 'sixinone-mm-bank' || !Array.isArray(payload.presets)) {
    throw new BadTapeError('unrecognised schema');
  }

  const presets = payload.presets
    .map((s) => {
      try {
        return deserializePreset(s);
      } catch {
        return null;
      }
    })
    .filter((p): p is Preset => p !== null);

  return {
    version: 1,
    createdAt: headerBlock.split('\n').find((l) => l.startsWith('Created: '))?.slice('Created: '.length) ?? '',
    presets,
  };
}

/**
 * Merge mode — return the subset of `incoming` presets whose contents differ
 * from `current[number]`. Keeps user customisations on slots the new bank
 * doesn't actually change.
 */
export function diffPresets(current: Preset[], incoming: Preset[]): Preset[] {
  const byNumber = new Map(current.map((p) => [p.number, p]));
  const out: Preset[] = [];
  for (const p of incoming) {
    const existing = byNumber.get(p.number);
    if (!existing) {
      out.push(p);
    } else if (JSON.stringify(existing) !== JSON.stringify(p)) {
      out.push(p);
    }
  }
  return out;
}
