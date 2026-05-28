/**
 * FX RACK — three modules (CHORUS, PLATE REVERB, TAPE DELAY) stacked on a
 * single rack panel. Each module has a bypass LED, an enable toggle, and
 * a small grid of knobs in 0..10 panel units mapped to the underlying
 * engine ranges.
 *
 * State binding:
 *   - The rack reads the current FX state from synth.getFxState().
 *   - On any control change it pushes the full FxBusState back via
 *     synth.setFxState(); the synth then mirrors it into the preset so the
 *     value follows the program.
 *
 * Visual model: a thin horizontal "rack" you can scroll through, with each
 * module styled to match the rest of the panel.
 */

import type { Synth } from '../../audio/synth';
import { createKnob, type KnobHandle } from './knob';
import type { FxBusState } from '../../audio/fx/fx-bus';

export interface FxRackHandle {
  element: HTMLElement;
}

function knobRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'fx-knob-row';
  return row;
}

export function createFxRack(synth: Synth): FxRackHandle {
  const root = document.createElement('div');
  root.className = 'fx-rack';

  const title = document.createElement('h3');
  title.className = 'group-title';
  title.textContent = 'FX Rack';
  root.appendChild(title);

  // Knob handles, retained so we can refresh from outside (e.g. preset load).
  const handles: KnobHandle[] = [];

  // -- helpers -----------------------------------------------------------
  const getState = (): FxBusState =>
    synth.getFxState() ?? {
      chorus: { enabled: false, rate: 0.6, depth: 0.5, feedback: 0.2, mix: 0.4 },
      reverb: { enabled: false, size: 1, damping: 0.5, mix: 0.3 },
      delay: {
        enabled: false,
        time: 0.35,
        feedback: 0.35,
        tone: 4000,
        mix: 0.25,
        pingPong: false,
        syncBpm: false,
      },
    };

  const push = (mutator: (s: FxBusState) => void): void => {
    const s = getState();
    mutator(s);
    synth.setFxState(s);
  };

  const moduleEl = (name: string, slug: string): { wrap: HTMLElement; led: HTMLElement; body: HTMLElement } => {
    const wrap = document.createElement('div');
    wrap.className = `fx-module fx-${slug}`;
    const head = document.createElement('div');
    head.className = 'fx-head';
    const led = document.createElement('button');
    led.type = 'button';
    led.className = 'fx-led';
    led.title = `Toggle ${name}`;
    head.appendChild(led);
    const tag = document.createElement('span');
    tag.className = 'fx-name';
    tag.textContent = name;
    head.appendChild(tag);
    wrap.appendChild(head);
    const body = document.createElement('div');
    body.className = 'fx-body';
    wrap.appendChild(body);
    return { wrap, led, body };
  };

  // -- CHORUS ------------------------------------------------------------
  const chorus = moduleEl('Chorus', 'chorus');
  const chorusRow = knobRow();
  // Engine ranges:
  //   rate     0.1..10 Hz
  //   depth    0..1
  //   feedback 0..0.5
  //   mix      0..1
  const cRate = createKnob({
    label: 'Rate',
    value: getState().chorus.rate * 1, // panel 0..10 → 0.1..10 Hz via expMap not used here for simplicity
    min: 0.1,
    max: 10,
    size: 44,
    onChange: (v) => push((s) => (s.chorus.rate = v)),
  });
  const cDepth = createKnob({
    label: 'Depth',
    value: getState().chorus.depth * 10,
    min: 0,
    max: 10,
    size: 44,
    onChange: (v) => push((s) => (s.chorus.depth = v / 10)),
  });
  const cFb = createKnob({
    label: 'Fbk',
    value: getState().chorus.feedback * 20,
    min: 0,
    max: 10,
    size: 44,
    onChange: (v) => push((s) => (s.chorus.feedback = v / 20)),
  });
  const cMix = createKnob({
    label: 'Mix',
    value: getState().chorus.mix * 10,
    min: 0,
    max: 10,
    size: 44,
    onChange: (v) => push((s) => (s.chorus.mix = v / 10)),
  });
  chorusRow.append(cRate.element, cDepth.element, cFb.element, cMix.element);
  chorus.body.appendChild(chorusRow);
  handles.push(cRate, cDepth, cFb, cMix);

  // -- REVERB ------------------------------------------------------------
  const reverb = moduleEl('Plate Reverb', 'reverb');
  const reverbRow = knobRow();
  const rSize = createKnob({
    label: 'Size',
    value: getState().reverb.size,
    min: 0,
    max: 2,
    step: 1,
    size: 44,
    onChange: (v) => push((s) => (s.reverb.size = Math.round(v) as 0 | 1 | 2)),
  });
  const rDamp = createKnob({
    label: 'Damp',
    value: getState().reverb.damping * 10,
    min: 0,
    max: 10,
    size: 44,
    onChange: (v) => push((s) => (s.reverb.damping = v / 10)),
  });
  const rMix = createKnob({
    label: 'Mix',
    value: getState().reverb.mix * 10,
    min: 0,
    max: 10,
    size: 44,
    onChange: (v) => push((s) => (s.reverb.mix = v / 10)),
  });
  reverbRow.append(rSize.element, rDamp.element, rMix.element);
  reverb.body.appendChild(reverbRow);
  handles.push(rSize, rDamp, rMix);

  // -- DELAY -------------------------------------------------------------
  const delay = moduleEl('Tape Delay', 'delay');
  const delayRow = knobRow();
  const dTime = createKnob({
    label: 'Time',
    value: getState().delay.time * 10,
    min: 0.5,
    max: 15,
    size: 44,
    onChange: (v) => push((s) => (s.delay.time = v / 10)),
  });
  const dFb = createKnob({
    label: 'Fbk',
    value: getState().delay.feedback * 10,
    min: 0,
    max: 9.5,
    size: 44,
    onChange: (v) => push((s) => (s.delay.feedback = v / 10)),
  });
  const dTone = createKnob({
    label: 'Tone',
    value: (getState().delay.tone / 1000),
    min: 0.8,
    max: 12,
    size: 44,
    onChange: (v) => push((s) => (s.delay.tone = v * 1000)),
  });
  const dMix = createKnob({
    label: 'Mix',
    value: getState().delay.mix * 10,
    min: 0,
    max: 10,
    size: 44,
    onChange: (v) => push((s) => (s.delay.mix = v / 10)),
  });
  const dPing = document.createElement('button');
  dPing.type = 'button';
  dPing.className = 'panel-switch sm fx-ping';
  dPing.innerHTML = '<span class="panel-switch-led"></span><span class="panel-switch-label">Ping</span>';
  dPing.dataset.active = String(getState().delay.pingPong);
  dPing.addEventListener('click', () => {
    const next = dPing.dataset.active !== 'true';
    dPing.dataset.active = String(next);
    push((s) => (s.delay.pingPong = next));
  });
  delayRow.append(dTime.element, dFb.element, dTone.element, dMix.element, dPing);
  delay.body.appendChild(delayRow);
  handles.push(dTime, dFb, dTone, dMix);

  // -- bypass LEDs -------------------------------------------------------
  const wireLed = (led: HTMLElement, key: 'chorus' | 'reverb' | 'delay'): void => {
    const refresh = (): void => {
      led.dataset.active = String(getState()[key].enabled);
    };
    refresh();
    led.addEventListener('click', () => {
      push((s) => (s[key].enabled = !s[key].enabled));
      refresh();
    });
  };
  wireLed(chorus.led, 'chorus');
  wireLed(reverb.led, 'reverb');
  wireLed(delay.led, 'delay');

  root.append(chorus.wrap, reverb.wrap, delay.wrap);

  return { element: root };
}
