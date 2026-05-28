/**
 * TypeScript wrapper around the PWM oscillator AudioWorklet.
 *
 * Responsibilities:
 *   - One-shot registration of the worklet module (idempotent).
 *   - Factory that returns an AudioWorkletNode preconfigured with the
 *     parameters Voice cares about (frequency, pulseWidth, syncReset),
 *     plus convenience helpers to set role and reset phase.
 *
 * The voice handles routing: noise/saw/tri remain native nodes; the pulse
 * layer routes through this worklet so we get a real, alias-free duty-cycle
 * variable square instead of the fixed-50% native 'square' OscillatorNode.
 */

import pwmWorkletUrl from './worklets/pwm-oscillator.js?url';

let registered = false;
let registerPromise: Promise<void> | null = null;

export async function registerPwmOscillator(ctx: BaseAudioContext): Promise<void> {
  if (registered) return;
  if (registerPromise) return registerPromise;
  registerPromise = ctx.audioWorklet.addModule(pwmWorkletUrl).then(() => {
    registered = true;
  });
  return registerPromise;
}

export function isPwmOscillatorRegistered(): boolean {
  return registered;
}

export interface PwmOscillator {
  readonly node: AudioWorkletNode;
  readonly frequency: AudioParam;
  readonly pulseWidth: AudioParam;
  /** Triggers a hard sync phase reset on the next sample (manual via port). */
  resetPhase(): void;
  /** Switch between 'master' and 'slave' modes. */
  setRole(role: 'master' | 'slave'): void;
  /**
   * Wire this oscillator's sync output (output index 1) into another
   * oscillator's sync input (input index 0) for sample-accurate hard sync.
   */
  connectSyncOutputTo(slave: PwmOscillator): void;
  start(when?: number): void;
  stop(when?: number): void;
  disconnect(): void;
}

export function createPwmOscillator(ctx: AudioContext): PwmOscillator {
  if (!registered) {
    throw new Error('pwm-oscillator worklet has not been registered yet');
  }
  const node = new AudioWorkletNode(ctx, 'pwm-oscillator', {
    numberOfInputs: 1,
    numberOfOutputs: 2,
    outputChannelCount: [1, 1],
    channelCount: 1,
    channelCountMode: 'explicit',
  });
  const frequency = node.parameters.get('frequency');
  const pulseWidth = node.parameters.get('pulseWidth');
  const syncReset = node.parameters.get('syncReset');
  if (!frequency || !pulseWidth || !syncReset) {
    throw new Error('pwm-oscillator worklet missing expected parameters');
  }

  return {
    node,
    frequency,
    pulseWidth,
    resetPhase(): void {
      try {
        node.port.postMessage({ type: 'syncReset' });
      } catch {
        /* ignore */
      }
    },
    setRole(role): void {
      try {
        node.port.postMessage({ type: 'setRole', role });
      } catch {
        /* ignore */
      }
    },
    connectSyncOutputTo(slave): void {
      // master.output[1] → slave.input[0]
      try {
        node.connect(slave.node, 1, 0);
      } catch {
        /* ignore — incompatible channel layout shouldn't happen given construction */
      }
    },
    start(_when?: number): void {
      // AudioWorkletNode has no start/stop — it runs from construction.
    },
    stop(_when?: number): void {
      /* see above */
    },
    disconnect(): void {
      try {
        node.disconnect();
      } catch {
        /* ignore */
      }
    },
  };
}
