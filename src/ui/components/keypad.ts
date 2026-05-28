/**
 * System Controller keypad — 0..9 numeric grid, ENTER, RECORD INTERLOCK.
 *
 * Workflow:
 *   - Type 1 or 2 digits (buffer)
 *   - ENTER loads that preset number into the synth
 *   - RECORD INTERLOCK toggles record mode; while ON, ENTER saves the
 *     currently edited preset to the typed slot number.
 *
 * The buffer auto-clears after a load/save or after 5 s of inactivity.
 */

import { presetBank } from '../../data/preset-bank';
import { saveUserPreset } from '../../data/preset-storage';
import { currentPreset, displayMessage, loadPreset, showDisplay } from '../../state/store';

export interface KeypadHandle {
  element: HTMLElement;
}

export function createKeypad(): KeypadHandle {
  const wrap = document.createElement('div');
  wrap.className = 'keypad';

  let buffer = '';
  let recordMode = false;
  let bufferTimer: number | null = null;

  function clearBuffer(): void {
    buffer = '';
    if (bufferTimer !== null) {
      window.clearTimeout(bufferTimer);
      bufferTimer = null;
    }
  }

  function pushDigit(d: string): void {
    if (buffer.length >= 2) buffer = '';
    buffer += d;
    displayMessage.set({ text: recordMode ? `REC ${buffer}` : `→ ${buffer}`, edit: null });
    if (bufferTimer !== null) window.clearTimeout(bufferTimer);
    bufferTimer = window.setTimeout(clearBuffer, 5000);
  }

  function commit(): void {
    if (!buffer) return;
    const n = parseInt(buffer, 10);
    if (Number.isNaN(n) || n < 0 || n > 99) {
      showDisplay('ERR', 1200);
      clearBuffer();
      return;
    }
    if (recordMode) {
      const draft = currentPreset.get();
      draft.number = n;
      void saveUserPreset(draft).then(() => {
        presetBank.loadOverride(draft);
        showDisplay(`STORED ${n.toString().padStart(2, '0')}`, 1400);
      });
    } else {
      const p = presetBank.get(n);
      loadPreset(p);
    }
    clearBuffer();
  }

  function setRecord(active: boolean): void {
    recordMode = active;
    recBtn.dataset.active = String(active);
    displayMessage.set({ text: active ? 'RECORD' : 'LOCK', edit: null });
  }

  const grid = document.createElement('div');
  grid.className = 'keypad-grid';
  // Layout: 1 2 3 / 4 5 6 / 7 8 9 / 0
  const order = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  for (const d of order) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'keypad-key';
    b.textContent = d;
    b.addEventListener('click', () => pushDigit(d));
    grid.appendChild(b);
  }
  wrap.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'keypad-actions';

  const enter = document.createElement('button');
  enter.type = 'button';
  enter.className = 'keypad-enter';
  enter.textContent = 'ENTER';
  enter.addEventListener('click', commit);
  actions.appendChild(enter);

  const recBtn = document.createElement('button');
  recBtn.type = 'button';
  recBtn.className = 'keypad-record';
  recBtn.innerHTML = '<span class="panel-switch-led"></span> RECORD';
  recBtn.addEventListener('click', () => setRecord(!recordMode));
  actions.appendChild(recBtn);

  wrap.appendChild(actions);

  // Bank prefix buttons (A B C D) — currently visual selectors that don't
  // change banks (we only have 100 presets), but they highlight to feel
  // alive and match the original panel.
  const banks = document.createElement('div');
  banks.className = 'keypad-banks';
  let activeBank: HTMLButtonElement | null = null;
  for (const letter of ['A', 'B', 'C', 'D']) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bank-btn';
    b.textContent = letter;
    b.addEventListener('click', () => {
      if (activeBank) activeBank.dataset.active = 'false';
      activeBank = b;
      b.dataset.active = 'true';
    });
    if (letter === 'A') {
      b.dataset.active = 'true';
      activeBank = b;
    }
    banks.appendChild(b);
  }
  wrap.appendChild(banks);

  return { element: wrap };
}
