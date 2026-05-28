/**
 * WAV decoder — File / Blob / ArrayBuffer → mono Float32Array.
 *
 * Reuses the browser's `AudioContext.decodeAudioData`: it handles any WAV
 * (or any other browser-supported audio format) without us having to write
 * a RIFF parser. The receiver downmixes to mono by summing channels.
 *
 * If the AudioContext sample rate doesn't match the source WAV's sample
 * rate, the decoder linearly resamples to match the modem's expectation
 * (44100 by default).
 */

export interface DecodedAudio {
  pcm: Float32Array;
  sampleRate: number;
}

export async function decodeWavFile(
  file: File | Blob | ArrayBuffer,
): Promise<DecodedAudio> {
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const AC = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) throw new Error('Web Audio API unavailable');
  // Use a short-lived OfflineAudioContext for decoding — it's GCed when
  // we drop the reference, and doesn't require the user-gesture dance.
  const tmpCtx = new AC({ sampleRate: 44100 });
  try {
    const decoded = await tmpCtx.decodeAudioData(buf.slice(0));
    // Downmix to mono.
    const channels = decoded.numberOfChannels;
    const length = decoded.length;
    const out = new Float32Array(length);
    for (let ch = 0; ch < channels; ch++) {
      const data = decoded.getChannelData(ch);
      for (let i = 0; i < length; i++) out[i]! += data[i]! / channels;
    }
    return { pcm: out, sampleRate: decoded.sampleRate };
  } finally {
    void tmpCtx.close().catch(() => undefined);
  }
}
