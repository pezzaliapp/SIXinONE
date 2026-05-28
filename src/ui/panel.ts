/**
 * Front-panel layout — three macro-sections from left to right, mirroring the
 * physical Memorymoog: LEFT (performance + system controller), MODULATION
 * (LFO, voice mod, oscillators, mixer), RIGHT (filter, contour, VCA, outputs).
 *
 * Style direction: 1 — Iperrealistico (matte black panel, white serigraph,
 * black knobs with white indicator). The brief says pick one and motivate;
 * iperrealistico wins for a tribute project because the muscle memory of
 * the original layout is the whole point.
 *
 * Step 5 wires the audio-shaping controls (LFO, OSC, mixer, filter, VCA,
 * contour flags). Footpedals, arpeggiator and the system-controller keypad
 * land in Step 10 alongside preset persistence.
 */

import type { Preset, LfoWave } from '../data/preset';
import { currentPreset, flashEdit, mutate, runAutoTune } from '../state/store';
import { createKnob } from './components/knob';
import { createRadioGroup, createSwitch } from './components/switch';
import { createAlphanumericDisplay, createProgramDisplay } from './components/display';
import { createKeypad } from './components/keypad';

type PresetMutator = (draft: Preset) => void;

function withDisplay(label: string, fn: PresetMutator, formatValue: (p: Preset) => string): PresetMutator {
  return (draft) => {
    const previous = formatValue(currentPreset.get());
    fn(draft);
    flashEdit(`${label} ${previous}`, `${label} ${formatValue(draft)}`);
  };
}

interface SectionOpts {
  title: string;
  className?: string;
}

function section({ title, className }: SectionOpts): HTMLElement {
  const wrap = document.createElement('section');
  wrap.className = `panel-section ${className ?? ''}`;
  const head = document.createElement('h2');
  head.className = 'section-title';
  head.textContent = title;
  wrap.appendChild(head);
  return wrap;
}

function row(): HTMLElement {
  const r = document.createElement('div');
  r.className = 'panel-row';
  return r;
}

function group(title?: string): HTMLElement {
  const g = document.createElement('div');
  g.className = 'panel-group';
  if (title) {
    const t = document.createElement('h3');
    t.className = 'group-title';
    t.textContent = title;
    g.appendChild(t);
  }
  return g;
}

/** Build the entire panel as a single detached element. */
export function createPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'panel';

  panel.appendChild(buildLeftSection());
  panel.appendChild(buildModulationSection());
  panel.appendChild(buildRightSection());

  return panel;
}

// ────────────────────────────────────────────────────────────────────────────
// LEFT SIDE — Performance + System Controller
// ────────────────────────────────────────────────────────────────────────────

function buildLeftSection(): HTMLElement {
  const wrap = section({ title: 'Left Side Control', className: 'left-side' });

  const performance = group('Performance');
  const initial = currentPreset.get();

  const autoTune = createSwitch({
    label: 'Auto Tune',
    active: false,
    onChange: () => {
      void runAutoTune();
      // Momentary: snap back after a beat so the LED matches the action.
      window.setTimeout(() => autoTune.set(false, false), 2900);
    },
  });
  performance.appendChild(autoTune.element);

  const glide = createKnob({
    label: 'Glide',
    value: initial.glide,
    defaultValue: 0,
    onChange: (v) => mutate(withDisplay('GLIDE', (d) => (d.glide = v), (p) => p.glide.toFixed(1))),
  });
  const glideOn = createSwitch({
    label: 'Glide On',
    active: initial.glideOn,
    onChange: (a) => mutate((d) => (d.glideOn = a)),
  });

  const mono = createSwitch({
    label: 'Mono',
    active: initial.mono,
    onChange: (a) => mutate((d) => (d.mono = a)),
  });
  const multiTrig = createSwitch({
    label: 'Multi Trig',
    active: initial.multipleTrigger,
    onChange: (a) => mutate((d) => (d.multipleTrigger = a)),
  });
  const hold = createSwitch({
    label: 'Hold',
    active: initial.hold,
    onChange: (a) => mutate((d) => (d.hold = a)),
  });

  performance.append(glide.element, glideOn.element, mono.element, multiTrig.element, hold.element);

  const bendMod = group('Wheels & Bend');
  const pitchBend = createKnob({
    label: 'Pitch Bend Amt',
    value: initial.pitchBendAmount,
    onChange: (v) => mutate((d) => (d.pitchBendAmount = v)),
  });
  const modAmt = createKnob({
    label: 'Mod Amount',
    value: initial.modulationAmount,
    onChange: (v) => mutate((d) => (d.modulationAmount = v)),
  });
  bendMod.append(pitchBend.element, modAmt.element);

  const systemCtrl = group('System Controller');
  const displays = document.createElement('div');
  displays.className = 'display-stack';
  displays.appendChild(createProgramDisplay());
  displays.appendChild(createAlphanumericDisplay());
  systemCtrl.appendChild(displays);
  const keypad = createKeypad();
  systemCtrl.appendChild(keypad.element);

  wrap.append(performance, bendMod, systemCtrl);
  return wrap;
}

