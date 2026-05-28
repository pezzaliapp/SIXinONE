/**
 * Cassette I/O — the back-panel placeholder turned into a working
 * mass-storage interface. Inspired by the Memorymoog Plus tape jack:
 *
 *   REC   — exports the current 100-slot bank as a `.mm-bank` file
 *   PLAY  — opens a file picker; loads a `.mm-bank` with a confirmation
 *   STOP  — cancels an animation in flight
 *   EJECT — clears the current overrides (factory reset of the user bank)
 *
 * v3 — adds the FSK cassette easter egg:
 *
 *   FORMAT: [ TEXT (.mm-bank) ] [ AUDIO (.wav / live) ]
 *
 * When AUDIO is on, REC modulates the payload through the 2-FSK modem and
 * either downloads a .wav or plays through the speaker; PLAY opens a .wav
 * file or listens through the microphone, demodulates, and writes the
 * preset(s) into the bank. The alphanumeric display narrates the whole
 * thing — SYNC..., LOADING, CHECK..., OK, BAD TAPE.
 *
 * History (last 3 imports/exports) is persisted to IndexedDB so the user
 * can see what tape was last run.
 */

import { presetBank } from '../../data/preset-bank';
import {
  deleteUserPreset,
  loadAllUserPresets,
  saveUserPreset,
} from '../../data/preset-storage';
import {
  BadTapeError,
  deserializeMmBank,
  diffPresets,
  serializeMmBank,
} from '../../data/mm-bank';
import type { Preset } from '../../data/preset';
import { saveBankHistory, loadBankHistory, type BankHistoryEntry } from '../../data/bank-history';
import { currentPreset, showDisplay } from '../../state/store';
import { encode as modemEncode, decode as modemDecode, estimatedDuration } from '../../audio/cassette/modem';
import { downloadWav } from '../../audio/cassette/wav-encoder';
import { decodeWavFile } from '../../audio/cassette/wav-decoder';
import { transmit, type ActiveTransmission } from '../../audio/cassette/live-transmitter';
import { listen, type ActiveReception } from '../../audio/cassette/live-receiver';
import { decodePayload, encodePayload, estimatePayloadBytes, type CassettePayload } from '../../audio/cassette/payload';
import { resumeAudio } from '../../audio/context';

export interface CassetteHandle {
  element: HTMLElement;
}

function setReels(svg: SVGElement, spinning: boolean): void {
  const reels = svg.querySelectorAll<SVGGElement>('.cassette-reel');
  for (const r of reels) {
    if (spinning) r.classList.add('spinning');
    else r.classList.remove('spinning');
  }
}

function announce(display: HTMLElement, text: string, holdMs = 2500): void {
  display.textContent = text;
  if (holdMs > 0) {
    window.setTimeout(() => {
      if (display.textContent === text) display.textContent = 'READY';
    }, holdMs);
  }
}

async function gatherAllPresets(): Promise<Preset[]> {
  const out: Preset[] = [];
  for (let n = 0; n < 100; n++) out.push(presetBank.get(n));
  return out;
}

async function applyBank(presets: Preset[], mode: 'replace' | 'merge'): Promise<number> {
  if (mode === 'merge') {
    const current = await gatherAllPresets();
    const diff = diffPresets(current, presets);
    for (const p of diff) await saveUserPreset(p);
    const overrides = await loadAllUserPresets();
    presetBank.loadOverrides(overrides);
    return diff.length;
  }
  for (const p of presets) {
    await deleteUserPreset(p.number);
    await saveUserPreset(p);
  }
  const overrides = await loadAllUserPresets();
  presetBank.loadOverrides(overrides);
  return presets.length;
}

