/**
 * ADSR envelope helpers — applied directly to AudioParam values via the
 * Web Audio scheduling API. Two flavours:
 *   - `applyAttackDecay`: schedules attack ramp from 0 → peak then a decay
 *     curve toward `peak * sustainLevel`.
 *   - `applyRelease`: schedules release ramp from current value → 0.
 *
 * Time arguments are in seconds. `peak` is the absolute envelope output at
 * the top of the attack (1.0 for VCA; cutoff offset for filter).
 */

import type { FilterState, VcaState } from '../data/preset';
import {
  attackSeconds,
  decayReleaseSeconds,
  sustainLevel,
} from '../data/preset-scales';

const MIN_RAMP = 0.0005;

export interface AdsrTimes {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export function vcaTimes(v: VcaState): AdsrTimes {
  return {
    attack: attackSeconds(v.attack),
    decay: decayReleaseSeconds(v.decay),
    sustain: sustainLevel(v.sustain),
    release: decayReleaseSeconds(v.release),
  };
}

export function filterTimes(f: FilterState): AdsrTimes {
  return {
    attack: attackSeconds(f.attack),
    decay: decayReleaseSeconds(f.decay),
    sustain: sustainLevel(f.sustain),
    release: decayReleaseSeconds(f.release),
  };
}

export function applyAttackDecay(
  param: AudioParam,
  startTime: number,
  baseline: number,
  peak: number,
  env: AdsrTimes,
): number {
  param.cancelScheduledValues(startTime);
  param.setValueAtTime(baseline, startTime);
  const attackEnd = startTime + Math.max(MIN_RAMP, env.attack);
  param.linearRampToValueAtTime(peak, attackEnd);
  const decayEnd = attackEnd + Math.max(MIN_RAMP, env.decay);
  const sustainValue = baseline + (peak - baseline) * env.sustain;
  param.linearRampToValueAtTime(sustainValue, decayEnd);
  return decayEnd;
}

export function applyRelease(
  param: AudioParam,
  releaseTime: number,
  baseline: number,
  releaseSeconds: number,
): number {
  const r = Math.max(MIN_RAMP, releaseSeconds);
  param.cancelScheduledValues(releaseTime);
  // Hold current value at releaseTime, then ramp down.
  param.setValueAtTime(param.value, releaseTime);
  param.linearRampToValueAtTime(baseline, releaseTime + r);
  return releaseTime + r;
}
