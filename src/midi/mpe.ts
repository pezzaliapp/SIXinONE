/**
 * MPE (MIDI Polyphonic Expression) routing.
 *
 * Lives between the MIDI bridge and the synth. When enabled, channel-voice
 * messages are interpreted with per-note semantics: each note arrives on a
 * unique "voice channel" carrying its own pitch bend / aftertouch / CC74
 * (timbre) stream. The dedicated "master channel" carries global messages
 * (mod wheel, sustain, RPN).
 *
 * Two zones (MPE spec):
 *   - Lower zone: master = ch 1, voices = ch 2..16
 *   - Upper zone: master = ch 16, voices = ch 2..15
 *
 * Auto-detection: if pitch bends arrive on ≥ 3 distinct non-master channels
 * within MPE_DETECT_WINDOW_MS, or RPN 0,6 ("MCM" — MIDI Configuration
 * Message) arrives with a non-zero member count, MPE is auto-enabled.
 *
 * The router emits *normalised* events that the synth understands:
 *   - per-note bend in semitones (range configurable, default ±48)
 *   - per-note pressure 0..1 with the user-selected destinations
 *   - per-note timbre (CC74) 0..1 routed to filter
 *   - master-channel messages keep the existing "global" handling.
 */

import type { MidiMessage } from './messages';
import {
  CC_DATA_MSB,
  CC_RPN_LSB,
  CC_RPN_MSB,
  CC_TIMBRE,
} from './messages';

export type MpeZone = 'lower' | 'upper';

export interface MpeDestinations {
  pressureVca: boolean;
  pressureLfo: boolean;
  pressureFilter: boolean;
  timbreFilter: boolean;
}

export interface MpeConfig {
  mode: 'off' | 'auto' | 'on';
  zone: MpeZone;
  bendRange: number; // semitones; default 48
  destinations: MpeDestinations;
}

export interface MpeRouter {
  config: MpeConfig;
  setMode(mode: 'off' | 'auto' | 'on'): void;
  setZone(zone: MpeZone): void;
  setBendRange(semitones: number): void;
  setDestinations(dest: Partial<MpeDestinations>): void;
  onChange(cb: () => void): () => void;
  /** True if MPE routing is currently active (manual on, or auto-detected). */
  isActive(): boolean;
  /** Master channel index (0-indexed). */
  masterChannel(): number;
  /** Returns true if a channel index is a voice channel under the active zone. */
  isVoiceChannel(channel: number): boolean;
  /** Inspect an incoming MIDI message to update auto-detect heuristics. */
  observe(msg: MidiMessage): void;
}

export const DEFAULT_MPE_CONFIG: MpeConfig = {
  mode: 'auto',
  zone: 'lower',
  bendRange: 48,
  destinations: {
    pressureVca: true,
    pressureLfo: true,
    pressureFilter: false,
    timbreFilter: true,
  },
};

const MPE_DETECT_WINDOW_MS = 500;
const MPE_DETECT_MIN_CHANNELS = 3;

export function createMpeRouter(initial: Partial<MpeConfig> = {}): MpeRouter {
  const config: MpeConfig = {
    ...DEFAULT_MPE_CONFIG,
    ...initial,
    destinations: { ...DEFAULT_MPE_CONFIG.destinations, ...(initial.destinations ?? {}) },
  };

  const listeners = new Set<() => void>();
  const recentBendChannels = new Map<number, number>();
  let autoDetected = false;
  // RPN parsing: we only care about RPN 0,6 (MCM). Track (msb,lsb) per channel.
  const rpnState = new Map<number, { msb: number; lsb: number }>();

  const fire = (): void => {
    for (const cb of listeners) cb();
  };

  const evaluateAutoDetect = (now: number): void => {
    if (config.mode !== 'auto' || autoDetected) return;
    // Prune
    for (const [ch, t] of recentBendChannels) {
      if (now - t > MPE_DETECT_WINDOW_MS) recentBendChannels.delete(ch);
    }
    if (recentBendChannels.size >= MPE_DETECT_MIN_CHANNELS) {
      autoDetected = true;
      fire();
    }
  };

  return {
    config,
    setMode(mode): void {
      config.mode = mode;
      autoDetected = false;
      if (mode === 'off') recentBendChannels.clear();
      fire();
    },
    setZone(zone): void {
      config.zone = zone;
      fire();
    },
    setBendRange(semitones): void {
      config.bendRange = Math.max(1, Math.min(96, semitones));
      fire();
    },
    setDestinations(dest): void {
      config.destinations = { ...config.destinations, ...dest };
      fire();
    },
    onChange(cb): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isActive(): boolean {
      if (config.mode === 'on') return true;
      if (config.mode === 'off') return false;
      return autoDetected;
    },
    masterChannel(): number {
      return config.zone === 'lower' ? 0 : 15;
    },
    isVoiceChannel(channel: number): boolean {
      if (!this.isActive()) return false;
      if (config.zone === 'lower') return channel >= 1 && channel <= 15;
      // Upper zone: voices = ch 1..15 (0-indexed 0..14), master = ch 16 (15).
      return channel >= 0 && channel <= 14;
    },
    observe(msg): void {
      const master = this.masterChannel();
      if (msg.type === 'pitchBend' && msg.channel !== master) {
        recentBendChannels.set(msg.channel, performance.now());
        evaluateAutoDetect(performance.now());
      } else if (msg.type === 'cc') {
        const st = rpnState.get(msg.channel) ?? { msb: 0x7f, lsb: 0x7f };
        if (msg.controller === CC_RPN_MSB) st.msb = msg.value;
        else if (msg.controller === CC_RPN_LSB) st.lsb = msg.value;
        else if (msg.controller === CC_DATA_MSB) {
          // RPN 0,6 = MCM (MIDI Configuration Message). data MSB = voice count.
          if (st.msb === 0 && st.lsb === 6 && msg.value > 0 && config.mode === 'auto') {
            autoDetected = true;
            // The MCM was sent on the master channel; infer zone from channel.
            config.zone = msg.channel === 0 ? 'lower' : 'upper';
            fire();
          }
        } else if (msg.controller === CC_TIMBRE) {
          // No state tracking needed; just observed.
        }
        rpnState.set(msg.channel, st);
      }
    },
  };
}
