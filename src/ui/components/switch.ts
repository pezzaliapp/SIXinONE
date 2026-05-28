/**
 * Panel button — square footprint with a red LED above it that lights when
 * the button is active. Two modes:
 *   - toggle: independent on/off
 *   - radio:  one of N (managed by `createRadioGroup`)
 *
 * The Memorymoog's destination switches (LFO Filter, OSC1 Freq etc.) are
 * multi-toggle, which `createSwitch` handles via the `toggle` mode.
 */

export interface SwitchOptions {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
  size?: 'sm' | 'md';
}

export interface SwitchHandle {
  element: HTMLElement;
  set(active: boolean, fire?: boolean): void;
  destroy(): void;
}

export function createSwitch(opts: SwitchOptions): SwitchHandle {
  let active = opts.active;
  const root = document.createElement('button');
  root.type = 'button';
  root.className = `panel-switch ${opts.size === 'sm' ? 'sm' : ''}`;
  root.setAttribute('aria-pressed', String(active));
  root.dataset.active = String(active);

  const led = document.createElement('span');
  led.className = 'panel-switch-led';
  root.appendChild(led);

  const labelEl = document.createElement('span');
  labelEl.className = 'panel-switch-label';
  labelEl.textContent = opts.label;
  root.appendChild(labelEl);

  function render(): void {
    root.setAttribute('aria-pressed', String(active));
    root.dataset.active = String(active);
  }

  function setActive(next: boolean, fire = true): void {
    if (next === active) return;
    active = next;
    render();
    if (fire) opts.onChange(active);
  }

  root.addEventListener('click', () => setActive(!active));
  render();

  return {
    element: root,
    set(value, fire = false) {
      setActive(value, fire);
    },
    destroy() {
      // Click listener cleaned up by GC when root is removed.
    },
  };
}

export interface RadioGroupOptions<V extends string | number> {
  label: string;
  options: { label: string; value: V }[];
  value: V;
  onChange: (value: V) => void;
}

export interface RadioGroupHandle<V extends string | number> {
  element: HTMLElement;
  set(value: V, fire?: boolean): void;
}

export function createRadioGroup<V extends string | number>(
  opts: RadioGroupOptions<V>,
): RadioGroupHandle<V> {
  let value = opts.value;
  const root = document.createElement('div');
  root.className = 'panel-radio';
  root.setAttribute('role', 'radiogroup');
  root.setAttribute('aria-label', opts.label);
  const groupLabel = document.createElement('span');
  groupLabel.className = 'panel-radio-label';
  groupLabel.textContent = opts.label;
  root.appendChild(groupLabel);

  const buttons: HTMLButtonElement[] = [];
  for (const o of opts.options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-switch';
    b.dataset.value = String(o.value);
    b.setAttribute('role', 'radio');
    const led = document.createElement('span');
    led.className = 'panel-switch-led';
    b.appendChild(led);
    const text = document.createElement('span');
    text.className = 'panel-switch-label';
    text.textContent = o.label;
    b.appendChild(text);
    b.addEventListener('click', () => {
      if (value !== o.value) {
        value = o.value;
        render();
        opts.onChange(value);
      }
    });
    buttons.push(b);
    root.appendChild(b);
  }

  function render(): void {
    for (const b of buttons) {
      const isActive = String(value) === b.dataset.value;
      b.setAttribute('aria-checked', String(isActive));
      b.dataset.active = String(isActive);
    }
  }

  render();

  return {
    element: root,
    set(next, fire = false) {
      if (next === value) return;
      value = next;
      render();
      if (fire) opts.onChange(value);
    },
  };
}
