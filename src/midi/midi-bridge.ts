/**
 * Web MIDI bridge.
 *
 * Hooks the OS-level MIDI hardware into our synth and lets us send the
 * virtual-keyboard's note events back out to any selected output.
 * Routing semantics:
 *   - IN  : selected input port → parsed → dispatched to listeners
 *   - OUT : sendXxx() methods publish to the selected output
 *   - THRU: when enabled, raw input bytes are forwarded to the output
 *
 * Channel filtering: the bridge listens on `channel` only (1..16). 0
 * means "omni" — accept any channel.
 *
 * Permission is requested lazily on `request()`; browsers without Web
 * MIDI (Safari ≤16) get a clear "unsupported" status.
 */

import type { MidiMessage } from './messages';
import { parseMidi } from './messages';
import {
  encodeCC,
  encodeNoteOff,
  encodeNoteOn,
  encodePitchBend,
  encodeProgramChange,
} from './messages';

export interface MidiPort {
  id: string;
  name: string;
}

export type MidiStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export type MidiListener = (msg: MidiMessage) => void;

export class MidiBridge {
  private access: MIDIAccess | null = null;
  private input: MIDIInput | null = null;
  private output: MIDIOutput | null = null;
  private channel = 0; // 0 = omni
  private thru = false;
  private listeners = new Set<MidiListener>();
  private status: MidiStatus = 'idle';
  private statusListeners = new Set<(s: MidiStatus) => void>();

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  }

  getStatus(): MidiStatus {
    return this.status;
  }

  onStatusChange(cb: (s: MidiStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(s: MidiStatus): void {
    this.status = s;
    for (const cb of this.statusListeners) cb(s);
  }

  async request(): Promise<boolean> {
    if (!this.isSupported()) {
      this.setStatus('unsupported');
      return false;
    }
    this.setStatus('requesting');
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.setStatus('granted');
      this.access.onstatechange = () => {
        // Re-render device lists on hot plug/unplug; UI subscribes via onPortsChanged.
        for (const cb of this.portsListeners) cb();
      };
      return true;
    } catch {
      this.setStatus('denied');
      return false;
    }
  }

  private portsListeners = new Set<() => void>();
  onPortsChanged(cb: () => void): () => void {
    this.portsListeners.add(cb);
    return () => this.portsListeners.delete(cb);
  }

  listInputs(): MidiPort[] {
    if (!this.access) return [];
    return Array.from(this.access.inputs.values()).map((i) => ({ id: i.id, name: i.name ?? i.id }));
  }
  listOutputs(): MidiPort[] {
    if (!this.access) return [];
    return Array.from(this.access.outputs.values()).map((o) => ({ id: o.id, name: o.name ?? o.id }));
  }

  selectInput(id: string | null): void {
    if (this.input) {
      this.input.onmidimessage = null;
    }
    if (!this.access || !id) {
      this.input = null;
      return;
    }
    this.input = this.access.inputs.get(id) ?? null;
    if (this.input) {
      this.input.onmidimessage = (e: MIDIMessageEvent) => this.handleInput(e);
    }
  }

  selectOutput(id: string | null): void {
    if (!this.access || !id) {
      this.output = null;
      return;
    }
    this.output = this.access.outputs.get(id) ?? null;
  }

  setChannel(channel: number): void {
    this.channel = Math.max(0, Math.min(16, channel));
  }

  setThru(enabled: boolean): void {
    this.thru = enabled;
  }

  subscribe(listener: MidiListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleInput(e: MIDIMessageEvent): void {
    const data = e.data;
    if (!data || data.length === 0) return;
    if (this.thru && this.output) {
      try {
        this.output.send(data);
      } catch {
        /* ignore */
      }
    }
    const msg = parseMidi(data);
    if (!msg) return;
    // Channel filter: 0 = omni
    if (this.channel !== 0 && msg.channel !== this.channel - 1) return;
    for (const l of this.listeners) l(msg);
  }

  // ---- outbound helpers ----
  sendNoteOn(note: number, velocity = 100): void {
    if (!this.output) return;
    this.output.send(encodeNoteOn(this.channel === 0 ? 0 : this.channel - 1, note, velocity));
  }
  sendNoteOff(note: number): void {
    if (!this.output) return;
    this.output.send(encodeNoteOff(this.channel === 0 ? 0 : this.channel - 1, note));
  }
  sendCC(controller: number, value: number): void {
    if (!this.output) return;
    this.output.send(encodeCC(this.channel === 0 ? 0 : this.channel - 1, controller, value));
  }
  sendPitchBend(value: number): void {
    if (!this.output) return;
    this.output.send(encodePitchBend(this.channel === 0 ? 0 : this.channel - 1, value));
  }
  sendProgramChange(number: number): void {
    if (!this.output) return;
    this.output.send(encodeProgramChange(this.channel === 0 ? 0 : this.channel - 1, number));
  }
}

export const midiBridge = new MidiBridge();
