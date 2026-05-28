/**
 * Cassette I/O — the back-panel placeholder turned into a working
 * mass-storage interface. Inspired by the Memorymoog Plus tape jack:
 *
 *   REC   — exports the current 100-slot bank as a `.mm-bank` file
 *   PLAY  — opens a file picker; loads a `.mm-bank` with a confirmation
 *   STOP  — cancels an animation in flight
 *   EJECT — clears the current overrides (factory reset of the user bank)
 *
 * Loading: a fake "spinning reels" animation runs for ~2.5 s while we
 * decode, then the alphanumeric display reports "100 LOADED" or "BAD TAPE"
 * (matching the original instrument's tape error message).
 *
 * History: the last 3 imports/exports are persisted to IndexedDB so the
 * user can undo a load that overwrote work.
 */

import { presetBank } from '../../data/preset-bank';
import {
  deleteUserPreset,
  loadAllUserPresets,
  saveUserPreset,
} from '../../data/preset-storage';
import {
  BadTapeError,
  deserializeMmBank,
  diffPresets,
  serializeMmBank,
} from '../../data/mm-bank';
import type { Preset } from '../../data/preset';
import { saveBankHistory, loadBankHistory, type BankHistoryEntry } from '../../data/bank-history';

export interface CassetteHandle {
  element: HTMLElement;
}

function setReels(svg: SVGElement, spinning: boolean): void {
  const reels = svg.querySelectorAll<SVGGElement>('.cassette-reel');
  for (const r of reels) {
    if (spinning) r.classList.add('spinning');
    else r.classList.remove('spinning');
  }
}

function announce(display: HTMLElement, text: string, holdMs = 2500): void {
  display.textContent = text;
  if (holdMs > 0) {
    window.setTimeout(() => {
      if (display.textContent === text) display.textContent = 'READY';
    }, holdMs);
  }
}

async function gatherAllPresets(): Promise<Preset[]> {
  // Pull all 100 effective presets (user-overrides shadow factory entries).
  const out: Preset[] = [];
  for (let n = 0; n < 100; n++) out.push(presetBank.get(n));
  return out;
}

async function applyBank(presets: Preset[], mode: 'replace' | 'merge'): Promise<number> {
  if (mode === 'merge') {
    const current = await gatherAllPresets();
    const diff = diffPresets(current, presets);
    for (const p of diff) await saveUserPreset(p);
    const overrides = await loadAllUserPresets();
    presetBank.loadOverrides(overrides);
    return diff.length;
  }
  // Replace: nuke existing overrides for the slots in the incoming bank.
  for (const p of presets) {
    await deleteUserPreset(p.number);
    await saveUserPreset(p);
  }
  const overrides = await loadAllUserPresets();
  presetBank.loadOverrides(overrides);
  return presets.length;
}

