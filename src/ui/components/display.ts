/**
 * Two displays from the System Controller:
 *   - PROGRAM 7-seg LED (2 digits, red/orange)
 *   - ALPHANUMERIC vintage 12-char LCD with subtle CRT glow
 *
 * Both subscribe to store signals and re-render on change.
 */

import type { DisplayState } from '../../state/store';
import { currentPreset, displayMessage } from '../../state/store';

export function createProgramDisplay(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'program-display';
  const text = document.createElement('span');
  text.className = 'program-digits';
  text.textContent = '00';
  root.appendChild(text);

  currentPreset.subscribe(
    (p) => {
      text.textContent = p.number.toString().padStart(2, '0');
    },
    true,
  );
  return root;
}

export function createAlphanumericDisplay(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'alpha-display';
  const text = document.createElement('span');
  text.className = 'alpha-text';
  root.appendChild(text);

  function render(state: DisplayState): void {
    if (state.edit) {
      text.innerHTML = `<span class="edit-from">${escape(state.edit.from)}</span>` +
        ` &raquo; ` +
        `<span class="edit-to">${escape(state.edit.to)}</span>`;
    } else {
      text.textContent = state.text;
    }
  }

  displayMessage.subscribe(render, true);
  return root;
}

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}