// ────────────────────────────────────────────────────────────────────────────
// MODULATION — LFO, Voice mod, Oscillators, Mixer
// ────────────────────────────────────────────────────────────────────────────

function buildModulationSection(): HTMLElement {
  const wrap = section({ title: 'Modulation', className: 'modulation' });

  // LFO
  const lfo = group('LFO Modulation');
  const initial = currentPreset.get();

  const lfoRate = createKnob({
    label: 'Rate',
    value: initial.lfo.rate,
    onChange: (v) => mutate((d) => (d.lfo.rate = v)),
  });

  const lfoWave = createRadioGroup<LfoWave>({
    label: 'Wave',
    options: [
      { label: 'Tri', value: 'TRI' },
      { label: 'Saw+', value: 'SAW+' },
      { label: 'Saw−', value: 'SAW-' },
      { label: 'Sqr', value: 'SQR' },
      { label: 'S&H', value: 'S&H' },
    ],
    value: initial.lfo.wave,
    onChange: (w) => mutate((d) => (d.lfo.wave = w)),
  });

  const lfoDest = document.createElement('div');
  lfoDest.className = 'switch-row';
  const dests: Array<[string, keyof Preset['lfo']['dest']]> = [
    ['OSC1', 'osc1'],
    ['OSC2', 'osc2'],
    ['OSC3', 'osc3'],
    ['PW1', 'pw1'],
    ['PW2', 'pw2'],
    ['PW3', 'pw3'],
    ['Filter', 'filter'],
  ];
  for (const [label, key] of dests) {
    const sw = createSwitch({
      label,
      active: initial.lfo.dest[key],
      onChange: (a) => mutate((d) => (d.lfo.dest[key] = a)),
      size: 'sm',
    });
    lfoDest.appendChild(sw.element);
  }
  lfo.append(lfoRate.element, lfoWave.element, lfoDest);

  // Voice mod
  const vmod = group('Voice Modulation');
  const osc3Amt = createKnob({
    label: 'OSC3 Amt',
    value: initial.voiceMod.osc3ModAmount,
    onChange: (v) => mutate((d) => (d.voiceMod.osc3ModAmount = v)),
  });
  const filterContourAmt = createKnob({
    label: 'Filter Cont Amt',
    value: initial.voiceMod.filterContourModAmount,
    onChange: (v) => mutate((d) => (d.voiceMod.filterContourModAmount = v)),
  });
  const contouredOsc3 = createSwitch({
    label: 'Contoured OSC3',
    active: initial.voiceMod.contouredOsc3,
    onChange: (a) => mutate((d) => (d.voiceMod.contouredOsc3 = a)),
  });
  const invert = createSwitch({
    label: 'Invert',
    active: initial.voiceMod.invert,
    onChange: (a) => mutate((d) => (d.voiceMod.invert = a)),
  });
  vmod.append(osc3Amt.element, filterContourAmt.element, contouredOsc3.element, invert.element);

  // Oscillators
  const oscs = group('Oscillators');
  oscs.appendChild(buildOscRow(1));
  oscs.appendChild(buildOscRow(2));
  oscs.appendChild(buildOscRow(3));

  // Mixer
  const mixer = group('Mixer');
  const mix1 = createKnob({
    label: 'OSC1',
    value: initial.mixer.osc1,
    onChange: (v) => mutate((d) => (d.mixer.osc1 = v)),
  });
  const mix2 = createKnob({
    label: 'OSC2',
    value: initial.mixer.osc2,
    onChange: (v) => mutate((d) => (d.mixer.osc2 = v)),
  });
  const mix3 = createKnob({
    label: 'OSC3',
    value: initial.mixer.osc3,
    onChange: (v) => mutate((d) => (d.mixer.osc3 = v)),
  });
  const mixN = createKnob({
    label: 'Noise',
    value: initial.mixer.noise,
    onChange: (v) => mutate((d) => (d.mixer.noise = v)),
  });
  mixer.append(mix1.element, mix2.element, mix3.element, mixN.element);

  wrap.append(lfo, vmod, oscs, mixer);
  return wrap;
}

