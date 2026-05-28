/**
 * Transport panel — global tempo & clock controls shared by the Sequencer,
 * the Arpeggiator, and any future module that rides the {@link TransportClock}.
 *
 * Controls:
 *   - BPM         numeric input, two-way bound to TransportClock.
 *   - TAP         tap-tempo button: 4 hits at the desired rate sets the BPM.
 *   - SOURCE      INT (panel BPM) / EXT (external MIDI clock).
 *   - PLAY/STOP   master start/stop; reflects transport state both ways.
 *   - CLK OUT     when active, every 24-ppqn tick is sent as 0xF8 on the
 *                 MIDI output (lets DAWs slave to SIXinONE).
 *
 * The transport panel doesn't render anything sequencer- or arp-specific:
 * those modules each have their own engagement state. Pressing PLAY here
 * starts the shared transport; the sequencer will follow if its mode isn't
 * STEP, and the arp will already react to ticks whenever notes are held.
 */

import { transportClock } from '../../sequencer/transport-clock';
import { midiBridge } from '../../midi/midi-bridge';

export interface TransportPanelHandle {
  element: HTMLElement;
}

export function createTransportPanel(): TransportPanelHandle {
  const root = document.createElement('section');
  root.className = 'transport-panel';

  root.innerHTML = `
    <h3 class="group-title">Transport</h3>
    <div class="transport-row">
      <label class="transport-field">
        <span>BPM</span>
        <input class="transport-bpm" type="number" min="30" max="360" value="${transportClock.getBpm()}" />
      </label>
      <button type="button" class="panel-switch transport-tap">
        <span class="panel-switch-led"></span><span class="panel-switch-label">TAP</span>
      </button>
      <label class="transport-field">
        <span>SOURCE</span>
        <select class="midi-select transport-source">
          <option value="INT">INT</option>
          <option value="EXT">EXT</option>
        </select>
      </label>
      <button type="button" class="panel-switch transport-play">
        <span class="panel-switch-led"></span><span class="panel-switch-label">PLAY</span>
      </button>
      <button type="button" class="panel-switch transport-stop">
        <span class="panel-switch-label">STOP</span>
      </button>
      <button type="button" class="panel-switch sm transport-clkout">
        <span class="panel-switch-led"></span><span class="panel-switch-label">CLK OUT</span>
      </button>
    </div>
  `;

  const bpmInp = root.querySelector('.transport-bpm') as HTMLInputElement;
  const tapBtn = root.querySelector('.transport-tap') as HTMLButtonElement;
  const sourceSel = root.querySelector('.transport-source') as HTMLSelectElement;
  const playBtn = root.querySelector('.transport-play') as HTMLButtonElement;
  const stopBtn = root.querySelector('.transport-stop') as HTMLButtonElement;
  const clkOutBtn = root.querySelector('.transport-clkout') as HTMLButtonElement;

  // ── two-way binds ──────────────────────────────────────────────────────
  bpmInp.addEventListener('input', () => transportClock.setBpm(parseInt(bpmInp.value, 10) || 120));
  sourceSel.value = transportClock.getSource();
  sourceSel.addEventListener('change', () => transportClock.setSource(sourceSel.value as 'INT' | 'EXT'));
  playBtn.addEventListener('click', () => transportClock.start());
  stopBtn.addEventListener('click', () => transportClock.stop());

  // Tap tempo — flashes the LED briefly on each press and updates the BPM
  // input as soon as the average stabilises.
  tapBtn.addEventListener('click', () => {
    const bpm = transportClock.tap();
    tapBtn.dataset.active = 'true';
    setTimeout(() => (tapBtn.dataset.active = 'false'), 90);
    if (bpm !== null && document.activeElement !== bpmInp) {
      bpmInp.value = String(Math.round(bpm));
    }
  });

  // ── CLK OUT: per-tick MIDI 0xF8 sender ────────────────────────────────
  let clkOutUnsub: (() => void) | null = null;
  const setClkOut = (on: boolean): void => {
    clkOutBtn.dataset.active = String(on);
    if (on && !clkOutUnsub) {
      clkOutUnsub = transportClock.subscribe({
        onTick: () => midiBridge.sendClock(),
        onTransport: (state) => {
          if (state === 'playing') midiBridge.sendTransport('start');
          else if (state === 'stopped') midiBridge.sendTransport('stop');
        },
      });
    } else if (!on && clkOutUnsub) {
      clkOutUnsub();
      clkOutUnsub = null;
    }
  };
  clkOutBtn.addEventListener('click', () => setClkOut(clkOutBtn.dataset.active !== 'true'));

  // ── transport → UI subscription ───────────────────────────────────────
  transportClock.subscribe({
    onBpmChange: (bpm) => {
      if (document.activeElement !== bpmInp) bpmInp.value = String(Math.round(bpm));
    },
    onSourceChange: (src) => {
      sourceSel.value = src;
    },
    onTransport: (state) => {
      playBtn.dataset.active = String(state === 'playing');
    },
  });

  return { element: root };
}
