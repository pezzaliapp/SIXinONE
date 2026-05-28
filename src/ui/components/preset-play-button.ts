/**
 * Per-preset PLAY button — surfaces a small "▶ Demo" affordance whenever
 * the currently loaded preset is the default of an existing Demo (other
 * than the long presets tour). Click → opens the DEMOS panel + plays that
 * demo immediately.
 */

import type { Demo } from '../../data/demos';
import { findDemoForPreset } from '../../data/demos';
import { currentPreset } from '../../state/store';

export interface PresetPlayButtonHandle {
  element: HTMLElement;
}

export function createPresetPlayButton(playDemo: (demo: Demo) => void): PresetPlayButtonHandle {
  const wrap = document.createElement('div');
  wrap.className = 'preset-play-wrap';
  wrap.style.display = 'none';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'preset-play-button';
  btn.textContent = '▶ DEMO';
  btn.setAttribute('aria-label', 'Play demo for this preset');
  wrap.appendChild(btn);

  let activeDemo: Demo | undefined;

  function refresh(): void {
    const preset = currentPreset.get();
    activeDemo = findDemoForPreset(preset.number);
    if (activeDemo) {
      btn.title = `Play "${activeDemo.title}"`;
      wrap.style.display = 'inline-flex';
    } else {
      wrap.style.display = 'none';
    }
  }

  btn.addEventListener('click', () => {
    if (activeDemo) playDemo(activeDemo);
  });

  currentPreset.subscribe(refresh);
  refresh();

  return { element: wrap };
}