function buildOscRow(idx: 1 | 2 | 3): HTMLElement {
  const r = row();
  const title = document.createElement('h4');
  title.className = 'osc-title';
  title.textContent = `OSC ${idx}`;
  r.appendChild(title);

  const initial = currentPreset.get();
  const osc = idx === 1 ? initial.osc1 : idx === 2 ? initial.osc2 : initial.osc3;

  // Octave radio (16/8/4/2)
  const octRadio = createRadioGroup<number>({
    label: 'Octave',
    options: [
      { label: "16'", value: 16 },
      { label: "8'", value: 8 },
      { label: "4'", value: 4 },
      { label: "2'", value: 2 },
    ],
    value: osc.octave,
    onChange: (v) => {
      const oct = v as 2 | 4 | 8 | 16;
      mutate((d) => {
        if (idx === 1) d.osc1.octave = oct;
        if (idx === 2) d.osc2.octave = oct;
        if (idx === 3) d.osc3.octave = oct;
      });
    },
  });
  r.appendChild(octRadio.element);

  const pw = createKnob({
    label: 'PW',
    value: osc.pulseWidth,
    onChange: (v) =>
      mutate((d) => {
        if (idx === 1) d.osc1.pulseWidth = v;
        if (idx === 2) d.osc2.pulseWidth = v;
        if (idx === 3) d.osc3.pulseWidth = v;
      }),
  });
  r.appendChild(pw.element);

  // Wave toggles
  const waves = document.createElement('div');
  waves.className = 'switch-row';
  for (const w of ['pulse', 'saw', 'tri'] as const) {
    const sw = createSwitch({
      label: w === 'pulse' ? 'Pulse' : w === 'saw' ? 'Saw' : 'Tri',
      active: osc.waves[w],
      onChange: (a) =>
        mutate((d) => {
          if (idx === 1) d.osc1.waves[w] = a;
          if (idx === 2) d.osc2.waves[w] = a;
          if (idx === 3) d.osc3.waves[w] = a;
        }),
      size: 'sm',
    });
    waves.appendChild(sw.element);
  }
  r.appendChild(waves);

  if (idx === 1) {
    const sync = createSwitch({
      label: 'Sync 2→1',
      active: initial.osc1.sync2to1,
      onChange: (a) => mutate((d) => (d.osc1.sync2to1 = a)),
      size: 'sm',
    });
    r.appendChild(sync.element);
  }

  if (idx === 2) {
    const coarse = createKnob({
      label: 'Coarse',
      value: initial.osc2.coarse,
      min: -7,
      max: 7,
      onChange: (v) => mutate((d) => (d.osc2.coarse = v)),
    });
    const fine = createKnob({
      label: 'Fine',
      value: initial.osc2.fine,
      min: -1,
      max: 1,
      step: 0.01,
      onChange: (v) => mutate((d) => (d.osc2.fine = v)),
    });
    r.append(coarse.element, fine.element);
  }

  if (idx === 3) {
    const freq = createKnob({
      label: 'Freq',
      value: initial.osc3.frequency,
      min: -9,
      max: 9,
      onChange: (v) => mutate((d) => (d.osc3.frequency = v)),
    });
    const low = createSwitch({
      label: 'Low',
      active: initial.osc3.low,
      onChange: (a) => mutate((d) => (d.osc3.low = a)),
      size: 'sm',
    });
    const kb = createSwitch({
      label: 'KB Ctrl',
      active: initial.osc3.keyboardControl,
      onChange: (a) => mutate((d) => (d.osc3.keyboardControl = a)),
      size: 'sm',
    });
    r.append(freq.element, low.element, kb.element);
  }
  return r;
}

// ────────────────────────────────────────────────────────────────────────────
// RIGHT SIDE — Filter, Contour, VCA, Outputs
// ────────────────────────────────────────────────────────────────────────────

