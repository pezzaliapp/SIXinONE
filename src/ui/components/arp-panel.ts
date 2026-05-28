/**
 * Arpeggiator control strip. Lives between the MIDI panel and the
 * sequencer so the layout reads "MIDI → ARP → SEQUENCER → CASSETTE".
 *
 * Controls:
 *   - Pattern selector: OFF / UP / DOWN / UP-DN / UD-INC / RAND / PLAY
 *     (mirrors the 6 positions of the original Memorymoog arpeggiator
 *     switch, with an extra OFF slot).
 *   - Range: 1..4 octaves.
 *   - Subdivision: 1/4, 1/8, 1/16 (default), 1/32 — matches the same
 *     option set the sequencer uses for SYNC_EXT.
 *   - Source: INT (panel BPM) / EXT (external MIDI clock).
 *   - Rate: BPM input, used in INT mode.
 *   - Hold mirrors the preset.hold switch so the arp latches even after
 *     the user releases the keys.
 */

import type { Synth } from '../../audio/synth';
import { currentPreset, mutate } from '../../state/store';
import type { ArpClockSource, ArpPattern, ArpSubdiv } from '../../sequencer/arpeggiator';

export interface ArpPanelHandle {
  element: HTMLElement;
}

const PATTERN_VALUES: Array<{ value: number; label: string; pattern: ArpPattern | null }> = [
  { value: 0, label: 'OFF', pattern: null },
  { value: 1, label: 'UP', pattern: 'UP' },
  { value: 2, label: 'DN', pattern: 'DOWN' },
  { value: 3, label: 'U-D', pattern: 'UP_DOWN' },
  { value: 4, label: 'UDi', pattern: 'UP_DOWN_INC' },
  { value: 5, label: 'RND', pattern: 'RANDOM' },
  { value: 6, label: 'PLY', pattern: 'AS_PLAYED' },
];

export function createArpPanel(synth: Synth): ArpPanelHandle {
  const root = document.createElement('section');
  root.className = 'arp-panel';

  const title = document.createElement('h3');
  title.className = 'group-title';
  title.textContent = 'Arpeggiator';
  root.appendChild(title);

  const arp = synth.getArpeggiator();

  // Pattern strip
  const patternRow = document.createElement('div');
  patternRow.className = 'arp-pattern-row';
  const patternBtns: HTMLButtonElement[] = [];
  for (const opt of PATTERN_VALUES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-switch sm arp-pattern-btn';
    btn.innerHTML = `<span class="panel-switch-led"></span><span class="panel-switch-label">${opt.label}</span>`;
    btn.addEventListener('click', () => {
      mutate((d) => (d.arpeggiator = opt.value as 0 | 1 | 2 | 3 | 4 | 5 | 6));
    });
    patternBtns.push(btn);
    patternRow.appendChild(btn);
  }
  root.appendChild(patternRow);

  // Settings row
  const settings = document.createElement('div');
  settings.className = 'arp-settings';

  const rangeLabel = document.createElement('label');
  rangeLabel.className = 'arp-field';
  rangeLabel.innerHTML = '<span>RANGE</span>';
  const rangeSel = document.createElement('select');
  rangeSel.className = 'midi-select';
  for (const v of [1, 2, 3, 4]) {
    const o = document.createElement('option');
    o.value = String(v);
    o.textContent = `${v} oct`;
    if (v === arp.getOctaveRange()) o.selected = true;
    rangeSel.appendChild(o);
  }
  rangeSel.addEventListener('change', () => arp.setOctaveRange(parseInt(rangeSel.value, 10)));
  rangeLabel.appendChild(rangeSel);

  const subdivLabel = document.createElement('label');
  subdivLabel.className = 'arp-field';
  subdivLabel.innerHTML = '<span>STEP</span>';
  const subdivSel = document.createElement('select');
  subdivSel.className = 'midi-select';
  for (const [val, label] of [
    [24, '1/4'],
    [12, '1/8'],
    [6, '1/16'],
    [3, '1/32'],
  ] as const) {
    const o = document.createElement('option');
    o.value = String(val);
    o.textContent = label;
    if (val === arp.getSubdivision()) o.selected = true;
    subdivSel.appendChild(o);
  }
  subdivSel.addEventListener('change', () => arp.setSubdivision(parseInt(subdivSel.value, 10) as ArpSubdiv));
  subdivLabel.appendChild(subdivSel);

  const sourceLabel = document.createElement('label');
  sourceLabel.className = 'arp-field';
  sourceLabel.innerHTML = '<span>CLOCK</span>';
  const sourceSel = document.createElement('select');
  sourceSel.className = 'midi-select';
  for (const v of ['INT', 'EXT']) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    if (v === arp.getSource()) o.selected = true;
    sourceSel.appendChild(o);
  }
  sourceSel.addEventListener('change', () => arp.setSource(sourceSel.value as ArpClockSource));
  sourceLabel.appendChild(sourceSel);

  const bpmLabel = document.createElement('label');
  bpmLabel.className = 'arp-field';
  bpmLabel.innerHTML = '<span>RATE BPM</span>';
  const bpmInp = document.createElement('input');
  bpmInp.type = 'number';
  bpmInp.min = '30';
  bpmInp.max = '360';
  bpmInp.value = String(arp.getBpm());
  bpmInp.className = 'arp-bpm';
  bpmInp.addEventListener('input', () => arp.setBpm(parseInt(bpmInp.value, 10) || 120));
  bpmLabel.appendChild(bpmInp);

  settings.append(rangeLabel, subdivLabel, sourceLabel, bpmLabel);
  root.appendChild(settings);

  // Refresh selected pattern button whenever the preset changes (preset load
  // or panel mutation). We keep this subscription alive for the life of the
  // panel — no teardown needed for a singleton view.
  const refresh = (): void => {
    const v = currentPreset.get().arpeggiator;
    for (const [i, btn] of patternBtns.entries()) {
      btn.dataset.active = String(PATTERN_VALUES[i]!.value === v);
    }
  };
  refresh();
  currentPreset.subscribe(refresh);

  return { element: root };
}
