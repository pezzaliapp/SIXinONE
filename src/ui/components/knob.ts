/**
 * SVG knob — vertical-drag interaction, mirrors the panel of a real
 * Memorymoog: black body, white indicator line. Returns a HTMLElement
 * that wraps the SVG plus an accessible label + value readout.
 *
 * Interaction:
 *   - mouse / touch drag vertically: 200 px = full sweep
 *   - Shift modifier: 4× slower
 *   - double-click: reset to default
 *   - wheel: step ±0.1 (Shift: ±0.01)
 *
 * Value is always in the 0..10 panel range. The `onChange` callback fires
 * during drag with the live value; callers should debounce side-effects
 * if needed (e.g., editing live voice cutoff).
 */

export interface KnobOptions {
  label: string;
  value: number; // 0..10
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  detents?: number[]; // values where the knob "clicks"
  unit?: string;
  size?: number; // px
  onChange: (value: number) => void;
}

export interface KnobHandle {
  element: HTMLElement;
  set(value: number): void;
  destroy(): void;
}

const TWO_PI = Math.PI * 2;
const START_ANGLE_RAD = (-225 * Math.PI) / 180;
const END_ANGLE_RAD = (45 * Math.PI) / 180;
const SWEEP = END_ANGLE_RAD - START_ANGLE_RAD;

export function createKnob(opts: KnobOptions): KnobHandle {
  const min = opts.min ?? 0;
  const max = opts.max ?? 10;
  const step = opts.step ?? 0.01;
  const size = opts.size ?? 56;
  const def = opts.defaultValue ?? opts.value;
  let value = clamp(opts.value, min, max);

  const root = document.createElement('div');
  root.className = 'knob';
  root.style.setProperty('--knob-size', `${size}px`);

  const labelEl = document.createElement('div');
  labelEl.className = 'knob-label';
  labelEl.textContent = opts.label;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'knob-svg');
  svg.setAttribute('role', 'slider');
  svg.setAttribute('aria-label', opts.label);
  svg.setAttribute('aria-valuemin', String(min));
  svg.setAttribute('aria-valuemax', String(max));
  svg.setAttribute('tabindex', '0');

  const ring = document.createElementNS(svgNS, 'circle');
  ring.setAttribute('cx', '50');
  ring.setAttribute('cy', '50');
  ring.setAttribute('r', '40');
  ring.setAttribute('class', 'knob-ring');
  svg.appendChild(ring);

  const body = document.createElementNS(svgNS, 'circle');
  body.setAttribute('cx', '50');
  body.setAttribute('cy', '50');
  body.setAttribute('r', '32');
  body.setAttribute('class', 'knob-body');
  svg.appendChild(body);

  const indicator = document.createElementNS(svgNS, 'line');
  indicator.setAttribute('class', 'knob-indicator');
  indicator.setAttribute('x1', '50');
  indicator.setAttribute('y1', '50');
  indicator.setAttribute('x2', '50');
  indicator.setAttribute('y2', '22');
  svg.appendChild(indicator);

  // Tick marks at min/center/max
  for (const tick of [0, 0.5, 1]) {
    const ang = START_ANGLE_RAD + SWEEP * tick;
    const x1 = 50 + Math.sin(ang + Math.PI) * 45;
    const y1 = 50 - Math.cos(ang + Math.PI) * 45;
    const x2 = 50 + Math.sin(ang + Math.PI) * 49;
    const y2 = 50 - Math.cos(ang + Math.PI) * 49;
    const tickEl = document.createElementNS(svgNS, 'line');
    tickEl.setAttribute('x1', String(x1));
    tickEl.setAttribute('y1', String(y1));
    tickEl.setAttribute('x2', String(x2));
    tickEl.setAttribute('y2', String(y2));
    tickEl.setAttribute('class', 'knob-tick');
    svg.appendChild(tickEl);
  }

  const valueEl = document.createElement('div');
  valueEl.className = 'knob-value';

  root.appendChild(labelEl);
  root.appendChild(svg);
  root.appendChild(valueEl);

  function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
  }

  function quantize(v: number): number {
    return Math.round(v / step) * step;
  }

  function applyRotation(): void {
    const t = (value - min) / (max - min);
    const ang = START_ANGLE_RAD + t * SWEEP;
    const deg = (ang * 180) / Math.PI + 90;
    body.setAttribute('transform', `rotate(${deg} 50 50)`);
    indicator.setAttribute('transform', `rotate(${deg} 50 50)`);
    svg.setAttribute('aria-valuenow', value.toFixed(2));
    valueEl.textContent = value.toFixed(1) + (opts.unit ?? '');
  }

  function setValue(next: number, fire = true): void {
    const v = clamp(quantize(next), min, max);
    if (v === value) return;
    value = v;
    applyRotation();
    if (fire) opts.onChange(value);
  }

  applyRotation();

  // ---- drag handling ----
  let dragging = false;
  let startY = 0;
  let startValue = 0;
  let pointerId: number | null = null;

  function onPointerDown(e: PointerEvent): void {
    dragging = true;
    pointerId = e.pointerId;
    startY = e.clientY;
    startValue = value;
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragging || e.pointerId !== pointerId) return;
    const dy = startY - e.clientY;
    const speed = e.shiftKey ? 0.25 : 1;
    const next = startValue + (dy / 200) * (max - min) * speed;
    setValue(next);
  }

  function onPointerUp(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    const incr = (e.shiftKey ? 0.05 : 0.2) * delta;
    setValue(value + incr);
  }

  function onDoubleClick(): void {
    setValue(def);
  }

  function onKeyDown(e: KeyboardEvent): void {
    let delta = 0;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') delta = e.shiftKey ? 0.05 : 0.2;
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') delta = e.shiftKey ? -0.05 : -0.2;
    if (e.key === 'Home') {
      setValue(min);
      return;
    }
    if (e.key === 'End') {
      setValue(max);
      return;
    }
    if (delta !== 0) {
      e.preventDefault();
      setValue(value + delta);
    }
  }

  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);
  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('dblclick', onDoubleClick);
  svg.addEventListener('keydown', onKeyDown);

  // Silence unused warning for detents (reserved for future stepped controls).
  void opts.detents;
  void TWO_PI;

  return {
    element: root,
    set(v: number) {
      setValue(v, false);
    },
    destroy() {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('dblclick', onDoubleClick);
      svg.removeEventListener('keydown', onKeyDown);
    },
  };
}