function buildRightSection(): HTMLElement {
  const wrap = section({ title: 'Right Side Control', className: 'right-side' });
  const initial = currentPreset.get();

  // Filter
  const filterGrp = group('Voltage Controlled Filter');

  const kbTrackRow = document.createElement('div');
  kbTrackRow.className = 'switch-row';
  const kb13 = createSwitch({
    label: 'KB 1/3',
    active: initial.filter.kbTrack === 0.333 || initial.filter.kbTrack === 1,
    onChange: () =>
      mutate((d) => {
        // Compute new kbTrack from both switches via OR encoding.
        const has13 = !(d.filter.kbTrack === 0.333 || d.filter.kbTrack === 1);
        const has23 = d.filter.kbTrack === 0.667 || d.filter.kbTrack === 1;
        d.filter.kbTrack = encodeKbTrack(has13, has23);
      }),
    size: 'sm',
  });
  const kb23 = createSwitch({
    label: 'KB 2/3',
    active: initial.filter.kbTrack === 0.667 || initial.filter.kbTrack === 1,
    onChange: () =>
      mutate((d) => {
        const has13 = d.filter.kbTrack === 0.333 || d.filter.kbTrack === 1;
        const has23 = !(d.filter.kbTrack === 0.667 || d.filter.kbTrack === 1);
        d.filter.kbTrack = encodeKbTrack(has13, has23);
      }),
    size: 'sm',
  });
  kbTrackRow.append(kb13.element, kb23.element);

  const cutoff = createKnob({
    label: 'Cutoff',
    value: initial.filter.cutoff,
    onChange: (v) => mutate((d) => (d.filter.cutoff = v)),
  });
  const emphasis = createKnob({
    label: 'Emphasis',
    value: initial.filter.emphasis,
    onChange: (v) => mutate((d) => (d.filter.emphasis = v)),
  });
  const contour = createKnob({
    label: 'Contour Amt',
    value: initial.filter.contourAmount,
    onChange: (v) => mutate((d) => (d.filter.contourAmount = v)),
  });
  const fA = createKnob({
    label: 'Attack',
    value: initial.filter.attack,
    onChange: (v) => mutate((d) => (d.filter.attack = v)),
  });
  const fD = createKnob({
    label: 'Decay',
    value: initial.filter.decay,
    onChange: (v) => mutate((d) => (d.filter.decay = v)),
  });
  const fS = createKnob({
    label: 'Sustain',
    value: initial.filter.sustain,
    onChange: (v) => mutate((d) => (d.filter.sustain = v)),
  });
  const fR = createKnob({
    label: 'Release',
    value: initial.filter.release,
    onChange: (v) => mutate((d) => (d.filter.release = v)),
  });
  filterGrp.append(
    kbTrackRow,
    cutoff.element,
    emphasis.element,
    contour.element,
    fA.element,
    fD.element,
    fS.element,
    fR.element,
  );

  // Contour flags
  const contourFlags = group('Contour Controls');
  const flags = (
    [
      ['Return to Zero', 'returnToZero'],
      ['Unconditional', 'unconditional'],
      ['Keyboard Follow', 'keyboardFollow'],
      ['Release', 'release'],
    ] as const
  ).map(([label, key]) => {
    return createSwitch({
      label,
      active: initial.contour[key],
      onChange: (a) => mutate((d) => (d.contour[key] = a)),
      size: 'sm',
    });
  });
  for (const f of flags) contourFlags.appendChild(f.element);

  // VCA
  const vcaGrp = group('Voltage Controlled Amplifier');
  const vA = createKnob({
    label: 'Attack',
    value: initial.vca.attack,
    onChange: (v) => mutate((d) => (d.vca.attack = v)),
  });
  const vD = createKnob({
    label: 'Decay',
    value: initial.vca.decay,
    onChange: (v) => mutate((d) => (d.vca.decay = v)),
  });
  const vS = createKnob({
    label: 'Sustain',
    value: initial.vca.sustain,
    onChange: (v) => mutate((d) => (d.vca.sustain = v)),
  });
  const vR = createKnob({
    label: 'Release',
    value: initial.vca.release,
    onChange: (v) => mutate((d) => (d.vca.release = v)),
  });
  vcaGrp.append(vA.element, vD.element, vS.element, vR.element);

  // Outputs
  const outs = group('Outputs');
  const progVol = createKnob({
    label: 'Programmable Vol',
    value: initial.programmableVolume,
    onChange: (v) => mutate((d) => (d.programmableVolume = v)),
  });
  outs.append(progVol.element);

  wrap.append(filterGrp, contourFlags, vcaGrp, outs);
  return wrap;
}

function encodeKbTrack(has13: boolean, has23: boolean): 0 | 0.333 | 0.667 | 1 {
  if (has13 && has23) return 1;
  if (has23) return 0.667;
  if (has13) return 0.333;
  return 0;
}
