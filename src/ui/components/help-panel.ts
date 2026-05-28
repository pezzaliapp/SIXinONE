/**
 * Help overlay — keyboard shortcuts, subtractive-synthesis primer, credits.
 * Toggled by the "?" button in the header.
 */

export function createHelpButton(): HTMLElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'help-btn';
  btn.textContent = '?';
  btn.title = 'Help & shortcuts';
  btn.addEventListener('click', () => openOverlay());
  return btn;
}

function openOverlay(): void {
  const existing = document.querySelector('.help-overlay');
  if (existing) {
    existing.remove();
    return;
  }
  const ov = document.createElement('div');
  ov.className = 'help-overlay';
  ov.innerHTML = `
    <div class="help-dialog">
      <button class="help-close" aria-label="Close">×</button>
      <h2>SIXinONE — quick reference</h2>

      <h3>Keyboard shortcuts</h3>
      <ul class="help-shortcuts">
        <li><kbd>z s x d c v g b h n j m</kbd> — lower octave (white + black)</li>
        <li><kbd>, l . ; /</kbd> — continues into the next octave</li>
        <li><kbd>q 2 w 3 e r 5 t 6 y 7 u</kbd> — upper octave</li>
        <li><kbd>i 9 o 0 p</kbd> — yet higher</li>
        <li><kbd>[</kbd> / <kbd>]</kbd> — shift anchor octave down / up</li>
      </ul>

      <h3>Knob handling</h3>
      <ul>
        <li>Drag vertically — 200 px = full sweep.</li>
        <li>Hold <kbd>Shift</kbd> while dragging — fine resolution.</li>
        <li>Double-click — reset to the preset default.</li>
        <li>Scroll wheel — step ±0.2 (±0.05 with Shift).</li>
      </ul>

      <h3>System Controller keypad</h3>
      <ul>
        <li>Type 1 or 2 digits then <kbd>ENTER</kbd> — load preset 0–99.</li>
        <li>Latch <kbd>RECORD</kbd>, type digits, <kbd>ENTER</kbd> — save current
            edit to that slot in IndexedDB. Your edit survives a reload.</li>
      </ul>

      <h3>MIDI</h3>
      <p>
        Click <strong>Enable MIDI</strong>, pick an input and output, and
        choose a channel (or Omni). Pitch bend respects the panel's
        Pitch Bend Amount knob. Program-change messages 0–99 load presets
        from the bank.
      </p>

      <h3>Sequencer</h3>
      <p>
        Pick a slot (0–9), latch <strong>REC</strong>, play notes on the
        keyboard, then press <strong>PLAY</strong>. <strong>STEP</strong>
        advances one event at a time; <strong>SYNC_EXT</strong> is the hook
        for an external MIDI clock.
      </p>

      <h3>Subtractive synthesis in 30 seconds</h3>
      <p>
        Three oscillators make a harmonically rich sound; the
        <strong>MIXER</strong> sums them with a touch of pink noise.
        The 24 dB/oct Moog ladder filter
        <strong>(VCF)</strong> carves the sound by sweeping its cutoff;
        Emphasis (resonance) can ring at the cutoff frequency. The
        <strong>filter envelope</strong> shapes how the cutoff moves over
        time (attack → bright → decay → sustain → release back to base).
        The <strong>VCA envelope</strong> shapes the loudness contour the
        same way. The <strong>LFO</strong> wiggles whatever you tell it
        to — pitch for vibrato, cutoff for wah, sample-and-hold for
        chaos.
      </p>

      <h3>Credits</h3>
      <p>
        The 1982 Memorymoog and its 100-preset bank were programmed
        with help from Wendy Carlos, Jan Hammer, Don Airey, Tom Coster,
        Larry Fast, and Herbert Deutsch. This tribute is dedicated to
        their craft. Moog, Memorymoog and the Moog logo are trademarks
        of Moog Music Inc.; this is an unofficial educational simulator
        and is not affiliated with Moog Music Inc.
      </p>
    </div>
  `;
  document.body.appendChild(ov);
  ov.querySelector('.help-close')?.addEventListener('click', () => ov.remove());
  ov.addEventListener('click', (e) => {
    if (e.target === ov) ov.remove();
  });
  const onEsc = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      ov.remove();
      window.removeEventListener('keydown', onEsc);
    }
  };
  window.addEventListener('keydown', onEsc);
}
