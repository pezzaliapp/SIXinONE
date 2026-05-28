# Demo Player

## How it works

A demo is a list of typed `DemoEvent`s, each carrying a `time` in seconds from the start. The player runs a `requestAnimationFrame` loop and, on every frame, drains every event whose `time` is ≤ `AudioContext.currentTime - startedAt`. Audio events go through the synth's existing public API; param events mutate the shared preset signal so the on-panel knobs reactively redraw at the same instant the audio change becomes audible.

```
demo.events.sort(by time)
                  │
                  ▼
DemoPlayer.tick() ──fires──> Synth.noteOn / noteOff       (voice allocator)
                            ──fires──> mutate('filter.cutoff', v)   (Signal → panel)
                            ──fires──> loadPreset(bank[n])  (preset change)
                            ──fires──> setPitchBend / setModWheel
```

The player owns no audio nodes of its own. That keeps the demo format trivial and means every audible thing in a demo is *also* something a user can do live on the panel.

## Event shape

See [`src/data/demos.ts`](../src/data/demos.ts) for the full TypeScript:

```typescript
interface DemoEvent {
  time: number;       // seconds from the start of the demo
  type: 'noteOn' | 'noteOff' | 'param' | 'preset' | 'pitchBend' | 'modWheel';

  note?: number;      // MIDI 0..127 (for noteOn / noteOff)
  velocity?: number;  // 0..1

  target?: string;    // dotted path: 'filter.cutoff', 'osc2.coarse', 'fx.delay.mix'
  value?: number;     // in the same units the panel knob uses
  ramp?: 'linear' | 'exp' | 'step';

  presetNumber?: number; // 0..99 (for preset)
  bendSemitones?: number;
  modWheelValue?: number; // 0..127
}
```

A `Demo` packages those events with metadata:

```typescript
interface Demo {
  id: string;
  title: string;
  description: string;
  category: 'style' | 'classical' | 'technical';
  defaultPreset: number;
  durationSec: number;
  bpm: number;
  events: DemoEvent[];
  credits?: string;
  isLong?: boolean;
}
```

## Adding a new demo

1. Create a file under `src/data/demos/` exporting one `Demo`.
2. Use the helpers in `src/data/demos/_helpers.ts`:
   - `note(events, t, midi, durationSec, velocity?)` — schedules a paired noteOn + noteOff.
   - `chord(events, t, [n1, n2, n3], durationSec, velocity?)` — convenience for stacks.
   - `ramp(events, target, t0, t1, v0, v1, stepsPerSec?)` — emits a series of `param` events that linearly sweep `target` between `v0` and `v1`. Lots of small steps so the on-screen knob animates smoothly.
3. **Sort the events by time at the end** (`events.sort((a, b) => a.time - b.time)`) — the player assumes monotonic time.
4. Import the new demo into `src/data/demos.ts` and add it to the `DEMOS` array.
5. The DEMOS panel UI auto-discovers it. For a "▶ DEMO" affordance to appear when the demo's `defaultPreset` is loaded, no extra wiring is needed.

## Legal: what is and isn't OK to ship

**OK to ship:**

- Original compositions, freshly written, that *sit in the mood* of a style or era.
- Public-domain scores. As of 2026, anything by composers who died before 1956 is in the public domain in most jurisdictions (`life + 70` rule). Bach († 1750), Mozart († 1791), Beethoven († 1827), Pachelbel († 1706), Brahms († 1897), Tchaikovsky († 1893), Mussorgsky († 1881), Schubert († 1828), Schumann († 1856).

**Not OK to ship:**

- Recognizable melodies from 20th-century copyrighted songs.
- "In the style of [Artist X]" demos that lift Artist X's hooks, chord progressions, or characteristic riffs note-for-note.
- Any score by composers still in copyright (most 20th-century classical composers).

When in doubt, change enough of the melodic shape that a listener can tell it's *not* the original. The point of an in-style demo is to demonstrate a *patch*, not to test the boundaries of fair use.

## Testing demos

The test suite in [`tests/demo-player.test.ts`](../tests/demo-player.test.ts) enforces some invariants that every new demo must satisfy:

- `durationSec > 0`.
- All `defaultPreset` and `presetNumber` values in `[0, 99]`.
- Events sorted ascending by `time`.
- Every event's `time` ≤ `durationSec + 0.1`.
- Balanced `noteOn` / `noteOff` (no leaked voices when the demo ends).
- Unique demo `id`.
- Style demos credit "original" in their `credits` line; classical demos credit "public domain".

Run `npm test` to verify. If you intentionally need to break one of these, update the test to spell out the new contract.
