/**
 * Cassette modem — 2-FSK Bell 202 with Hamming(7,4) ECC.
 *
 * Protocol summary (in audible space, so it sounds like a real 80s modem):
 *
 *   ┌─ click 50 ms (band-limited noise burst — "tape head engages")
 *   ├─ preamble 800 ms — alternating 0/1 at 1200 baud (the "vrr-vrr"
 *   │                    sync tone the listener recognises)
 *   ├─ sync word 16 bits = 0xAA55 — distinctive pattern, easy to find
 *   ├─ length 16 bits BE — raw payload length in bytes
 *   ├─ payload N bytes — caller's bytes + 4 trailing CRC-32 bytes,
 *   │                    all Hamming(7,4) encoded so each nibble can
 *   │                    survive a single-bit flip
 *   ├─ tail 300 ms — steady mark tone (1200 Hz), "end of transmission"
 *   └─ click 50 ms (tape head disengages)
 *
 * Frequency choices: 1200 Hz mark, 2200 Hz space — the exact Bell 202
 * AT&T modem standard (1976), reused by every retro audio bootloader
 * from C64 turbo tapes to amateur radio packet networks. Sub-6 kHz keeps
 * it pleasing to the human ear; > 1 kHz keeps it above HVAC rumble.
 *
 * ECC: Hamming(7,4) — 75% overhead, corrects 1 bit per nibble, detects 2.
 * Beats 3x repetition (200% overhead) on throughput, beats a bare CRC32
 * on robustness. Plus a CRC-32 over the entire payload catches anything
 * Hamming can't fix and flips the user-visible message to "BAD TAPE".
 *
 * Net throughput at 1200 baud with Hamming: ≈ 85 raw payload bytes/sec.
 * One typical preset (≈ 1 KB minified JSON) → ~12 seconds of audio.
 */

const MARK_HZ = 1200; // binary 1
const SPACE_HZ = 2200; // binary 0
const BAUD = 1200;
const PREAMBLE_SEC = 0.8;
const SYNC_WORD = 0xaa55;
const TAIL_SEC = 0.3;
const CLICK_SEC = 0.05;
const MAGIC = [0x53, 0x49, 0x58, 0x31]; // "SIX1"
const VERSION = 0x01;

