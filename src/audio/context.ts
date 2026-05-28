/**
 * AudioContext lifecycle. Browsers require a user gesture before audio can
 * start, so callers must invoke `resumeAudio()` from a click / keypress
 * handler before expecting sound.
 */

let ctx: AudioContext | null = null;
let masterBus: GainNode | null = null;

export function getAudioContext(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext;
    if (!AC) {
      throw new Error('Web Audio API is not supported in this browser');
    }
    ctx = new AC({ latencyHint: 'interactive' });
    masterBus = ctx.createGain();
    masterBus.gain.value = 0.7;
    masterBus.connect(ctx.destination);
  }
  return ctx;
}

export function getMasterBus(): GainNode {
  getAudioContext();
  if (!masterBus) {
    throw new Error('Master bus unavailable');
  }
  return masterBus;
}

export async function resumeAudio(): Promise<void> {
  const c = getAudioContext();
  if (c.state === 'suspended') {
    await c.resume();
  }
}

export function setMasterVolume(linear: number): void {
  if (!masterBus || !ctx) return;
  masterBus.gain.setTargetAtTime(linear, ctx.currentTime, 0.01);
}
