import { TEST_PRESETS } from '../data/test-presets';
import { Synth } from '../audio/synth';
import { presetBank } from '../data/preset-bank';
import { loadAllUserPresets } from '../data/preset-storage';
import { createPanel } from './panel';
import { createKeyboard } from './keyboard';
import { createMidiPanel } from './components/midi-panel';
import { createSequencerPanel } from './components/sequencer-panel';
import { Sequencer } from '../sequencer/sequencer';
import { createHelpButton } from './components/help-panel';
import { currentPreset, loadPreset } from '../state/store';

let synth: Synth | null = null;

function ensureSynth(): Synth {
  if (synth) return synth;
  synth = new Synth(currentPreset.get());
  // Keep the synth in sync with the editable preset.
  currentPreset.subscribe((p) => synth?.setPreset(p));
  return synth;
}

async function previewChord(): Promise<void> {
  const s = ensureSynth();
  await s.start();
  const chord = [60, 64, 67, 72];
  for (let i = 0; i < chord.length; i++) {
    const n = chord[i]!;
    window.setTimeout(() => s.noteOn(n, 0.9), i * 80);
  }
  window.setTimeout(() => {
    for (const n of chord) s.noteOff(n);
  }, 2000);
}

function bindKeyboard(shell: HTMLElement): void {
  const s = ensureSynth();
  const kb = createKeyboard(s);
  shell.appendChild(kb.element);
}

function bindMidi(shell: HTMLElement): void {
  const s = ensureSynth();
  const panel = createMidiPanel(s);
  shell.appendChild(panel.element);
}

let sequencer: Sequencer | null = null;
function bindSequencer(shell: HTMLElement): void {
  const s = ensureSynth();
  sequencer = new Sequencer(s);
  shell.appendChild(createSequencerPanel(sequencer).element);
}

export function bootApp(root: HTMLElement): void {
  root.innerHTML = '';

  // Pull any user-saved presets from IndexedDB so they shadow the factory bank.
  void loadAllUserPresets().then((rows) => {
    presetBank.loadOverrides(rows);
  });
  const shell = document.createElement('div');
  shell.className = 'app-shell';

  const header = document.createElement('header');
  header.className = 'app-header';
  header.innerHTML = `
    <div class="brand">
      <span class="brand-mark">6</span>
      <h1 class="brand-text">SIXinONE</h1>
      <span class="brand-sub">A Tribute to the Moog Memorymoog</span>
    </div>
  `;
  const brand = header.querySelector('.brand');
  if (brand) brand.appendChild(createHelpButton());

  const presetBar = document.createElement('nav');
  presetBar.className = 'preset-bar';
  for (const p of TEST_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-tile';
    btn.textContent = `${p.number.toString().padStart(2, '0')} ${p.name}`;
    btn.addEventListener('click', () => {
      loadPreset(p);
      void previewChord();
    });
    presetBar.appendChild(btn);
  }
  header.appendChild(presetBar);

  shell.appendChild(header);
  shell.appendChild(createPanel());
  bindKeyboard(shell);
  bindMidi(shell);
  bindSequencer(shell);

  const footer = document.createElement('footer');
  footer.className = 'app-footer';
  footer.innerHTML = `
    <p>Unofficial educational simulator. Moog, Memorymoog and the Moog logo are trademarks of Moog Music Inc.</p>
    <p class="hint">
      Click a preset tile to load + preview. Drag a knob (Shift = fine, double-click = reset).
      Play with mouse on the keys or use your computer keyboard
      (lower row: z s x d c v g b h n j m — upper row: q 2 w 3 e r 5 t 6 y 7 u — octave shift: [ ])
    </p>
  `;
  shell.appendChild(footer);

  root.appendChild(shell);
}
