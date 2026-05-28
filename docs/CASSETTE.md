# Cassette Audio Transfer

This is the most useless feature in SIXinONE. It's also the one I'd lose first if you took my hands away from the keyboard.

## What it does

It encodes a preset (or the whole 100-slot bank) into audio that **sounds like a 1980s dial-up modem**, plays it through your speakers, and the bytes can be reconstructed by another browser listening through its microphone. It also writes / reads `.wav` files for an asynchronous version.

It is much slower than the JSON `.mm-bank` file. It is much more fragile. It is not "an alternative protocol". **It is an homage.** It exists because in 1982 the Memorymoog Plus shipped with a cassette interface, and we owe Bob Moog a thank-you.

## Three philosophies (and the one I picked)

### 1. FSK 1982 — exact period authenticity

The Memorymoog Plus cassette interface used the **Kansas City Standard** (300 baud, 1200/2400 Hz). It was *brutally* slow — backing up a full preset bank took several minutes. It was also unreliable enough that the manual warned you to "make two copies" of every tape.

**Pros:** Period accurate. Sounds *exactly* like the real Memorymoog tape jack.
**Cons:** 300 baud means a 1 KB preset takes 30+ seconds. Bank backup takes the better part of an hour.

### 2. ggwave 2021 — modern, robust, sounds clinical

