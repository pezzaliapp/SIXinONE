# SIXinONE — A Tribute to the Moog Memorymoog (1982)

> Unofficial educational web simulator inspired by the **Moog Memorymoog Plus** (Model 345, 1982–1985).
> Vanilla TypeScript + Web Audio API + Web MIDI API. No Tone.js, no samples. Buildable, installable, runs offline.

[Demo (GitHub Pages)](https://pezzaliapp.github.io/SIXinONE/) · [Issues](https://github.com/pezzaliapp/SIXinONE/issues)

Moog, Memorymoog and the Moog logo are trademarks of Moog Music Inc. This project is an unofficial,
non-commercial educational simulator. It is not affiliated with, endorsed by, or sponsored by Moog Music Inc.

---

## What's inside

- **6 voices, 18 oscillators** (3 per voice) — sawtooth / triangle / square (true PWM is TODO).
- **Moog 24 dB/oct ladder filter** — custom AudioWorklet, Huovilainen-style with tanh nonlinearity, 2× oversampling, self-oscillation above Emphasis ≈ 7. BiquadFilter fallback for unusual environments.
- **Two ADSR envelopes per voice** (Filter + VCA) with the four global Contour switches.
- **Global LFO** — TRI / SAW+ / SAW− / SQR via native OscillatorNode, S&H via timer-driven ConstantSource. Routes to OSC1/2/3 pitch and Filter cutoff.
- **100 archetype-programmed factory presets** — strings, brass, sync screamers, monos, clavs, electric pianos, organs, bells, effects, ring mod, etc.
- **Numeric System Controller** — keypad + ENTER + RECORD INTERLOCK + A/B/C/D bank prefixes; user edits land in IndexedDB and shadow the factory bank.
- **Web MIDI** — in / thru / out, channel filter (Omni or 1–16), pitch bend scaled by the panel knob, program-change loads presets from the bank.
- **10-slot sequencer** — REC / PLAY / STEP / SYNC_EXT modes, BPM 30–300, lookahead scheduling, real-time recording from the virtual keyboard.
- **61-key virtual keyboard** — pointer drag + computer-keyboard mapping + octave shift + 6 voice-activity LEDs.
- **Installable PWA** — SVG icons, offline service worker, works in dev and prod.

## Quick start

```bash
git clone https://github.com/pezzaliapp/SIXinONE.git
cd SIXinONE
npm install
npm run dev          # local dev server on http://localhost:5173
npm run build        # production build (typecheck + Vite + service worker)
npm run preview      # serve the production build
npm run lint         # ESLint
npm run test         # Vitest
```

## Keyboard shortcuts

| Range          | Keys                                                                  |
| -------------- | --------------------------------------------------------------------- |
| Lower octave   | `z s x d c v g b h n j m` (continues `,` `l` `.` `;` `/`)             |
| Upper octave   | `q 2 w 3 e r 5 t 6 y 7 u` (continues `i` `9` `o` `0` `p`)             |
| Octave shift   | `[` down · `]` up                                                     |
| Knob fine      | hold `Shift` while dragging                                           |
| Knob reset     | double-click                                                          |
| Knob scroll    | mouse wheel (`Shift` = fine)                                          |
| Help overlay   | click `?` in the header (close with `Esc`)                            |

## System Controller workflow

1. Type 1 or 2 digits on the keypad. The alphanumeric display shows the buffer (e.g. `→ 27`).
2. Press **ENTER** to **load** that preset (0–99) from the bank.
3. Latch **RECORD INTERLOCK** (red LED on), type a slot number, **ENTER** to **save** your current edit. The save lives in IndexedDB and shadows the factory bank — it survives reloads.

A/B/C/D buttons are visual selectors only (the original used them for bank/page selection; we ship a single 100-slot bank).

## MIDI guide

1. Click **Enable MIDI** to request Web MIDI permission.
2. Pick an input device (e.g. your hardware controller) and optionally an output device.
3. Pick a channel (or **Omni**).
4. Toggle **Thru** to forward raw input bytes to the output.

Supported channel-voice messages: Note On / Off (velocity scales the VCA peak), Pitch Bend (scaled by the panel's *Pitch Bend Amount* knob, ±1 octave at full), Program Change 0–99 (loads from the bank), CC 123 (All Notes Off). Mod wheel (CC 1) and Sustain (CC 64) parse but their engine wiring is a TODO.

Safari ≤16 has no Web MIDI — the panel will display "browser unsupported" and degrade gracefully.

## Sequencer flow

1. Pick a slot (0–9).
2. Latch **REC** and play notes on the keyboard (the keyboard publishes them on a shared note bus the sequencer subscribes to).
3. Un-latch **REC** and press **PLAY**.
4. **STEP** advances one event at a time; **SYNC_EXT** is the hook for external MIDI clock (`Sequencer.externalTick()`).

## Demos

The **DEMOS** button (next to `?` in the header) opens a player with 8 pre-recorded sequences that drive the live engine through `DemoEvent` arrays — **no audio files, no samples**. Pressing PLAY makes the knobs and switches animate in sync with the audio: the educational point is that you *see* the synthesis happen.

| #     | Title                          | Category   | Preset | Duration |
| ----- | ------------------------------ | ---------- | ------ | -------- |
| A1    | Arena Sync Lead                | in-style   | 8      | 20 s     |
| A2    | Neon Drive                     | in-style   | 2 + 54 | 21 s     |
| A3    | Cinematic Sweep                | in-style   | 0      | 30 s     |
| A4    | Funk Bass Workout              | in-style   | 54     | 20 s     |
| B1    | Bach — Invention no. 1         | classical  | 49     | 30 s     |
| B2    | Mozart — Eine kleine Nachtmusik | classical | 1      | 20 s     |
| C1    | Filter Workout                 | technical  | 0      | 25 s     |
| C2    | 100 Presets Tour               | technical  | 0..99  | 3 min 20 s |

### Legal & credits

All in-style demos are **original compositions**, freshly written in the mood of an era but not derived from any copyrighted melody. Classical demos use public-domain scores only:

- **J. S. Bach** († 1750) — BWV 772, *Invention no. 1 in C major*.
- **W. A. Mozart** († 1791) — K. 525, *Eine kleine Nachtmusik*.

Bach demo presented on the harpsichord patch in homage to **Wendy Carlos**, *Switched-On Bach* (1968).

### Playback controls

- Click PLAY on any row to start.
- Space toggles play/pause; Esc stops. `←` / `→` jump between presets on the long tour.
- Any click on a panel knob/switch or any keyboard key automatically pauses the demo and surfaces a toast. Toggle **Lock controls during demo** to opt out.
- See [`docs/DEMOS.md`](./docs/DEMOS.md) for the event format and how to add a new demo.

## Cassette Audio Transfer (Easter Egg)

The cassette panel has a **FORMAT** switch — `[TEXT]` (the standard `.mm-bank` JSON file) or `[AUDIO]` (Bell 202 2-FSK modem). In AUDIO mode you can also choose the *scope* (single preset / all 100) and the *source* (a `.wav` download / live mic-and-speaker), then click REC: the speakers will whirr like a 1980s dial-up handshake, the alphanumeric display will narrate `SYNC… → SAVING → OK`, and the bytes are on their way.

To receive, click PLAY in AUDIO mode and either pick a `.wav` file or hold a phone (or another browser) playing the audio close to the mic. The display walks `SYNC… → LOADING → CHECK… → OK` and the preset lands in the bank.

> **This is intentionally slow and fragile. It's an homage, not a feature.**
>
> A single preset takes ≈ 12 seconds of audio to transmit. The 100-preset bank takes ≈ 3 minutes (gzipped). In a quiet room with a phone at 30 cm we see ≥ 95 % decode success; in a noisier environment expect `BAD TAPE` and the chance to try again — exactly as the 1982 Memorymoog manual warned you.

See [`docs/CASSETTE.md`](./docs/CASSETTE.md) for the protocol spec, design choices (FSK 1982 vs ggwave 2021 vs the Bell 202 we landed on) and the cultural notes that justify why a feature this fragile is the one we're proudest of.

## The 100 factory presets

Programmed from 17 archetype builders (see [`src/data/factory-presets.ts`](./src/data/factory-presets.ts)). Each preset respects the sonic DNA the name implies:

| Range  | Family                                |
| ------ | ------------------------------------- |
| String 1–10 | saw-stack pad with slow attack    |
| Brass 1–10  | pulse-wave brass with filter-env bite |
| Sync 1–5, Sync Sweep 1–4, Sync S&H | OSC2→OSC1 hard sync screamers + filter sweeps |
| Mono 1–5    | mono mode + glide + fat detuned saws  |
| Clav 1–5, Quint Hpscd, Synth Plectrum | narrow pulse + percussive filter env |
| E Piano 1–3 | tri+saw with soft filter env          |
| Organ 1–5, Synth Organ, Accordion | tri+saw stack, sustained, no env mod |
| Bells, Vibes, Wind Chimes, Celeste, Tuned Perc, Triangle Wv | triangle waves, percussive VCA |
| Recorder, Calliope, Flutes, Echo Whistle, Double Reed, Synth Woodwind | triangle prevalent, filter closed |
| Take-Off, UFO, Sirens, Butterflies, Log Drum, Surprise, Drop Off, Sizzle | S&H LFO + chaotic routing |
| Ring Mod 1–2 | sync + dissonant intervals + saturation |
| Filter Trill, Octave Trill, Q Filter Trill, Q Osc Trill | LFO-driven trills |
| Synth Sweep, Synth Sq 1–2, Power Synth, Octave Syn 1–2, Poly Glide, FM 1, Release Voice, Quint Synth, Vocal Chorus, Chorus Syn | synth leads / pads |

These are plausible interpretations, not bit-perfect reverse-engineering — the brief explicitly accepts that trade-off.

## Architecture

```
src/
  audio/
    context.ts            AudioContext singleton + master bus
    synth.ts              Top-level facade (noteOn/noteOff/setPreset/panic)
    voice.ts              Per-note voice graph (3 osc + noise + filter + VCA)
    voice-allocator.ts    6-voice polyphony with cyclic / reset-to-A + steal
    envelope.ts           ADSR helpers for AudioParam scheduling
    filter.ts             MoogFilter wrapper (worklet ↔ BiquadFilter fallback)
    lfo.ts                Global LFO (4 waves + S&H)
    noise.ts              Paul Kellet pink noise buffer
    worklets/moog-ladder.js   Huovilainen ladder filter processor
  data/
    preset.ts             Preset interface + serialization
    preset-scales.ts      Knob 0–10 → real-world (Hz/s/cents) maps
    factory-presets.ts    100 archetype-built presets
    preset-bank.ts        100-slot bank with user overrides
    preset-storage.ts     IndexedDB persistence + JSON import/export
  midi/
    messages.ts           Parser + encoders (Note/CC/PB/PC)
    midi-bridge.ts        Web MIDI access + routing
  sequencer/
    sequencer.ts          10-slot sequencer with lookahead scheduling
  state/
    signal.ts             Reactive Signal<T> primitive
    store.ts              currentPreset / displayMessage / voiceActivity
    note-bus.ts           Played-note event bus (keyboard → sequencer)
  ui/
    app.ts                Boot
    panel.ts              Three-column front-panel layout
    keyboard.ts           61-key virtual keyboard
    style.css             All styling
    components/           knob, switch, display, keypad, midi-panel, sequencer-panel, help-panel
tests/                    Vitest unit tests (29 assertions across 5 files)
```

## What's not done (yet)

- **True PWM oscillator** — currently `pulse` maps to native square; PW modulation destinations are intentionally inert.
- **Hard sync 2→1** — flagged in the preset but not actually implemented (needs the custom oscillator worklet).
- **Footpedals + arpeggiator** — modelled in the preset but UI/wiring isn't there.
- **Mod wheel + Sustain CC** — parsed but not engine-wired.
- **Real screenshot** — needs to be captured manually and dropped in `docs/screenshot.png`.
- **VCO drift modelling** — Auto Tune flashes the display but there's no actual drift to recalibrate.
- **Return-to-Zero / Unconditional Contour** — surfaced on the panel as visual state; per-voice impact in our retriggering model is null. Differentiating them needs the envelope generator to live outside the Voice.

## Suggestions for v2

- True PWM oscillator AudioWorklet (and hard sync as a side effect).
- MPE support (per-note pressure + slide).
- Mod wheel → LFO depth, Sustain → envelope hold.
- Effects bus: chorus, plate reverb, tape delay.
- Cassette-style preset import/export UI (the back panel has the placeholder).
- External MIDI clock as `Sequencer` SYNC_EXT input.

## License

[MIT](./LICENSE). See `LICENSE` for the full trademark notice.

## Credits

Designed with reverence for the work of Bob Moog, Tom Rhea, Herbert Deutsch, and for the preset programmers credited in the 1982 Memorymoog user manual: **Wendy Carlos, Jan Hammer, Don Airey, Tom Coster, Larry Fast**, and **Herbert Deutsch** himself.

Built in collaboration with Claude (Anthropic) as part of the SIXinONE series by [Alessandro Pezzali](https://pezzaliapp.it).