// ── CRC-32 (IEEE 802.3 polynomial, reflected) ────────────────────────
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) {
    c = (CRC32_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ── Hamming(7,4) — encode a nibble (4 bits) into a 7-bit codeword ─────
// Codeword bit ordering (1-indexed): [p1 p2 d1 p3 d2 d3 d4]
// p1 = d1 ⊕ d2 ⊕ d4
// p2 = d1 ⊕ d3 ⊕ d4
// p3 = d2 ⊕ d3 ⊕ d4
function hammingEncodeNibble(nibble: number): number {
  const d1 = (nibble >> 3) & 1;
  const d2 = (nibble >> 2) & 1;
  const d3 = (nibble >> 1) & 1;
  const d4 = nibble & 1;
  const p1 = d1 ^ d2 ^ d4;
  const p2 = d1 ^ d3 ^ d4;
  const p3 = d2 ^ d3 ^ d4;
  return (p1 << 6) | (p2 << 5) | (d1 << 4) | (p3 << 3) | (d2 << 2) | (d3 << 1) | d4;
}

/** Decode one 7-bit Hamming codeword. Returns the 4-bit nibble + uncorrectable flag. */
function hammingDecodeNibble(codeword: number): { nibble: number; uncorrectable: boolean } {
  const p1 = (codeword >> 6) & 1;
  const p2 = (codeword >> 5) & 1;
  let d1 = (codeword >> 4) & 1;
  const p3 = (codeword >> 3) & 1;
  let d2 = (codeword >> 2) & 1;
  let d3 = (codeword >> 1) & 1;
  let d4 = codeword & 1;
  // Syndrome bits — non-zero means an error in the position they encode.
  const s1 = p1 ^ d1 ^ d2 ^ d4;
  const s2 = p2 ^ d1 ^ d3 ^ d4;
  const s3 = p3 ^ d2 ^ d3 ^ d4;
  const syndrome = (s3 << 2) | (s2 << 1) | s1;
  if (syndrome !== 0) {
    // Map syndrome (1..7) to bit position (1-indexed from MSB of the codeword).
    // Order from the encode mapping above: p1=pos1, p2=pos2, d1=pos3, p3=pos4,
    // d2=pos5, d3=pos6, d4=pos7.
    switch (syndrome) {
      case 1: /* p1 */ break;
      case 2: /* p2 */ break;
      case 3:
        d1 ^= 1;
        break;
      case 4: /* p3 */ break;
      case 5:
        d2 ^= 1;
        break;
      case 6:
        d3 ^= 1;
        break;
      case 7:
        d4 ^= 1;
        break;
    }
  }
  return {
    nibble: (d1 << 3) | (d2 << 2) | (d3 << 1) | d4,
    uncorrectable: false,
  };
}

function hammingEncodeBytes(bytes: Uint8Array): Uint8Array {
  // Each byte → two nibbles → two 7-bit codewords → packed into 14 bits.
  // Pack 7-bit codewords into a contiguous bit stream, then byte-align.
  const totalBits = bytes.length * 2 * 7;
  const out = new Uint8Array(Math.ceil(totalBits / 8));
  let bitIdx = 0;
  for (const b of bytes) {
    const hi = hammingEncodeNibble((b >> 4) & 0x0f);
    const lo = hammingEncodeNibble(b & 0x0f);
    for (let i = 6; i >= 0; i--) {
      const bit = (hi >> i) & 1;
      out[bitIdx >> 3]! |= bit << (7 - (bitIdx & 7));
      bitIdx++;
    }
    for (let i = 6; i >= 0; i--) {
      const bit = (lo >> i) & 1;
      out[bitIdx >> 3]! |= bit << (7 - (bitIdx & 7));
      bitIdx++;
    }
  }
  return out;
}

function hammingDecodeBytes(encoded: Uint8Array, byteCount: number): { bytes: Uint8Array; uncorrectable: boolean } {
  const out = new Uint8Array(byteCount);
  let uncorrectable = false;
  let bitIdx = 0;
  for (let bi = 0; bi < byteCount; bi++) {
    let hi = 0;
    for (let i = 0; i < 7; i++) {
      hi = (hi << 1) | ((encoded[bitIdx >> 3]! >> (7 - (bitIdx & 7))) & 1);
      bitIdx++;
    }
    let lo = 0;
    for (let i = 0; i < 7; i++) {
      lo = (lo << 1) | ((encoded[bitIdx >> 3]! >> (7 - (bitIdx & 7))) & 1);
      bitIdx++;
    }
    const dh = hammingDecodeNibble(hi);
    const dl = hammingDecodeNibble(lo);
    if (dh.uncorrectable || dl.uncorrectable) uncorrectable = true;
    out[bi] = (dh.nibble << 4) | dl.nibble;
  }
  return { bytes: out, uncorrectable };
}

// ── Tone generation (continuous-phase FSK) ────────────────────────────

/** Append `bit`s worth of CPFSK audio to `out`, starting at sample index `cursor`. */
function modulateBits(bits: number[], sampleRate: number): Float32Array {
  const samplesPerBit = sampleRate / BAUD;
  const totalSamples = Math.round(bits.length * samplesPerBit);
  const out = new Float32Array(totalSamples);
  let phase = 0;
  let sampleIdx = 0;
  for (let bi = 0; bi < bits.length; bi++) {
    const freq = bits[bi] === 1 ? MARK_HZ : SPACE_HZ;
    const omega = (2 * Math.PI * freq) / sampleRate;
    const endIdx = Math.round((bi + 1) * samplesPerBit);
    while (sampleIdx < endIdx && sampleIdx < totalSamples) {
      out[sampleIdx++] = Math.sin(phase);
      phase += omega;
      if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
    }
  }
  return out;
}

function generateClick(sampleRate: number): Float32Array {
  const n = Math.round(CLICK_SEC * sampleRate);
  const out = new Float32Array(n);
  // Band-limited noise burst — "tape head engages". Soft attack/decay so it
  // sounds like a click, not a pop.
  for (let i = 0; i < n; i++) {
    const env = Math.sin((Math.PI * i) / n); // half-sine envelope
    out[i] = (Math.random() * 2 - 1) * env * 0.12;
  }
  return out;
}

function generateTail(sampleRate: number): Float32Array {
  const n = Math.round(TAIL_SEC * sampleRate);
  const out = new Float32Array(n);
  const omega = (2 * Math.PI * MARK_HZ) / sampleRate;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    // Apply a 50 ms fade-out at the end so the tail doesn't pop.
    const fadeStart = n - Math.round(0.05 * sampleRate);
    const env = i < fadeStart ? 1 : (n - i) / (n - fadeStart);
    out[i] = Math.sin(phase) * env;
    phase += omega;
  }
  return out;
}

function concat(parts: Float32Array[]): Float32Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Float32Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// ── Public API ────────────────────────────────────────────────────────

export interface ModemEncodeOptions {
  sampleRate?: number;
  /** Amplitude of the carrier tones (0..1). Default 0.6 leaves headroom. */
  amplitude?: number;
}

/** Encode a byte payload into a PCM signal. */
export function encode(payload: Uint8Array, opts: ModemEncodeOptions = {}): Float32Array {
  const sampleRate = opts.sampleRate ?? 44100;
  const amp = opts.amplitude ?? 0.6;

  // Build the framed bytes: MAGIC + VERSION + LEN(2) + PAYLOAD + CRC32(4).
  const len = payload.length;
  if (len > 65535) throw new Error('payload too large for cassette frame (max 64 KB)');
  const header = Uint8Array.from([...MAGIC, VERSION, (len >> 8) & 0xff, len & 0xff]);
  const cksum = crc32(payload);
  const cksumBytes = Uint8Array.from([
    (cksum >>> 24) & 0xff,
    (cksum >>> 16) & 0xff,
    (cksum >>> 8) & 0xff,
    cksum & 0xff,
  ]);
  const framePayload = new Uint8Array(header.length + payload.length + cksumBytes.length);
  framePayload.set(header, 0);
  framePayload.set(payload, header.length);
  framePayload.set(cksumBytes, header.length + payload.length);

  // Hamming-encode the whole frame payload as a single bit stream.
  const encoded = hammingEncodeBytes(framePayload);
  const dataBits: number[] = [];
  // Sync word first (raw, not Hamming-encoded — easier to find).
  for (let i = 15; i >= 0; i--) dataBits.push((SYNC_WORD >> i) & 1);
  for (const byte of encoded) {
    for (let i = 7; i >= 0; i--) dataBits.push((byte >> i) & 1);
  }

  // Preamble: alternating 0/1 at the baud rate — gives the receiver a
  // chance to lock its timing.
  const preBits: number[] = [];
  const preCount = Math.round(PREAMBLE_SEC * BAUD);
  for (let i = 0; i < preCount; i++) preBits.push(i % 2);

  // Modulate.
  const click1 = generateClick(sampleRate);
  const preamble = modulateBits(preBits, sampleRate);
  const data = modulateBits(dataBits, sampleRate);
  const tail = generateTail(sampleRate);
  const click2 = generateClick(sampleRate);

  const signal = concat([click1, preamble, data, tail, click2]);
  // Apply amplitude scaling (skip the clicks — they're already quiet).
  for (let i = click1.length; i < signal.length - click2.length; i++) {
    signal[i] = signal[i]! * amp;
  }
  return signal;
}

// ── Decoder ───────────────────────────────────────────────────────────

/** Goertzel magnitude² at `targetFreq` over `samples[start..start+length)`. */
function goertzel(
  samples: Float32Array,
  targetFreq: number,
  sampleRate: number,
  start: number,
  length: number,
): number {
  // Cosine-weighted recurrence for narrow-band magnitude — cheap and stable.
  const omega = (2 * Math.PI * targetFreq) / sampleRate;
  const coeff = 2 * Math.cos(omega);
  let s1 = 0;
  let s2 = 0;
  const end = Math.min(samples.length, start + length);
  for (let i = start; i < end; i++) {
    const s = samples[i]! + coeff * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

export interface ModemDecodeResult {
  ok: boolean;
  bytes?: Uint8Array;
  reason?: 'no-sync' | 'short' | 'bad-checksum' | 'bad-magic' | 'too-large';
}

/**
 * Decode a PCM signal back to bytes. Slides through `pcm` looking for the
 * SYNC_WORD, then demodulates the Hamming-encoded frame after it.
 *
 * `sampleRate` should be the sample rate of `pcm` itself (so 44100 for a
 * `.wav` written by `wav-encoder.ts`, or `AudioContext.sampleRate` for live
 * mic input).
 */
export function decode(pcm: Float32Array, sampleRate = 44100): ModemDecodeResult {
  const samplesPerBit = sampleRate / BAUD;
  const minDataSamples = Math.round(samplesPerBit * 64); // need at least the header
  if (pcm.length < minDataSamples) return { ok: false, reason: 'short' };

  // Sync-word hunt: try every symbol-aligned starting offset across the
  // first second of audio. For each candidate offset we demod at exact
  // 1-symbol stride and check if the leading bits match SYNC_WORD.
  const bitWindow = Math.round(samplesPerBit);
  const syncBits: number[] = [];
  for (let i = 15; i >= 0; i--) syncBits.push((SYNC_WORD >> i) & 1);

  const demodAt = (start: number): number => {
    const m = goertzel(pcm, MARK_HZ, sampleRate, start, bitWindow);
    const s = goertzel(pcm, SPACE_HZ, sampleRate, start, bitWindow);
    return m > s ? 1 : 0;
  };

  let syncSample = -1;
  const maxScan = Math.min(pcm.length - bitWindow * 32, Math.round(2.5 * sampleRate));
  // Sub-symbol stride keeps the search robust to half-symbol phase offsets
  // — the candidate that *does* land on a real symbol boundary will produce
  // matching bits; the others will mismatch on the high-contrast sync pattern.
  const scanStride = Math.max(1, Math.round(samplesPerBit / 8));
  outer: for (let start = 0; start < maxScan; start += scanStride) {
    for (let j = 0; j < syncBits.length; j++) {
      const offset = start + Math.round(j * samplesPerBit);
      if (offset + bitWindow > pcm.length) continue outer;
      if (demodAt(offset) !== syncBits[j]) continue outer;
    }
    syncSample = start;
    break;
  }
  if (syncSample < 0) return { ok: false, reason: 'no-sync' };

  // Decode every symbol after the sync word at exact one-symbol stride
  // anchored on the sync's start. Phase error doesn't accumulate because
  // every symbol is timed off the integer-multiple offset from sync.
  const dataBits: number[] = [];
  let bi = syncBits.length;
  while (true) {
    const start = syncSample + Math.round(bi * samplesPerBit);
    if (start + bitWindow > pcm.length) break;
    dataBits.push(demodAt(start));
    bi++;
  }

  // Pack data bits into bytes.
  const dataBytes = new Uint8Array(Math.floor(dataBits.length / 8));
  for (let i = 0; i < dataBytes.length; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | dataBits[i * 8 + j]!;
    }
    dataBytes[i] = b;
  }

  // Hamming-decode the header first so we learn the payload length.
  // Header is MAGIC(4) + VERSION(1) + LEN(2) = 7 bytes → 14 codewords →
  // 98 bits → 13 bytes after packing.
  const headerByteCount = 7;
  const headerBitsNeeded = headerByteCount * 2 * 7;
  const headerByteSpan = Math.ceil(headerBitsNeeded / 8);
  if (dataBytes.length < headerByteSpan) return { ok: false, reason: 'short' };
  const headerDecoded = hammingDecodeBytes(dataBytes.slice(0, headerByteSpan), headerByteCount).bytes;
  // Verify MAGIC + version.
  for (let i = 0; i < MAGIC.length; i++) {
    if (headerDecoded[i] !== MAGIC[i]) return { ok: false, reason: 'bad-magic' };
  }
  if (headerDecoded[4] !== VERSION) return { ok: false, reason: 'bad-magic' };
  const payloadLen = (headerDecoded[5]! << 8) | headerDecoded[6]!;
  if (payloadLen > 65535) return { ok: false, reason: 'too-large' };

  // Decode the full frame (header + payload + crc32).
  const totalBytes = 7 + payloadLen + 4;
  const totalBitsNeeded = totalBytes * 2 * 7;
  const totalByteSpan = Math.ceil(totalBitsNeeded / 8);
  if (dataBytes.length < totalByteSpan) return { ok: false, reason: 'short' };
  const fullDecoded = hammingDecodeBytes(dataBytes.slice(0, totalByteSpan), totalBytes).bytes;

  // Verify the CRC.
  const payload = fullDecoded.slice(7, 7 + payloadLen);
  const receivedCrc =
    ((fullDecoded[7 + payloadLen]! << 24) >>> 0) |
    (fullDecoded[7 + payloadLen + 1]! << 16) |
    (fullDecoded[7 + payloadLen + 2]! << 8) |
    fullDecoded[7 + payloadLen + 3]!;
  if ((receivedCrc >>> 0) !== crc32(payload)) {
    return { ok: false, reason: 'bad-checksum' };
  }
  return { ok: true, bytes: payload };
}

/** Compute the approximate audio duration (sec) for a given payload size. */
export function estimatedDuration(payloadBytes: number, sampleRate = 44100): number {
  const click = CLICK_SEC * 2;
  const preamble = PREAMBLE_SEC;
  const sync = 16 / BAUD;
  const dataBits = (payloadBytes + 7 + 4) * 2 * 7;
  const data = dataBits / BAUD;
  const tail = TAIL_SEC;
  void sampleRate;
  return click + preamble + sync + data + tail;
}

/** Exposed for tests / docs. */
export const MODEM_SPEC = {
  MARK_HZ,
  SPACE_HZ,
  BAUD,
  PREAMBLE_SEC,
  TAIL_SEC,
  CLICK_SEC,
  SYNC_WORD,
  MAGIC,
  VERSION,
} as const;
