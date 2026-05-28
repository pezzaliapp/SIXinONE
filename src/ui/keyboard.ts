/**
 * 61-key virtual keyboard (C2 → C7 = MIDI 36..96).
 *
 * - Pointer-based: down / drag = legato, up = release.
 * - Computer keyboard map (standard "soft-keyboard" layout):
 *     lower row  z s x d c v g b h n j m   = C..B  (octave 4 by default)
 *     upper row  q 2 w 3 e r 5 t 6 y 7 u   = C..B  (octave 5 by default)
 *     i ↑ ... etc.   octave shift: [ / ]
 * - Octave shift buttons (±1) above the keyboard match the Memorymoog's
 *   LEFT-HAND CONTROLLERS section.
 * - Voice-activity LEDs (6 dots) mirror the allocator state.
 */

import type { Synth } from '../audio/synth';
import { MM_HIGHEST_KEY, MM_LOWEST_KEY, midiNoteName } from '../audio/midi-utils';
import { voiceActivity } from '../state/store';

const BLACK_INDEXES = new Set([1, 3, 6, 8, 10]);

interface KeyAccess {
  setActive(active: boolean): void;
  midi: number;
}

// Computer-keyboard → MIDI offset (relative to the keyboard's "anchor C").
// Anchor defaults to C4 (MIDI 60); octave buttons shift the anchor.
const KEY_OFFSETS: Record<string, number> = {
  // Lower row (anchor octave)
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  ',': 12, l: 13, '.': 14, ';': 15, '/': 16,
  // Upper row (anchor + 1 octave)
  q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19, '6': 20, y: 21,
  '7': 22, u: 23, i: 24, '9': 25, o: 26, '0': 27, p: 28,
};

export interface KeyboardHandle {
  element: HTMLElement;
  destroy(): void;
}

