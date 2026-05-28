/**
 * 100 Presets Tour — programmatic walkthrough of the full factory bank,
 * playing each preset for ~2 seconds with a category-appropriate phrase.
 *
 * Categorisation falls back to preset.name keywords (more granular than
 * preset.category) so e.g. "Sync" presets play a lead phrase rather than
 * the generic "SYNTH" pad chord.
 *
 * The demo is marked isLong → the panel UI enables PREV/NEXT to jump
 * between preset markers.
 */

import type { Demo, DemoEvent } from '../demos';
import { chord, note } from './_helpers';
import { presetBank } from '../preset-bank';

const SLOT_SECONDS = 2;

type Pattern = 'pad' | 'bass' | 'bell' | 'effect' | 'lead' | 'organ' | 'clav' | 'string' | 'brass';

function classify(presetNumber: number): Pattern {
  const p = presetBank.get(presetNumber);
  const name = p.name.toLowerCase();
  if (name.includes('clav')) return 'clav';
  if (name.includes('sync') || name.includes('lead') || name.includes('mono') === false && name.includes('sweep') === false && name.includes('q ')) {
    if (name.includes('sync') || name.includes('lead')) return 'lead';
  }
  if (name.includes('sync') || name.includes('lead')) return 'lead';
  if (name.includes('bell') || name.includes('vibe') || name.includes('chime') || name.includes('celeste') || name.includes('harp')) return 'bell';
  if (p.category === 'STRINGS' || name.includes('string')) return 'string';
  if (p.category === 'BRASS' || name.includes('brass')) return 'brass';
  if (name.includes('organ')) return 'organ';
  if (p.mono || name.includes('mono') || name.includes('bass')) return 'bass';
  if (p.category === 'EFFECTS') return 'effect';
  return 'pad';
}

function emitSlot(events: DemoEvent[], t: number, presetNumber: number): void {
  events.push({ time: t, type: 'preset', presetNumber });
  const playAt = t + 0.05;
  const pattern = classify(presetNumber);
  switch (pattern) {
    case 'string':
    case 'brass':
    case 'pad': {
      // Sustained C major triad.
      chord(events, playAt, [60, 64, 67], SLOT_SECONDS - 0.2, 0.85);
      break;
    }
    case 'bass': {
      note(events, playAt, 40, SLOT_SECONDS - 0.8, 0.95);
      break;
    }
    case 'bell': {
      // Staccato C5 twice with a small gap.
      note(events, playAt, 72, 0.45, 0.95);
      note(events, playAt + 0.8, 72, 0.45, 0.95);
      break;
    }
    case 'effect': {
      note(events, playAt, 69, SLOT_SECONDS - 0.2, 0.9);
      break;
    }
    case 'lead': {
      note(events, playAt, 79, SLOT_SECONDS - 0.25, 0.95);
      break;
    }
    case 'organ': {
      chord(events, playAt, [62, 66, 69], SLOT_SECONDS - 0.2, 0.85);
      break;
    }
    case 'clav': {
      // Rhythmic C4 staccato.
      for (let i = 0; i < 4; i++) {
        note(events, playAt + i * 0.45, 60, 0.25, 0.9);
      }
      break;
    }
  }
}

function build(): Demo {
  const events: DemoEvent[] = [];
  for (let n = 0; n < 100; n++) {
    emitSlot(events, n * SLOT_SECONDS, n);
  }
  events.sort((a, b) => a.time - b.time);

  return {
    id: 'presets-tour-100',
    title: '100 Presets Tour',
    description: 'Every factory preset plays in turn for two seconds.',
    category: 'technical',
    defaultPreset: 0,
    durationSec: 100 * SLOT_SECONDS,
    bpm: 60,
    events,
    isLong: true,
    credits: 'Tour of the SIXinONE factory bank.',
  };
}

export const presetsTour: Demo = build();
