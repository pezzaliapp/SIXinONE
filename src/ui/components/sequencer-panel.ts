/**
 * Sequencer mini-panel — slot selector, Rec, Play/Stop, BPM, step-count.
 * Lives below the MIDI strip.
 */

import type { Sequencer, SequencerMode, ClockSubdiv } from '../../sequencer/sequencer';
import { transportClock } from '../../sequencer/transport-clock';

export interface SequencerPanelHandle {
  element: HTMLElement;
}

export function createSequencerPanel(seq: Sequencer): SequencerPanelHandle {
  const root = document.createElement('section');
  root.className = 'sequencer-panel';

  const title = document.createElement('h3');
  title.className = 'group-title';
  title.textContent = 'Sequencer';
  root.appendChild(title);

  const slotsRow = document.createElement('div');
  slotsRow.className = 'seq-slots';
  const slotBtns: HTMLButtonElement[] = [];
  for (let i = 0; i < 10; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seq-slot';
    b.textContent = String(i);
    b.addEventListener('click', () => seq.selectSlot(i));
    slotBtns.push(b);
    slotsRow.appendChild(b);
  }
  root.appendChild(slotsRow);

  const controls = document.createElement('div');
  controls.className = 'seq-controls';

  const recBtn = document.createElement('button');
  recBtn.type = 'button';
  recBtn.className = 'panel-switch';
  recBtn.innerHTML = '<span class="panel-switch-led"></span><span class="panel-switch-label">REC</span>';
  recBtn.addEventListener('click', () => seq.setRecording(!seq.isRecording()));

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'panel-switch';
  playBtn.innerHTML = '<span class="panel-switch-led"></span><span class="panel-switch-label">PLAY</span>';
  playBtn.addEventListener('click', () => (seq.isRunning() ? seq.stop() : seq.start()));

  const stepBtn = document.createElement('button');
  stepBtn.type = 'button';
  stepBtn.className = 'panel-switch sm';
  stepBtn.innerHTML = '<span class="panel-switch-label">STEP</span>';
  stepBtn.addEventListener('click', () => seq.stepAdvance());

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'panel-switch sm';
  clearBtn.innerHTML = '<span class="panel-switch-label">CLR</span>';
  clearBtn.addEventListener('click', () => seq.clear());

  // BPM — two-way bound to the shared transport clock.
  const bpmWrap = document.createElement('label');
  bpmWrap.className = 'seq-bpm';
  bpmWrap.textContent = 'BPM ';
  const bpmInput = document.createElement('input');
  bpmInput.type = 'number';
  bpmInput.min = '30';
  bpmInput.max = '300';
  bpmInput.value = String(transportClock.getBpm());
  bpmInput.addEventListener('input', () => transportClock.setBpm(parseInt(bpmInput.value, 10) || 120));
  bpmWrap.appendChild(bpmInput);
  transportClock.subscribe({
    onBpmChange: (bpm) => {
      if (document.activeElement !== bpmInput) bpmInput.value = String(Math.round(bpm));
    },
  });

  // Mode
  const modeSelect = document.createElement('select');
  modeSelect.className = 'midi-select';
  for (const m of ['CONTINUOUS', 'STEP', 'SYNC_EXT'] as SequencerMode[]) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    modeSelect.appendChild(opt);
  }
  modeSelect.addEventListener('change', () => seq.setMode(modeSelect.value as SequencerMode));

  // External clock subdivision (only relevant in SYNC_EXT).
  const subdivSelect = document.createElement('select');
  subdivSelect.className = 'midi-select';
  for (const [val, label] of [
    [24, '1/4'],
    [12, '1/8'],
    [6, '1/16'],
    [3, '1/32'],
  ] as const) {
    const opt = document.createElement('option');
    opt.value = String(val);
    opt.textContent = label;
    if (val === seq.getClockSubdiv()) opt.selected = true;
    subdivSelect.appendChild(opt);
  }
  subdivSelect.addEventListener('change', () =>
    seq.setClockSubdiv(parseInt(subdivSelect.value, 10) as ClockSubdiv),
  );

  const stepCount = document.createElement('span');
  stepCount.className = 'seq-count';

  controls.append(recBtn, playBtn, stepBtn, clearBtn, modeSelect, subdivSelect, bpmWrap, stepCount);
  root.appendChild(controls);

  function render(): void {
    for (const [i, b] of slotBtns.entries()) {
      b.dataset.active = String(i === seq.getSlot());
    }
    recBtn.dataset.active = String(seq.isRecording());
    playBtn.dataset.active = String(seq.isRunning());
    modeSelect.value = seq.getMode();
    stepCount.textContent = `${seq.getCurrentSequence().steps.length} steps`;
  }

  seq.on(render);
  render();

  return { element: root };
}
