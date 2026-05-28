/**
 * WAV encoder — Float32Array PCM → `.wav` Blob (RIFF/WAVE, 16-bit mono).
 *
 * The cassette modem produces a Float32Array in [-1, +1]; this packs it
 * into a standard PCM WAV file that the browser can later read back via
 * `AudioContext.decodeAudioData`. No `wavefile` dependency, no Tone.js —
 * one DataView, ~50 lines.
 */

const RIFF = 0x52494646; // 'RIFF'
const WAVE = 0x57415645; // 'WAVE'
const FMT_ = 0x666d7420; // 'fmt '
const DATA = 0x64617461; // 'data'

export function encodeWav(pcm: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const numChannels = 1;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataLength = pcm.length * bytesPerSample;

  // RIFF header (12) + fmt chunk (24) + data chunk header (8) + data.
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, RIFF, false);
  view.setUint32(4, 36 + dataLength, true); // chunk size
  view.setUint32(8, WAVE, false);

  // fmt sub-chunk
  view.setUint32(12, FMT_, false);
  view.setUint32(16, 16, true); // sub-chunk size (PCM)
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  view.setUint32(36, DATA, false);
  view.setUint32(40, dataLength, true);

  // PCM samples — clamp + quantise.
  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    let s = pcm[i]!;
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    const v = Math.round(s * 0x7fff);
    view.setInt16(offset, v, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/** Convenience helper for the "REC → file download" path. */
export function downloadWav(pcm: Float32Array, sampleRate: number, filename: string): void {
  const blob = encodeWav(pcm, sampleRate);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
