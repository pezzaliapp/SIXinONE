import { TEST_PRESETS } from '../data/test-presets';
import { Synth } from '../audio/synth';

/**
 * Step 3 boot — minimal UI that lets you audition the test presets through
 * the basic Web Audio voice graph. The real panel layout is wired in Step 5.
 */

const CHORD_NOTES = [60, 64, 67, 72]; // C4 E4 G4 C5

let synth: Synth | null = null;

function ensureSynth(): Synth {
  if (synth) return synth;
  const initial = TEST_PRESETS[0];
  if (!initial) throw new Error('No test presets defined');
  synth = new Synth(initial);
  return synth;
}

async function playPresetDemo(presetIdx: number): Promise<void> {
  const s = ensureSynth();
  await s.start();
  const preset = TEST_PRESETS[presetIdx];
  if (!preset) return;
  s.setPreset(preset);
  for (let i = 0; i < CHORD_NOTES.length; i++) {
    const note = CHORD_NOTES[i]!;
    setTimeout(() => s.noteOn(note, 0.9), i * 90);
  }
  setTimeout(() => {
    for (const n of CHORD_NOTES) s.noteOff(n);
  }, 2200);
}

export function bootApp(root: HTMLElement): void {
  root.innerHTML = `
    <main class="boot">
      <h1>SIXinONE</h1>
      <p class="tagline">A Tribute to the Moog Memorymoog (1982)</p>
      <p class="muted">Audio engine bring-up — Step 3. Click a preset to audition.</p>
      <div class="preset-grid" id="preset-grid"></div>
      <p class="muted small">
        Full 61-key panel + 100 presets arrive in later steps.
      </p>
    </main>
  `;

  const grid = root.querySelector<HTMLDivElement>('#preset-grid');
  if (!grid) return;
  TEST_PRESETS.forEach((preset, idx) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = `${preset.number.toString().padStart(2, '0')} ${preset.name}`;
    btn.addEventListener('click', () => {
      void playPresetDemo(idx);
    });
    grid.appendChild(btn);
  });
}