export function createKeyboard(synth: Synth): KeyboardHandle {
  const wrap = document.createElement('section');
  wrap.className = 'keyboard-section';

  const controls = document.createElement('div');
  controls.className = 'keyboard-controls';

  // Voice activity LEDs (6)
  const ledStrip = document.createElement('div');
  ledStrip.className = 'voice-leds';
  const leds: HTMLSpanElement[] = [];
  for (let i = 0; i < 6; i++) {
    const led = document.createElement('span');
    led.className = 'voice-led';
    led.title = `Voice ${i + 1}`;
    leds.push(led);
    ledStrip.appendChild(led);
  }

  // Octave shift
  let anchor = 60; // MIDI C4
  const anchorLabel = document.createElement('span');
  anchorLabel.className = 'anchor-label';
  const updateAnchor = (): void => {
    anchorLabel.textContent = `Anchor: ${midiNoteName(anchor)}`;
  };
  updateAnchor();

  const octDown = document.createElement('button');
  octDown.type = 'button';
  octDown.className = 'panel-switch sm';
  octDown.innerHTML = '<span class="panel-switch-label">Oct −</span>';
  octDown.addEventListener('click', () => {
    anchor = Math.max(MM_LOWEST_KEY, anchor - 12);
    updateAnchor();
  });

  const octUp = document.createElement('button');
  octUp.type = 'button';
  octUp.className = 'panel-switch sm';
  octUp.innerHTML = '<span class="panel-switch-label">Oct +</span>';
  octUp.addEventListener('click', () => {
    anchor = Math.min(MM_HIGHEST_KEY - 12, anchor + 12);
    updateAnchor();
  });

  controls.append(ledStrip, octDown, octUp, anchorLabel);
  wrap.appendChild(controls);

  // Keyboard
  const kb = document.createElement('div');
  kb.className = 'keyboard';
  kb.setAttribute('role', 'application');
  kb.setAttribute('aria-label', 'Virtual keyboard');

  const keyByMidi = new Map<number, KeyAccess>();
  const activeNotes = new Set<number>();

  // Compute layout: we render white keys as a flex row and absolutely
  // position blacks above them.
  const whiteRow = document.createElement('div');
  whiteRow.className = 'kb-white-row';

  const whiteKeys: HTMLElement[] = [];
  const blackKeys: HTMLElement[] = [];

  for (let midi = MM_LOWEST_KEY; midi <= MM_HIGHEST_KEY; midi++) {
    const pc = midi % 12;
    if (!BLACK_INDEXES.has(pc)) {
      const w = document.createElement('button');
      w.type = 'button';
      w.className = 'kb-key white';
      w.dataset.midi = String(midi);
      const label = document.createElement('span');
      label.className = 'kb-label';
      // Only label C-notes
      if (pc === 0) label.textContent = midiNoteName(midi);
      w.appendChild(label);
      whiteRow.appendChild(w);
      whiteKeys.push(w);
      keyByMidi.set(midi, {
        midi,
        setActive(active) {
          w.dataset.active = String(active);
        },
      });
    }
  }

  kb.appendChild(whiteRow);

  // Build a second pass for black keys, positioned relatively to white keys.
  const blackLayer = document.createElement('div');
  blackLayer.className = 'kb-black-layer';

  let whiteIdx = 0;
  for (let midi = MM_LOWEST_KEY; midi <= MM_HIGHEST_KEY; midi++) {
    const pc = midi % 12;
    if (BLACK_INDEXES.has(pc)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kb-key black';
      b.dataset.midi = String(midi);
      // Position: between whiteIdx-1 and whiteIdx (whiteIdx is the next white we'd render)
      b.style.left = `calc((${whiteIdx} / ${whiteKeys.length}) * 100% - 0.55%)`;
      blackLayer.appendChild(b);
      blackKeys.push(b);
      keyByMidi.set(midi, {
        midi,
        setActive(active) {
          b.dataset.active = String(active);
        },
      });
    } else {
      whiteIdx++;
    }
  }

  kb.appendChild(blackLayer);
  wrap.appendChild(kb);

  // --- Pointer interaction ---
  let pointerDown = false;
  let lastNote: number | null = null;

  function noteOn(midi: number): void {
    if (activeNotes.has(midi)) return;
    activeNotes.add(midi);
    synth.noteOn(midi);
    keyByMidi.get(midi)?.setActive(true);
    voiceActivity.set(synth.voiceActivity());
  }

  function noteOff(midi: number): void {
    if (!activeNotes.has(midi)) return;
    activeNotes.delete(midi);
    synth.noteOff(midi);
    keyByMidi.get(midi)?.setActive(false);
    voiceActivity.set(synth.voiceActivity());
  }

  function noteFromEvent(target: EventTarget | null): number | null {
    if (!(target instanceof HTMLElement)) return null;
    const v = target.dataset.midi;
    return v ? parseInt(v, 10) : null;
  }

  kb.addEventListener('pointerdown', (e) => {
    const m = noteFromEvent(e.target);
    if (m === null) return;
    void synth.start();
    pointerDown = true;
    lastNote = m;
    noteOn(m);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  kb.addEventListener('pointerover', (e) => {
    if (!pointerDown) return;
    const m = noteFromEvent(e.target);
    if (m === null || m === lastNote) return;
    if (lastNote !== null) noteOff(lastNote);
    lastNote = m;
    noteOn(m);
  });

  function endStroke(): void {
    pointerDown = false;
    if (lastNote !== null) {
      noteOff(lastNote);
      lastNote = null;
    }
  }

  kb.addEventListener('pointerup', endStroke);
  kb.addEventListener('pointercancel', endStroke);
  kb.addEventListener('pointerleave', () => {
    if (!pointerDown) return;
    // keep the note while crossing keys; only release on pointer up
  });

  // --- Computer keyboard ---
  const heldKeys = new Set<string>();
  function midiForKey(key: string): number | null {
    const k = key.toLowerCase();
    const offset = KEY_OFFSETS[k];
    if (offset === undefined) return null;
    const midi = anchor + offset;
    if (midi < MM_LOWEST_KEY || midi > MM_HIGHEST_KEY) return null;
    return midi;
  }
  function onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '[') {
      anchor = Math.max(MM_LOWEST_KEY, anchor - 12);
      updateAnchor();
      return;
    }
    if (e.key === ']') {
      anchor = Math.min(MM_HIGHEST_KEY - 12, anchor + 12);
      updateAnchor();
      return;
    }
    if (heldKeys.has(e.key)) return;
    const midi = midiForKey(e.key);
    if (midi === null) return;
    heldKeys.add(e.key);
    void synth.start();
    noteOn(midi);
  }
  function onKeyUp(e: KeyboardEvent): void {
    if (!heldKeys.has(e.key)) return;
    heldKeys.delete(e.key);
    const midi = midiForKey(e.key);
    if (midi !== null) noteOff(midi);
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Voice activity subscription
  const unsubscribe = voiceActivity.subscribe(
    (active) => {
      for (let i = 0; i < leds.length; i++) {
        const ledEl = leds[i];
        if (!ledEl) continue;
        ledEl.dataset.active = String(active[i] ?? false);
      }
    },
    true,
  );

  return {
    element: wrap,
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      unsubscribe();
    },
  };
}
