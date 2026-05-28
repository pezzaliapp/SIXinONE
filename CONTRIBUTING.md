# Contributing to SIXinONE

Thank you for taking the time to look. This is an educational, non-commercial tribute project — contributions in the same spirit are very welcome.

## Setup

```bash
git clone https://github.com/pezzaliapp/SIXinONE.git
cd SIXinONE
npm install
npm run dev
```

Open http://localhost:5173, click anything (browsers require a user gesture before starting AudioContext), and you should hear the active preset on the first key press.

## What runs in CI

`.github/workflows/ci.yml` runs on every push / PR:

- `npm run lint` — ESLint flat config (TypeScript + Prettier compatibility).
- `npm run typecheck` — TypeScript `--noEmit` in strict mode.
- `npm run test` — Vitest unit tests.
- `npm run build` — Vite production build (verifies typecheck again and produces the PWA bundle).

Please run all four locally before opening a PR.

## Manual audio test checklist

Audio behaviour is impossible to assert from a unit test — the synth's sound has to be evaluated by ear. Before submitting changes that touch `src/audio/`, `src/data/factory-presets.ts`, or `src/data/preset-scales.ts`, please go through this checklist:

### Voice graph
- [ ] Load `01 String 1` — slow attack, lush detuned saws, polyphonic.
- [ ] Load `02 Brass 1` — pulse-y, snappy filter env, brass-like.
- [ ] Load `08 Sync 1` — hear hard-sync glassiness on OSC2 (currently approximated — sync isn't fully wired).
- [ ] Load `15 Bells` — tri waves, no sustain, long ring-out.
- [ ] Load `54 Mono 1` — mono mode, glide on, fat detune.
- [ ] Press 7 notes at once — voice 1 should be cleanly stolen (no click).

### Filter
- [ ] Turn Emphasis to 9 with Cutoff at 5 — the filter should self-oscillate audibly.
- [ ] Sweep Cutoff from 0 to 10 — no clicks or DC offsets at the extremes.
- [ ] Confirm KB 1/3 / KB 2/3 buttons audibly change the cutoff↔note tracking.

### LFO
- [ ] Pick TRI, route to OSC1, mod amount 5 — clean vibrato.
- [ ] Pick S&H, route to Filter, mod amount 8 — random filter jumps, no buffer-underrun glitch.
- [ ] Change LFO Rate while a note is sustained — the rate updates live.

### Auto Tune
- [ ] Click Auto Tune — display shows `TUNING` then `6 TUNED` then returns to the preset name.
- [ ] Button LED snaps back to off after the sequence.

### Sequencer
- [ ] Latch REC on slot 0, play 4 notes, unlatch REC, press PLAY — the 4 notes loop at the BPM.
- [ ] Bump BPM to 60 mid-playback — rate slows immediately.
- [ ] Press STEP repeatedly with PLAY off — one step per click.
- [ ] CLR empties the current slot.

### MIDI (only if you have hardware)
- [ ] Enable MIDI, pick your keyboard as input — keys play the synth.
- [ ] Pitch bend on the controller bends the synth.
- [ ] Program Change 27 loads `Clav 1`.
- [ ] CC 123 (panic) silences a hung note.

### System Controller
- [ ] Type `27 ENTER` — `Clav 1` loads.
- [ ] Latch RECORD, edit a knob, type `27 ENTER` — display flashes `STORED 27`.
- [ ] Reload the page — the edit you made survives (IndexedDB).

### Keyboard / panel
- [ ] Drag a knob with Shift held — finer movement.
- [ ] Double-click a knob — resets to the preset default.
- [ ] Click `?` — help overlay opens. Escape closes it.

## Commit style

Conventional-ish (`feat:`, `fix:`, `refactor:`, `polish:`, `chore:`, `docs:`) — current commits follow this. Keep the subject under 72 chars and write the body in proper sentences.

## Code style

- TypeScript strict (`tsconfig.json` is the source of truth).
- Plain DOM + Signal-based reactivity, no React.
- One responsibility per file; prefer small focused modules to god classes.
- Comments explain *why*, never *what* — naming should do that.
- Web Audio scheduling: prefer the lookahead pattern over raw `setTimeout` whenever timing matters.
