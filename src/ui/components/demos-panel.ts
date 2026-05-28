/**
 * DEMOS panel — collapsible "tape player" UI for the demo player.
 *
 * Layout: the header has a DEMOS button that toggles a fixed-position
 * panel docked at the bottom-right. Inside:
 *   - Three sections (IN STYLE / CLASSICAL / TECHNICAL) listing the
 *     available demos, each with a PLAY button.
 *   - Transport row: PLAY/PAUSE/STOP + PREV/NEXT (only when the loaded
 *     demo is isLong).
 *   - Progress bar + currentTime/duration readout.
 *   - "Now" line — preset name or filter-workout caption for technical demos.
 *   - Credits line.
 *
 * Keyboard:
 *   - Space toggles play/pause when the panel is open.
 *   - Esc stops the demo (panel stays open).
 *   - ←/→ navigate PREV/NEXT when the demo is isLong.
 */

import type { DemoPlayer, ProgressInfo } from '../../audio/demo-player';
import { DEMOS, type Demo } from '../../data/demos';
import { presetBank } from '../../data/preset-bank';
import { FILTER_WORKOUT_CAPTIONS } from '../../data/demos/tech-filter';

export interface DemosPanelHandle {
  /** The button you hang off the header to open the panel. */
  triggerButton: HTMLElement;
  /** The floating panel itself, appended to document.body. */
  panel: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** Load + play a demo (used by the per-preset PLAY button). */
  playDemo(demo: Demo): void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec - m * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function captionForFilterWorkout(t: number): string {
  let active = FILTER_WORKOUT_CAPTIONS[0]!;
  for (const c of FILTER_WORKOUT_CAPTIONS) {
    if (t >= c.time) active = c;
  }
  return active.text;
}

export function createDemosPanel(player: DemoPlayer): DemosPanelHandle {
  // ── trigger button (lives in the header) ─────────────────────────────
  const triggerButton = document.createElement('button');
  triggerButton.type = 'button';
  triggerButton.className = 'demos-trigger';
  triggerButton.setAttribute('aria-label', 'Open demos panel');
  triggerButton.textContent = 'DEMOS';

  // ── floating panel ───────────────────────────────────────────────────
  const panel = document.createElement('section');
  panel.className = 'demos-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Demo player');
  panel.dataset.open = 'false';

  panel.innerHTML = `
    <header class="demos-head">
      <h2>Demos</h2>
      <button type="button" class="demos-close" aria-label="Close demos panel">×</button>
    </header>
    <div class="demos-body">
      <div class="demos-list">
        <h3 class="demos-section-title">In style</h3>
        <ul class="demos-section" data-category="style"></ul>
        <h3 class="demos-section-title">Classical (public domain)</h3>
        <ul class="demos-section" data-category="classical"></ul>
        <h3 class="demos-section-title">Technical</h3>
        <ul class="demos-section" data-category="technical"></ul>
      </div>
      <footer class="demos-transport">
        <div class="demos-now-line"><span class="demos-now-label">Now playing:</span>&nbsp;<span class="demos-now-title">—</span></div>
        <div class="demos-buttons">
          <button type="button" class="panel-switch sm demos-play" disabled><span class="panel-switch-led"></span><span class="panel-switch-label">PLAY</span></button>
          <button type="button" class="panel-switch sm demos-pause" disabled><span class="panel-switch-label">PAUSE</span></button>
          <button type="button" class="panel-switch sm demos-stop" disabled><span class="panel-switch-label">STOP</span></button>
          <button type="button" class="panel-switch sm demos-prev" disabled><span class="panel-switch-label">PREV</span></button>
          <button type="button" class="panel-switch sm demos-next" disabled><span class="panel-switch-label">NEXT</span></button>
        </div>
        <div class="demos-progress-row">
          <div class="demos-progress"><div class="demos-progress-fill"></div></div>
          <span class="demos-time">0:00 / 0:00</span>
        </div>
        <div class="demos-caption">—</div>
        <div class="demos-credits">—</div>
      </footer>
    </div>
  `;

  // Populate the demo lists
  const sections = panel.querySelectorAll<HTMLUListElement>('.demos-section');
  for (const ul of sections) {
    const cat = ul.dataset.category;
    for (const demo of DEMOS) {
      if (demo.category !== cat) continue;
      const li = document.createElement('li');
      li.className = 'demos-row';
      li.innerHTML = `
        <span class="demos-row-title">${demo.title}</span>
        <button type="button" class="panel-switch sm demos-row-play" data-id="${demo.id}">
          <span class="panel-switch-led"></span><span class="panel-switch-label">PLAY</span>
        </button>
      `;
      ul.appendChild(li);
    }
  }

  const playBtn = panel.querySelector('.demos-play') as HTMLButtonElement;
  const pauseBtn = panel.querySelector('.demos-pause') as HTMLButtonElement;
  const stopBtn = panel.querySelector('.demos-stop') as HTMLButtonElement;
  const prevBtn = panel.querySelector('.demos-prev') as HTMLButtonElement;
  const nextBtn = panel.querySelector('.demos-next') as HTMLButtonElement;
  const progressFill = panel.querySelector('.demos-progress-fill') as HTMLElement;
  const timeEl = panel.querySelector('.demos-time') as HTMLElement;
  const captionEl = panel.querySelector('.demos-caption') as HTMLElement;
  const creditsEl = panel.querySelector('.demos-credits') as HTMLElement;
  const nowTitleEl = panel.querySelector('.demos-now-title') as HTMLElement;
  const closeBtn = panel.querySelector('.demos-close') as HTMLButtonElement;