export function createCassette(): CassetteHandle {
  const root = document.createElement('section');
  root.className = 'cassette-rack';
  root.innerHTML = `
    <h3 class="group-title">Cassette I/O</h3>
    <div class="cassette-body">
      <svg class="cassette-svg" viewBox="0 0 280 170" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="268" height="158" rx="8" fill="#19140e" stroke="#3a3128" />
        <rect x="22" y="22" width="236" height="64" rx="3" fill="#f4ead0" stroke="#3a3128" />
        <text x="140" y="58" text-anchor="middle" font-family="monospace" font-size="14" fill="#3a3128">MM PRESETS</text>
        <g class="cassette-reel" transform="translate(80,128)">
          <circle r="22" fill="#0a0907" stroke="#3a3128" />
          <g class="cassette-spokes" stroke="#3a3128" stroke-width="2">
            <line x1="-16" y1="0" x2="16" y2="0" />
            <line x1="0" y1="-16" x2="0" y2="16" />
            <line x1="-12" y1="-12" x2="12" y2="12" />
            <line x1="-12" y1="12" x2="12" y2="-12" />
          </g>
        </g>
        <g class="cassette-reel" transform="translate(200,128)">
          <circle r="22" fill="#0a0907" stroke="#3a3128" />
          <g class="cassette-spokes" stroke="#3a3128" stroke-width="2">
            <line x1="-16" y1="0" x2="16" y2="0" />
            <line x1="0" y1="-16" x2="0" y2="16" />
            <line x1="-12" y1="-12" x2="12" y2="12" />
            <line x1="-12" y1="12" x2="12" y2="-12" />
          </g>
        </g>
      </svg>
      <div class="cassette-side">
        <div class="cassette-display">READY</div>
        <div class="cassette-buttons">
          <button type="button" class="panel-switch sm cassette-rec"><span class="panel-switch-led"></span><span class="panel-switch-label">REC</span></button>
          <button type="button" class="panel-switch sm cassette-play"><span class="panel-switch-led"></span><span class="panel-switch-label">PLAY</span></button>
          <button type="button" class="panel-switch sm cassette-stop"><span class="panel-switch-label">STOP</span></button>
          <button type="button" class="panel-switch sm cassette-eject"><span class="panel-switch-label">EJECT</span></button>
        </div>
        <label class="cassette-merge">
          <input type="checkbox" class="cassette-merge-input" /> Merge (only changed presets)
        </label>
        <div class="cassette-history"></div>
      </div>
    </div>
  `;

  const svg = root.querySelector('.cassette-svg') as SVGElement;
  const display = root.querySelector('.cassette-display') as HTMLElement;
  const recBtn = root.querySelector('.cassette-rec') as HTMLButtonElement;
  const playBtn = root.querySelector('.cassette-play') as HTMLButtonElement;
  const stopBtn = root.querySelector('.cassette-stop') as HTMLButtonElement;
  const ejectBtn = root.querySelector('.cassette-eject') as HTMLButtonElement;
  const mergeChk = root.querySelector('.cassette-merge-input') as HTMLInputElement;
  const historyEl = root.querySelector('.cassette-history') as HTMLElement;

  let busyTimer: number | null = null;
  const stopAnim = (): void => {
    setReels(svg, false);
    if (busyTimer !== null) {
      window.clearTimeout(busyTimer);
      busyTimer = null;
    }
  };

  const refreshHistory = async (): Promise<void> => {
    const rows = await loadBankHistory();
    historyEl.innerHTML = '';
    if (rows.length === 0) {
      historyEl.textContent = 'No tape history yet.';
      return;
    }
    for (const r of rows) {
      const item = document.createElement('div');
      item.className = 'cassette-history-item';
      item.textContent = `${r.kind === 'import' ? 'LOAD' : 'SAVE'} · ${new Date(r.at).toLocaleString()} · ${r.count} presets`;
      historyEl.appendChild(item);
    }
  };

  // ── REC: export bank ─────────────────────────────────────────────────
  recBtn.addEventListener('click', async () => {
    display.textContent = 'SAVING';
    setReels(svg, true);
    try {
      const presets = await gatherAllPresets();
      const text = await serializeMmBank(presets);
      const blob = new Blob([text], { type: 'application/octet-stream' });
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sixinone-presets-${date}.mm-bank`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      await saveBankHistory({ kind: 'export', at: Date.now(), count: presets.length });
      await refreshHistory();
      announce(display, `${presets.length} SAVED`);
    } catch (err) {
      console.warn('Cassette save failed', err);
      announce(display, 'WRITE FAIL');
    } finally {
      stopAnim();
    }
  });

  // ── PLAY: import bank ────────────────────────────────────────────────
  playBtn.addEventListener('click', () => {
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.mm-bank,application/octet-stream,text/plain';
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      const mode: 'replace' | 'merge' = mergeChk.checked ? 'merge' : 'replace';
      if (mode === 'replace') {
        const ok = window.confirm(
          'This will replace your current presets. Continue?\n(Tip: enable "Merge" to only load presets that differ.)',
        );
        if (!ok) return;
      }
      display.textContent = 'LOADING';
      setReels(svg, true);
      // Spin animation for ~2.5 s, mirroring the cassette's loading time,
      // then run the actual decode.
      busyTimer = window.setTimeout(async () => {
        try {
          const text = await f.text();
          const bank = await deserializeMmBank(text);
          const applied = await applyBank(bank.presets, mode);
          await saveBankHistory({ kind: 'import', at: Date.now(), count: applied });
          await refreshHistory();
          announce(display, `${applied} LOADED`);
        } catch (err) {
          if (err instanceof BadTapeError) {
            console.warn('Bad tape', err.message);
            announce(display, 'BAD TAPE');
          } else {
            console.warn('Cassette load failed', err);
            announce(display, 'READ FAIL');
          }
        } finally {
          stopAnim();
        }
      }, 2200);
    });
    file.click();
  });

  // ── STOP: cancel animation / debounce ────────────────────────────────
  stopBtn.addEventListener('click', () => {
    stopAnim();
    announce(display, 'STOPPED', 1000);
  });

  // ── EJECT: clear user overrides ──────────────────────────────────────
  ejectBtn.addEventListener('click', async () => {
    const ok = window.confirm('Eject — drop all your user-modified presets and revert to factory bank?');
    if (!ok) return;
    display.textContent = 'EJECT';
    setReels(svg, true);
    try {
      for (let n = 0; n < 100; n++) await deleteUserPreset(n);
      const overrides = await loadAllUserPresets();
      presetBank.loadOverrides(overrides);
      announce(display, 'FACTORY');
    } finally {
      stopAnim();
    }
  });

  void refreshHistory();

  return { element: root };
}

export type { BankHistoryEntry };