export function createCassette(): CassetteHandle {
  const root = document.createElement('section');
  root.className = 'cassette-rack';
  root.innerHTML = `
    <h3 class="group-title">Cassette I/O</h3>
    <div class="cassette-format-row">
      <span class="cassette-row-label">FORMAT</span>
      <button type="button" class="panel-switch sm cassette-fmt-text" data-active="true"><span class="panel-switch-led"></span><span class="panel-switch-label">TEXT</span></button>
      <button type="button" class="panel-switch sm cassette-fmt-audio"><span class="panel-switch-led"></span><span class="panel-switch-label">AUDIO</span></button>
    </div>
    <div class="cassette-audio-options" hidden>
      <div class="cassette-format-row">
        <span class="cassette-row-label">SCOPE</span>
        <label class="cassette-radio"><input type="radio" name="scope" value="single" checked /> Single preset (current)</label>
        <label class="cassette-radio"><input type="radio" name="scope" value="bank" /> All 100</label>
      </div>
      <div class="cassette-format-row">
        <span class="cassette-row-label">SOURCE</span>
        <label class="cassette-radio"><input type="radio" name="source" value="live" checked /> Live (mic / speaker)</label>
        <label class="cassette-radio"><input type="radio" name="source" value="wav" /> .wav file</label>
      </div>
      <div class="cassette-progress-row">
        <div class="cassette-progress"><div class="cassette-progress-fill"></div></div>
        <span class="cassette-progress-text">— ready —</span>
      </div>
      <svg class="cassette-waveform" viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg">
        <polyline points="" fill="none" stroke="#87ffae" stroke-width="1.5" />
      </svg>
    </div>
    <div class="cassette-body">
      <svg class="cassette-svg" viewBox="0 0 280 170" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="268" height="158" rx="8" fill="#19140e" stroke="#3a3128" />
        <rect x="22" y="22" width="236" height="64" rx="3" fill="#f4ead0" stroke="#3a3128" />
        <text x="140" y="58" text-anchor="middle" font-family="monospace" font-size="14" fill="#3a3128">MM PRESETS</text>
        <g class="cassette-reel" transform="translate(80,128)">
          <circle r="22" fill="#0a0907" stroke="#3a3128" />
          <g class="cassette-spokes" stroke="#3a3128" stroke-width="2">
            <line x1="-16" y1="0" x2="16" y2="0" />
            <line x1="0" y1="-16" x2="0" y2="16" />
            <line x1="-12" y1="-12" x2="12" y2="12" />
            <line x1="-12" y1="12" x2="12" y2="-12" />
          </g>
        </g>
        <g class="cassette-reel" transform="translate(200,128)">
          <circle r="22" fill="#0a0907" stroke="#3a3128" />
          <g class="cassette-spokes" stroke="#3a3128" stroke-width="2">
            <line x1="-16" y1="0" x2="16" y2="0" />
            <line x1="0" y1="-16" x2="0" y2="16" />
            <line x1="-12" y1="-12" x2="12" y2="12" />
            <line x1="-12" y1="12" x2="12" y2="-12" />
          </g>
        </g>
      </svg>
      <div class="cassette-side">
        <div class="cassette-display">READY</div>
        <div class="cassette-buttons">
          <button type="button" class="panel-switch sm cassette-rec"><span class="panel-switch-led"></span><span class="panel-switch-label">REC</span></button>
          <button type="button" class="panel-switch sm cassette-play"><span class="panel-switch-led"></span><span class="panel-switch-label">PLAY</span></button>
          <button type="button" class="panel-switch sm cassette-stop"><span class="panel-switch-label">STOP</span></button>
          <button type="button" class="panel-switch sm cassette-eject"><span class="panel-switch-label">EJECT</span></button>
        </div>
        <label class="cassette-merge">
          <input type="checkbox" class="cassette-merge-input" /> Merge (only changed presets)
        </label>
        <div class="cassette-history"></div>
      </div>
    </div>
  `;

  const svg = root.querySelector('.cassette-svg') as SVGElement;
  const display = root.querySelector('.cassette-display') as HTMLElement;
  const recBtn = root.querySelector('.cassette-rec') as HTMLButtonElement;
  const playBtn = root.querySelector('.cassette-play') as HTMLButtonElement;
  const stopBtn = root.querySelector('.cassette-stop') as HTMLButtonElement;
  const ejectBtn = root.querySelector('.cassette-eject') as HTMLButtonElement;
  const mergeChk = root.querySelector('.cassette-merge-input') as HTMLInputElement;
  const historyEl = root.querySelector('.cassette-history') as HTMLElement;
  const fmtTextBtn = root.querySelector('.cassette-fmt-text') as HTMLButtonElement;
  const fmtAudioBtn = root.querySelector('.cassette-fmt-audio') as HTMLButtonElement;
  const audioOptionsEl = root.querySelector('.cassette-audio-options') as HTMLElement;
  const progressFill = root.querySelector('.cassette-progress-fill') as HTMLElement;
  const progressText = root.querySelector('.cassette-progress-text') as HTMLElement;
  const waveformPoly = root.querySelector('.cassette-waveform polyline') as SVGPolylineElement;
  const scopeRadios = root.querySelectorAll<HTMLInputElement>('input[name="scope"]');
  const sourceRadios = root.querySelectorAll<HTMLInputElement>('input[name="source"]');

  let busyTimer: number | null = null;
  let activeTransmission: ActiveTransmission | null = null;
  let activeReception: ActiveReception | null = null;
  let waveformTimer: number | null = null;
  let audioMode = false;

  const stopAnim = (): void => {
    setReels(svg, false);
    if (busyTimer !== null) {
      window.clearTimeout(busyTimer);
      busyTimer = null;
    }
    stopWaveform();
  };

  const stopWaveform = (): void => {
    if (waveformTimer !== null) {
      window.clearInterval(waveformTimer);
      waveformTimer = null;
    }
    waveformPoly.setAttribute('points', '');
  };

  const animateWaveform = (levelGetter: () => number): void => {
    stopWaveform();
    const samples: number[] = new Array(60).fill(0);
    let phase = 0;
    waveformTimer = window.setInterval(() => {
      const level = Math.max(0.1, Math.min(1, levelGetter() * 4));
      samples.shift();
      // Mix a sine ride at the carrier-ish freq + the live level — looks
      // like an oscilloscope tracking the actual transmission.
      samples.push(Math.sin(phase) * level);
      phase += 0.6;
      const pts = samples.map((v, i) => `${(i * 200) / samples.length},${15 + v * 12}`).join(' ');
      waveformPoly.setAttribute('points', pts);
    }, 32);
  };

  const updateProgress = (fraction: number, text: string): void => {
    progressFill.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    progressText.textContent = text;
  };

  const refreshHistory = async (): Promise<void> => {
    const rows = await loadBankHistory();
    historyEl.innerHTML = '';
    if (rows.length === 0) {
      historyEl.textContent = 'No tape history yet.';
      return;
    }
    for (const r of rows) {
      const item = document.createElement('div');
      item.className = 'cassette-history-item';
      item.textContent = `${r.kind === 'import' ? 'LOAD' : 'SAVE'} · ${new Date(r.at).toLocaleString()} · ${r.count} presets`;
      historyEl.appendChild(item);
    }
  };

  // ── FORMAT switch ────────────────────────────────────────────────────
  function setFormat(mode: 'text' | 'audio'): void {
    audioMode = mode === 'audio';
    fmtTextBtn.dataset.active = String(!audioMode);
    fmtAudioBtn.dataset.active = String(audioMode);
    audioOptionsEl.hidden = !audioMode;
  }
  fmtTextBtn.addEventListener('click', () => setFormat('text'));
  fmtAudioBtn.addEventListener('click', () => setFormat('audio'));

  // ── Helpers — read current radio choices ──────────────────────────────
  const currentScope = (): 'single' | 'bank' => {
    for (const r of scopeRadios) if (r.checked) return r.value as 'single' | 'bank';
    return 'single';
  };
  const currentSource = (): 'live' | 'wav' => {
    for (const r of sourceRadios) if (r.checked) return r.value as 'live' | 'wav';
    return 'live';
  };

  const buildPayload = async (): Promise<CassettePayload> => {
    if (currentScope() === 'single') {
      return { kind: 'preset', preset: currentPreset.get() };
    }
    return { kind: 'bank', presets: await gatherAllPresets() };
  };

  // ── REC ──────────────────────────────────────────────────────────────
  recBtn.addEventListener('click', async () => {
    if (!audioMode) return recordText();
    await recordAudio();
  });

  // ── PLAY ─────────────────────────────────────────────────────────────
  playBtn.addEventListener('click', async () => {
    if (!audioMode) return loadText();
    await loadAudio();
  });

  async function recordText(): Promise<void> {
    display.textContent = 'SAVING';
    setReels(svg, true);
    try {
      const presets = await gatherAllPresets();
      const text = await serializeMmBank(presets);
      const blob = new Blob([text], { type: 'application/octet-stream' });
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sixinone-presets-${date}.mm-bank`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      await saveBankHistory({ kind: 'export', at: Date.now(), count: presets.length });
      await refreshHistory();
      announce(display, `${presets.length} SAVED`);
    } catch (err) {
      console.warn('Cassette save failed', err);
      announce(display, 'WRITE FAIL');
    } finally {
      stopAnim();
    }
  }

  function loadText(): void {
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.mm-bank,application/octet-stream,text/plain';
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      const mode: 'replace' | 'merge' = mergeChk.checked ? 'merge' : 'replace';
      if (mode === 'replace') {
        const ok = window.confirm(
          'This will replace your current presets. Continue?\n(Tip: enable "Merge" to only load presets that differ.)',
        );
        if (!ok) return;
      }
      display.textContent = 'LOADING';
      setReels(svg, true);
      busyTimer = window.setTimeout(async () => {
        try {
          const text = await f.text();
          const bank = await deserializeMmBank(text);
          const applied = await applyBank(bank.presets, mode);
          await saveBankHistory({ kind: 'import', at: Date.now(), count: applied });
          await refreshHistory();
          announce(display, `${applied} LOADED`);
        } catch (err) {
          if (err instanceof BadTapeError) {
            announce(display, 'BAD TAPE');
          } else {
            console.warn('Cassette load failed', err);
            announce(display, 'READ FAIL');
          }
        } finally {
          stopAnim();
        }
      }, 2200);
    });
    file.click();
  }

  async function recordAudio(): Promise<void> {
    showDisplay('SYNC...', 0);
    setReels(svg, true);
    try {
      await resumeAudio();
      const payload = await buildPayload();
      const bytes = await encodePayload(payload);
      const pcm = modemEncode(bytes, { sampleRate: 44100, amplitude: 0.65 });
      const duration = pcm.length / 44100;
      const scopeLabel = currentScope() === 'single' ? currentPreset.get().name : 'BANK';

      if (currentSource() === 'wav') {
        // Download flow — no audio playback, just write the file.
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename =
          currentScope() === 'single'
            ? `sixinone-preset-${currentPreset.get().number.toString().padStart(2, '0')}-${date}.wav`
            : `sixinone-bank-${date}.wav`;
        downloadWav(pcm, 44100, filename);
        updateProgress(1, `Saved ${pcm.length} samples (${duration.toFixed(1)}s).`);
        announce(display, currentScope() === 'single' ? `SAVED ${scopeLabel}` : 'BANK SAVED');
        showDisplay('OK', 1500);
        return;
      }

      // Live transmission.
      let progressLevel = 0;
      animateWaveform(() => progressLevel);
      activeTransmission = transmit(pcm, {
        onProgress: (fraction, elapsedSec) => {
          progressLevel = Math.sin(elapsedSec * 4) * 0.5 + 0.5;
          updateProgress(fraction, `Transmitting ${(elapsedSec).toFixed(1)}s / ${duration.toFixed(1)}s — ${scopeLabel}`);
          showDisplay(currentScope() === 'single' ? `SAVING` : `SAVING ${Math.round(fraction * 100)}`, 0);
        },
        onComplete: () => {
          activeTransmission = null;
          stopAnim();
          updateProgress(1, 'Transmission complete.');
          showDisplay('OK', 1800);
          announce(display, 'TX DONE');
        },
      });
    } catch (err) {
      console.warn('Cassette audio REC failed', err);
      announce(display, 'WRITE FAIL');
      showDisplay('BAD TAPE', 2000);
      stopAnim();
    }
  }

  async function loadAudio(): Promise<void> {
    if (currentSource() === 'wav') {
      const file = document.createElement('input');
      file.type = 'file';
      file.accept = '.wav,audio/wav,audio/*';
      file.addEventListener('change', async () => {
        const f = file.files?.[0];
        if (!f) return;
        showDisplay('LOADING', 0);
        setReels(svg, true);
        updateProgress(0.2, 'Decoding audio…');
        try {
          const { pcm, sampleRate } = await decodeWavFile(f);
          updateProgress(0.6, 'Demodulating…');
          showDisplay('CHECK...', 0);
          const result = modemDecode(pcm, sampleRate);
          if (!result.ok || !result.bytes) {
            showDisplay('BAD TAPE', 2000);
            announce(display, 'BAD TAPE');
            updateProgress(0, `Decode failed (${result.reason}).`);
            return;
          }
          await applyDecodedPayload(result.bytes);
          updateProgress(1, 'Loaded.');
        } catch (err) {
          console.warn('Cassette WAV load failed', err);
          showDisplay('BAD TAPE', 2000);
          announce(display, 'READ FAIL');
        } finally {
          stopAnim();
        }
      });
      file.click();
      return;
    }

    // Live mic.
    try {
      showDisplay('SYNC...', 0);
      setReels(svg, true);
      updateProgress(0.05, 'Requesting microphone…');
      activeReception = await listen({
        onLevel: (rms) => {
          // Light up the waveform proportional to the incoming level.
          if (waveformTimer === null) animateWaveform(() => rms);
        },
        onState: (state) => {
          if (state === 'listening') showDisplay('LOADING', 0);
          else if (state === 'checking') showDisplay('CHECK...', 0);
        },
        onResult: async (result) => {
          activeReception = null;
          stopAnim();
          if (!result.ok || !result.bytes) {
            showDisplay('BAD TAPE', 2200);
            announce(display, 'BAD TAPE');
            updateProgress(0, `No tape detected (${result.reason ?? 'no-sync'}).`);
            return;
          }
          try {
            await applyDecodedPayload(result.bytes);
            updateProgress(1, 'Loaded.');
          } catch (err) {
            console.warn('Cassette payload apply failed', err);
            showDisplay('BAD TAPE', 2000);
            announce(display, 'READ FAIL');
          }
        },
      });
    } catch (err) {
      const msg = (err as Error).message;
      console.warn('Cassette mic listen failed', msg);
      if (msg === 'mic-unavailable' || msg.includes('Permission')) {
        showDisplay('MIC OFF', 2200);
      } else {
        showDisplay('BAD TAPE', 2000);
      }
      stopAnim();
    }
  }

  async function applyDecodedPayload(bytes: Uint8Array): Promise<void> {
    const payload = await decodePayload(bytes);
    if (payload.kind === 'preset') {
      const p = payload.preset;
      await saveUserPreset(p);
      const overrides = await loadAllUserPresets();
      presetBank.loadOverrides(overrides);
      await saveBankHistory({ kind: 'import', at: Date.now(), count: 1 });
      await refreshHistory();
      showDisplay('OK', 1800);
      announce(display, `LOADED ${p.number.toString().padStart(2, '0')}`);
    } else {
      const mode: 'replace' | 'merge' = mergeChk.checked ? 'merge' : 'replace';
      const applied = await applyBank(payload.presets, mode);
      await saveBankHistory({ kind: 'import', at: Date.now(), count: applied });
      await refreshHistory();
      showDisplay('OK', 1800);
      announce(display, `${applied} LOADED`);
    }
  }

  // ── STOP / EJECT ─────────────────────────────────────────────────────
  stopBtn.addEventListener('click', () => {
    activeTransmission?.stop();
    activeReception?.stop();
    activeTransmission = null;
    activeReception = null;
    stopAnim();
    updateProgress(0, '— ready —');
    announce(display, 'STOPPED', 1000);
    showDisplay('STOPPED', 1500);
  });

  ejectBtn.addEventListener('click', async () => {
    const ok = window.confirm('Eject — drop all your user-modified presets and revert to factory bank?');
    if (!ok) return;
    display.textContent = 'EJECT';
    setReels(svg, true);
    try {
      for (let n = 0; n < 100; n++) await deleteUserPreset(n);
      const overrides = await loadAllUserPresets();
      presetBank.loadOverrides(overrides);
      announce(display, 'FACTORY');
    } finally {
      stopAnim();
    }
  });

  // Initial duration estimate for the current preset (educational tooltip
  // so the user knows what to expect before clicking REC).
  const updateEstimate = async (): Promise<void> => {
    if (!audioMode) return;
    const payload = await buildPayload();
    const bytes = estimatePayloadBytes(payload);
    const sec = estimatedDuration(bytes);
    progressText.textContent = `~${sec.toFixed(1)}s of audio for ${payload.kind === 'preset' ? 'this preset' : '100 presets'}`;
  };
  for (const r of [...scopeRadios, ...sourceRadios]) {
    r.addEventListener('change', () => {
      void updateEstimate();
    });
  }
  currentPreset.subscribe(() => void updateEstimate());

  void refreshHistory();

  return { element: root };
}

export type { BankHistoryEntry };
