/**
 * Live receiver — listens on the user's microphone, streams the audio into
 * the modem decoder, and resolves with the decoded payload (or "BAD TAPE"
 * after the timeout).
 *
 * Implementation: getUserMedia → MediaStreamAudioSourceNode →
 * ScriptProcessorNode. Each onaudioprocess callback appends samples to a
 * growing buffer. Every `RETRY_EVERY_SEC` worth of audio we re-invoke
 * `modem.decode()` on the accumulated buffer. The decoder either reports
 * `no-sync` (we keep listening) or returns a result (success or BAD TAPE).
 *
 * Why ScriptProcessor over an AudioWorklet: the modem decoder runs on the
 * main thread anyway (mutates a JS Uint8Array, schedules UI updates), so
 * adding a worklet would just move the buffer copy across an event-port
 * boundary without removing the main-thread work. ScriptProcessor is
 * deprecated but ships in every shipping browser, and the latency
 * requirements here are forgiving — we're decoding seconds at a time.
 */

import { decode, type ModemDecodeResult } from './modem';

export interface ReceiverCallbacks {
  onLevel?: (rms: number) => void;
  onState?: (state: 'listening' | 'sync' | 'checking') => void;
  onResult?: (result: ModemDecodeResult) => void;
}

export interface ActiveReception {
  stop(): void;
  readonly state: 'listening' | 'sync' | 'checking' | 'stopped';
}

const RETRY_EVERY_SEC = 0.5;
const MAX_LISTEN_SEC = 60;
const BUFFER_SIZE = 4096;

export async function listen(callbacks: ReceiverCallbacks = {}): Promise<ActiveReception> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('mic-unavailable');
  }
  // Request the microphone with as flat a processing chain as the browser
  // will let us — built-in noise suppression / AGC can chop the carrier.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    } as MediaTrackConstraints,
  });

  const AC = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    stream.getTracks().forEach((t) => t.stop());
    throw new Error('Web Audio API unavailable');
  }
  const ctx = new AC();
  const src = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
  src.connect(processor);
  // Connect to destination so the processor actually runs (browsers may
  // optimise it away otherwise). A muted sink prevents feedback howl.
  const silentSink = ctx.createGain();
  silentSink.gain.value = 0;
  processor.connect(silentSink);
  silentSink.connect(ctx.destination);

  // Growing accumulation buffer. Resize doubling to amortise allocations.
  let buf = new Float32Array(ctx.sampleRate * 4);
  let writeIdx = 0;
  let nextDecodeAt = 0;
  let stopped = false;
  let state: 'listening' | 'sync' | 'checking' | 'stopped' = 'listening';

  const startCtxTime = ctx.currentTime;
  callbacks.onState?.('listening');

  const teardown = (): void => {
    if (stopped) return;
    stopped = true;
    state = 'stopped';
    try { processor.disconnect(); } catch { /* ignore */ }
    try { silentSink.disconnect(); } catch { /* ignore */ }
    try { src.disconnect(); } catch { /* ignore */ }
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close().catch(() => undefined);
  };

  processor.onaudioprocess = (e): void => {
    if (stopped) return;
    const input = e.inputBuffer.getChannelData(0);
    // Compute RMS for the level meter.
    let sumSq = 0;
    for (let i = 0; i < input.length; i++) sumSq += input[i]! * input[i]!;
    const rms = Math.sqrt(sumSq / input.length);
    callbacks.onLevel?.(rms);

    // Append to growing buffer.
    if (writeIdx + input.length > buf.length) {
      const grown = new Float32Array(buf.length * 2);
      grown.set(buf.subarray(0, writeIdx));
      buf = grown;
    }
    buf.set(input, writeIdx);
    writeIdx += input.length;

    const elapsed = ctx.currentTime - startCtxTime;
    if (elapsed > MAX_LISTEN_SEC) {
      callbacks.onResult?.({ ok: false, reason: 'no-sync' });
      teardown();
      return;
    }

    if (elapsed >= nextDecodeAt && writeIdx > ctx.sampleRate * 2) {
      nextDecodeAt = elapsed + RETRY_EVERY_SEC;
      callbacks.onState?.('checking');
      state = 'checking';
      const slice = buf.subarray(0, writeIdx);
      const result = decode(slice, ctx.sampleRate);
      if (result.ok) {
        callbacks.onResult?.(result);
        teardown();
        return;
      }
      // Heuristic: if the decoder sees a sync word but fails CRC, we've
      // captured the whole frame — fail-loud rather than keep listening.
      if (result.reason === 'bad-checksum' || result.reason === 'bad-magic') {
        callbacks.onResult?.(result);
        teardown();
        return;
      }
      // Otherwise keep listening — most likely the frame hasn't fully
      // arrived yet (no-sync) or sample count is short.
      state = 'listening';
      callbacks.onState?.('listening');
    }
  };

  return {
    stop: teardown,
    get state() {
      return state;
    },
  };
}