[Georgi Gerganov's ggwave](https://github.com/ggerganov/ggwave) is the state-of-the-art audio data protocol. Multi-frequency, Reed-Solomon, sounds like R2-D2.

**Pros:** Near-perfect reliability. Fast (a few KB/s). 30 KB MIT-licensed library.
**Cons:** Doesn't sound like anything from the analog synth era — it's distinctly 2020s. Adds a dependency. The point of the cassette feature is to *feel* nostalgic, not to be Bluetooth-over-audio.

### 3. ✅ Bell 202 1976 — the iconic modem sound, just fast enough

We went with **Bell 202 AT&T modem standard**: 1200 Hz mark, 2200 Hz space, 1200 baud. This is the sound your parents heard every time they checked email in 1995. It pre-dates the Memorymoog by six years, isn't *literally* what the cassette jack used, but anyone over thirty hears it and grins.

**Pros:** Iconic. Sub-6 kHz so it's pleasing to the human ear. 4× the throughput of Kansas City Standard. Implementable in ~250 lines.
**Cons:** Less period-authentic than KCS. Still slow compared to ggwave.

## Protocol spec

```
┌─ click (50 ms, band-limited noise burst — "tape head engages")
├─ preamble (800 ms, alternating 0/1 at 1200 baud — sync tone)
├─ sync word (16 bits = 0xAA55 — distinctive, polarity-symmetric)
├─ MAGIC "SIX1" (4 bytes) — distinguishes our frames from random audio
├─ version (1 byte = 0x01)
├─ length (16 bits big-endian) — raw payload bytes
├─ payload (length bytes, Hamming(7,4) encoded)
├─ CRC-32 (4 bytes, Hamming-encoded)
├─ tail (300 ms, steady 1200 Hz "end of transmission")
└─ click (50 ms, tape head disengages)
```

| Parameter      | Value                       |
| -------------- | --------------------------- |
| Modulation     | Continuous-phase 2-FSK      |
| Mark / space   | 1200 Hz / 2200 Hz           |
| Baud rate      | 1200 symbols / sec          |
| ECC            | Hamming(7,4) per nibble     |
| Integrity      | CRC-32 (IEEE 802.3) on payload |
| Sample rate    | 44100 Hz (encoder) / `AudioContext.sampleRate` (decoder) |

The payload itself uses a 1-byte type discriminator:

| Type | Meaning                                |
| ---- | -------------------------------------- |
| 0x01 | Single preset, plain UTF-8 JSON        |
| 0x02 | Full bank, gzipped UTF-8 JSON          |

The bank is *always* gzipped (via `CompressionStream`). A 100-preset JSON bank goes from ~80 KB to ~12-15 KB after gzip, which is the only way it fits in the 3-minute attention budget.

## Throughput (measured)

| Payload                          | Audio length                                        |
| -------------------------------- | --------------------------------------------------- |
| 1 byte                           | ~1.16 s                                             |
| 1 KB single preset               | ~12 s                                               |
| 10 KB                            | ~2 min                                              |
| 15 KB gzipped 100-preset bank    | ~3 min                                              |

Net rate is **~85 raw bytes per second**: 1200 baud divided by 7/4 Hamming overhead and a flat ~1 s of preamble + tail.

## Reliability

In a quiet room, MacBook speakers → phone microphone at 30 cm, we observed **>95 % decode success on the single-preset path**. The CRC-32 catches everything Hamming can't fix; on failure the user sees `BAD TAPE` and is invited to retry.

Bad-tape scenarios we handle correctly:
- No sync word found (mic was off, or the audio never reached us): `no-sync` → `BAD TAPE`
- MAGIC mismatched (sync but wrong protocol): `bad-magic` → `BAD TAPE`
- CRC failure (bits got mangled): `bad-checksum` → `BAD TAPE`
- Length field bigger than 64 KB: `too-large` → `BAD TAPE`

There is **no scenario where a partial decode silently overwrites the user's bank**. If it didn't load cleanly, we don't write anything.

## Known limitations

- **Carrier-vs-noise**: needs > ~20 dB CNR (carrier-to-noise ratio) to hit 95 %. Very noisy rooms or laptop fans close to the mic can break it.
- **Browser autoplay**: the audio context must be unlocked by a user gesture. Clicking REC counts.
- **`CompressionStream` support**: required for the bank-via-audio path. All modern Chromium/Firefox/Safari have it; older Safari (< 16) won't.
- **Live-mic on iOS Safari**: works but the browser sometimes runs noise-suppression even when we ask it not to. Try the `.wav` path if live keeps failing.
- **Cross-device tone-quality**: cheap Bluetooth speakers EQ the carrier in unpredictable ways. Use the device's wired audio out for best results.

## Cultural notes

The original Memorymoog Plus shipped with a 1/4" mono jack on the back panel labelled **CASSETTE**. The manual told you to plug it into a portable tape recorder, hit RECORD on the tape and then SAVE on the synth. The 100-preset bank took roughly four minutes to write. The receiving end was even slower — you had to rewind, hit PLAY, and start LOAD on the synth. There was a printed warning that said, paraphrasing: *if the LCD displays BAD TAPE, try again with a cleaner cassette*.

The Kansas City Standard the MM used was already obsolete by 1982 — Bell 103 modems (300 baud over phone lines) had been around since 1962, the much faster Bell 212A (1200 baud) since 1976. The MM engineers picked KCS because it was patent-free and because the spec was simple enough to implement on the cassette interface's audio chip without a full UART. Authenticity was never the point; it was a backup format, not a music format.

What we built here is **closer to the early-90s modem sound** because that's what the player is going to recognize. If you owned a 14.4 kbps modem, the 1200/2200 Hz Bell 202 frequencies are the ones your brain calibrates to "computer making noises at telephone".

The **`BAD TAPE`** message is the only thing we copy literally from the 1982 manual. It's a four-word capsule of an era when computers spoke to people in twelve letters at a time, and when the truthful answer to "what just happened" was sometimes "your magnetic-particle alignment was off".

## File layout

```
src/audio/cassette/
  modem.ts            — 2-FSK encoder/decoder, Hamming(7,4) ECC
  wav-encoder.ts      — Float32 → RIFF/WAVE Blob
  wav-decoder.ts      — File → mono Float32 via decodeAudioData
  live-transmitter.ts — Float32 → BufferSource → destination
  live-receiver.ts    — getUserMedia → streaming demod
  payload.ts          — single-preset vs gzipped-bank framing
src/ui/components/
  cassette.ts         — FORMAT switch + AUDIO sub-panel + reels + waveform
tests/
  cassette-modem.test.ts — round-trip + corruption tests
  wav-encoder.test.ts    — RIFF header sanity + clamp behaviour
```
