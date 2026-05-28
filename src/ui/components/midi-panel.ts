/**
 * Small MIDI control panel — Request, Input device, Output device,
 * Channel, Thru toggle, and a status label.
 *
 * Lives below the System Controller and pages itself when permission
 * changes / devices are hot-plugged.
 */

import type { Synth } from '../../audio/synth';
import { midiBridge, type MidiPort, type MidiStatus } from '../../midi/midi-bridge';
import {
  CC_ALL_NOTES_OFF,
  CC_MOD_WHEEL,
  CC_SUSTAIN,
} from '../../midi/messages';
import { presetBank } from '../../data/preset-bank';
import { loadPreset } from '../../state/store';
import { pitchBendSemitones } from '../../data/preset-scales';

export interface MidiPanelHandle {
  element: HTMLElement;
}

export function createMidiPanel(synth: Synth): MidiPanelHandle {
  const root = document.createElement('div');
  root.className = 'midi-panel';

  const title = document.createElement('h3');
  title.className = 'group-title';
  title.textContent = 'MIDI';
  root.appendChild(title);

  const statusEl = document.createElement('span');
  statusEl.className = 'midi-status';
  root.appendChild(statusEl);

  const requestBtn = document.createElement('button');
  requestBtn.type = 'button';
  requestBtn.className = 'panel-switch';
  requestBtn.innerHTML = '<span class="panel-switch-led"></span><span class="panel-switch-label">Enable MIDI</span>';
  root.appendChild(requestBtn);

  const inSelect = document.createElement('select');
  inSelect.className = 'midi-select';
  const outSelect = document.createElement('select');
  outSelect.className = 'midi-select';
  const channelSelect = document.createElement('select');
  channelSelect.className = 'midi-select';
  for (let c = 0; c <= 16; c++) {
    const opt = document.createElement('option');
    opt.value = String(c);
    opt.textContent = c === 0 ? 'Omni' : `Ch ${c}`;
    channelSelect.appendChild(opt);
  }
  const thruBtn = document.createElement('button');
  thruBtn.type = 'button';
  thruBtn.className = 'panel-switch sm';
  thruBtn.innerHTML = '<span class="panel-switch-led"></span><span class="panel-switch-label">Thru</span>';

  const grid = document.createElement('div');
  grid.className = 'midi-grid';
  for (const [label, el] of [
    ['IN', inSelect],
    ['OUT', outSelect],
    ['CH', channelSelect],
  ] as const) {
    const wrap = document.createElement('label');
    wrap.className = 'midi-field';
    const lab = document.createElement('span');
    lab.textContent = label;
    lab.className = 'midi-field-label';
    wrap.append(lab, el);
    grid.appendChild(wrap);
  }
  grid.appendChild(thruBtn);
  root.appendChild(grid);

  // ── Controller indicators (MOD WHEEL / SUSTAIN / PITCH BEND) ───────────
  const controllers = document.createElement('div');
  controllers.className = 'midi-controllers';
  const modBar = document.createElement('div');
  modBar.className = 'midi-meter';
  modBar.innerHTML = '<span class="midi-meter-label">MOD</span><span class="midi-meter-bar"><span class="midi-meter-fill"></span></span>';
  const bendBar = document.createElement('div');
  bendBar.className = 'midi-meter midi-meter-bipolar';
  bendBar.innerHTML = '<span class="midi-meter-label">BEND</span><span class="midi-meter-bar"><span class="midi-meter-fill"></span></span>';
  const sustainLed = document.createElement('div');
  sustainLed.className = 'midi-led';
  sustainLed.innerHTML = '<span class="midi-led-dot"></span><span class="midi-led-label">SUSTAIN</span>';
  controllers.append(modBar, bendBar, sustainLed);
  root.appendChild(controllers);

  const modFill = modBar.querySelector('.midi-meter-fill') as HTMLElement;
  const bendFill = bendBar.querySelector('.midi-meter-fill') as HTMLElement;

  synth.onControllerState(({ modWheel, sustain, bend }) => {
    modFill.style.width = `${(modWheel / 127) * 100}%`;
    // Bend is in semitones — assume up to ±12 for display; center is 50%.
    const bendPct = Math.max(-1, Math.min(1, bend / 12));
    bendFill.style.width = `${Math.abs(bendPct) * 50}%`;
    bendFill.style.marginLeft = bendPct >= 0 ? '50%' : `${50 - Math.abs(bendPct) * 50}%`;
    sustainLed.dataset.active = String(sustain);
  });

  function renderStatus(s: MidiStatus): void {
    const labels: Record<MidiStatus, string> = {
      idle: 'click to request',
      requesting: 'requesting…',
      granted: 'granted',
      denied: 'denied',
      unsupported: 'browser unsupported',
    };
    statusEl.textContent = labels[s];
    requestBtn.dataset.active = String(s === 'granted');
    const disabled = s !== 'granted';
    inSelect.disabled = disabled;
    outSelect.disabled = disabled;
    channelSelect.disabled = disabled;
    thruBtn.disabled = disabled;
  }

  function renderPorts(): void {
    const ins = midiBridge.listInputs();
    const outs = midiBridge.listOutputs();
    populateSelect(inSelect, ins, true);
    populateSelect(outSelect, outs, true);
  }

  function populateSelect(sel: HTMLSelectElement, ports: MidiPort[], allowNone: boolean): void {
    sel.innerHTML = '';
    if (allowNone) {
      const none = document.createElement('option');
      none.value = '';
      none.textContent = '— none —';
      sel.appendChild(none);
    }
    for (const p of ports) {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sel.appendChild(opt);
    }
  }

  midiBridge.onStatusChange(renderStatus);
  midiBridge.onPortsChanged(renderPorts);
  if (!midiBridge.isSupported()) {
    renderStatus('unsupported');
  }

  requestBtn.addEventListener('click', () => {
    void midiBridge.request().then((ok) => {
      if (ok) renderPorts();
    });
  });
  inSelect.addEventListener('change', () => midiBridge.selectInput(inSelect.value || null));
  outSelect.addEventListener('change', () => midiBridge.selectOutput(outSelect.value || null));
  channelSelect.addEventListener('change', () => midiBridge.setChannel(parseInt(channelSelect.value, 10)));
  thruBtn.addEventListener('click', () => {
    const next = thruBtn.dataset.active !== 'true';
    thruBtn.dataset.active = String(next);
    midiBridge.setThru(next);
  });

  // Subscribe synth to incoming MIDI.
  midiBridge.subscribe((msg) => {
    switch (msg.type) {
      case 'noteOn':
        synth.noteOn(msg.note, msg.velocity / 127);
        break;
      case 'noteOff':
        synth.noteOff(msg.note);
        break;
      case 'pitchBend': {
        const preset = synth.getPreset();
        const range = pitchBendSemitones(preset.pitchBendAmount);
        synth.setPitchBend(msg.value * range);
        break;
      }
      case 'cc':
        if (msg.controller === CC_ALL_NOTES_OFF) synth.panic();
        else if (msg.controller === CC_MOD_WHEEL) synth.setModWheel(msg.value);
        else if (msg.controller === CC_SUSTAIN) synth.setSustainPedal(msg.value >= 64);
        break;
      case 'program':
        if (msg.number < 100) loadPreset(presetBank.get(msg.number));
        break;
    }
  });

  return { element: root };
}
