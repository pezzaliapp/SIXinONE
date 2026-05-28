/**
 * Live transmitter — play a modulated Float32Array through the speakers
 * via a one-shot AudioBufferSourceNode. Exposes progress events so the
 * cassette UI can update the progress bar / display in lockstep with the
 * actual audio playhead.
 *
 * The transmitter creates its own audio path (separate from the synth's
 * voice graph) so a live transmission doesn't mute when the synth panics
 * and so the user's main volume control still applies.
 */

import { getAudioContext, getMasterBus } from '../context';

export interface TransmitterCallbacks {
  /** Fires while audio plays — `fraction` ∈ [0, 1]. */
  onProgress?: (fraction: number, elapsedSec: number) => void;
  /** Fires when the buffer finishes playback. */
  onComplete?: () => void;
}

export interface ActiveTransmission {
  stop(): void;
  /** Total length of the audio in seconds. */
  durationSec: number;
}

export function transmit(pcm: Float32Array, callbacks: TransmitterCallbacks = {}): ActiveTransmission {
  const ctx = getAudioContext();
  const buf = ctx.createBuffer(1, pcm.length, ctx.sampleRate);
  buf.getChannelData(0).set(pcm);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  // Keep the carrier below the master bus volume — too loud risks
  // overdriving the user's amp + couples back into the mic if you're using
  // the same machine to record. 0.8 leaves comfortable headroom.
  gain.gain.value = 0.8;
  src.connect(gain);
  gain.connect(getMasterBus());

  const startedAt = ctx.currentTime;
  const durationSec = buf.duration;
  let cancelled = false;
  let rafHandle: number | null = null;

  const loop = (): void => {
    if (cancelled) return;
    const elapsed = ctx.currentTime - startedAt;
    const fraction = Math.min(1, elapsed / durationSec);
    callbacks.onProgress?.(fraction, elapsed);
    if (fraction < 1) {
      rafHandle = requestAnimationFrame(loop);
    } else {
      callbacks.onComplete?.();
    }
  };

  src.onended = (): void => {
    cancelled = true;
    if (rafHandle !== null) cancelAnimationFrame(rafHandle);
    callbacks.onComplete?.();
  };

  src.start();
  rafHandle = requestAnimationFrame(loop);

  return {
    stop(): void {
      cancelled = true;
      if (rafHandle !== null) cancelAnimationFrame(rafHandle);
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        /* already disconnected */
      }
    },
    durationSec,
  };
}