  function setTransportEnabled(enabled: boolean): void {
    const demo = player.currentDemo;
    playBtn.disabled = !enabled;
    pauseBtn.disabled = !enabled;
    stopBtn.disabled = !enabled;
    prevBtn.disabled = !enabled || !demo?.isLong;
    nextBtn.disabled = !enabled || !demo?.isLong;
  }

  function refreshButtons(): void {
    playBtn.dataset.active = String(player.isPlaying);
    pauseBtn.dataset.active = String(player.getState() === 'paused');
  }

  function refreshCaption(time: number): void {
    const demo = player.currentDemo;
    if (!demo) {
      captionEl.textContent = '—';
      return;
    }
    if (demo.id === 'filter-workout') {
      captionEl.textContent = captionForFilterWorkout(time);
      return;
    }
    if (demo.isLong) {
      // Find the most recent preset marker.
      let activePresetNumber = demo.defaultPreset;
      for (const ev of demo.events) {
        if (ev.type === 'preset' && typeof ev.presetNumber === 'number' && ev.time <= time) {
          activePresetNumber = ev.presetNumber;
        } else if (ev.time > time) break;
      }
      const p = presetBank.get(activePresetNumber);
      captionEl.textContent = `Now: preset ${activePresetNumber.toString().padStart(2, '0')} — ${p.name}`;
      return;
    }
    captionEl.textContent = '—';
  }

  // ── player → UI subscriptions ────────────────────────────────────────
  player.onProgress((info: ProgressInfo) => {
    progressFill.style.width = `${info.fraction * 100}%`;
    timeEl.textContent = `${formatTime(info.currentTime)} / ${formatTime(info.duration)}`;
    refreshCaption(info.currentTime);
  });
  player.onStateChange(() => refreshButtons());
  player.onEnd(() => {
    progressFill.style.width = '100%';
    timeEl.textContent = `${formatTime(player.currentDemo?.durationSec ?? 0)} / ${formatTime(player.currentDemo?.durationSec ?? 0)}`;
  });

  // ── interactions ─────────────────────────────────────────────────────
  function loadAndPlay(demo: Demo): void {
    player.load(demo);
    nowTitleEl.textContent = demo.title;
    creditsEl.textContent = demo.credits ?? '';
    setTransportEnabled(true);
    player.play();
    refreshButtons();
  }

  panel.addEventListener('click', (ev) => {
    const target = ev.target as HTMLElement;
    const rowBtn = target.closest<HTMLButtonElement>('.demos-row-play');
    if (!rowBtn) return;
    const id = rowBtn.dataset.id;
    const demo = DEMOS.find((d) => d.id === id);
    if (demo) loadAndPlay(demo);
  });

  playBtn.addEventListener('click', () => {
    if (player.getState() === 'paused') player.play();
    else if (player.currentDemo) player.play();
    refreshButtons();
  });
  pauseBtn.addEventListener('click', () => {
    player.pause();
    refreshButtons();
  });
  stopBtn.addEventListener('click', () => {
    player.stop();
    refreshButtons();
    progressFill.style.width = '0%';
  });
  prevBtn.addEventListener('click', () => {
    player.prev();
  });
  nextBtn.addEventListener('click', () => {
    player.next();
  });
  closeBtn.addEventListener('click', () => closePanel());

  // ── open/close + keyboard ────────────────────────────────────────────
  function openPanel(): void {
    panel.dataset.open = 'true';
    triggerButton.dataset.active = 'true';
    window.addEventListener('keydown', handleKey);
  }
  function closePanel(): void {
    panel.dataset.open = 'false';
    triggerButton.dataset.active = 'false';
    window.removeEventListener('keydown', handleKey);
  }

  function handleKey(ev: KeyboardEvent): void {
    if (!isInputFocus(ev.target)) {
      if (ev.code === 'Space' && player.currentDemo) {
        ev.preventDefault();
        if (player.isPlaying) player.pause();
        else player.play();
        refreshButtons();
      } else if (ev.code === 'Escape') {
        player.stop();
        refreshButtons();
        progressFill.style.width = '0%';
      } else if (ev.code === 'ArrowLeft' && player.currentDemo?.isLong) {
        ev.preventDefault();
        player.prev();
      } else if (ev.code === 'ArrowRight' && player.currentDemo?.isLong) {
        ev.preventDefault();
        player.next();
      }
    }
  }

  triggerButton.addEventListener('click', () => {
    if (panel.dataset.open === 'true') closePanel();
    else openPanel();
  });

  return {
    triggerButton,
    panel,
    open: openPanel,
    close: closePanel,
    isOpen: () => panel.dataset.open === 'true',
    playDemo(demo: Demo): void {
      openPanel();
      loadAndPlay(demo);
    },
  };
}

function isInputFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

