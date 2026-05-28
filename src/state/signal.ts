/**
 * Minimal reactive primitive — a Signal wraps a value and notifies subscribers
 * on change. Used by the UI as a tiny store layer (no React, no Redux).
 */

export type Listener<T> = (next: T, previous: T) => void;

export class Signal<T> {
  private value: T;
  private listeners = new Set<Listener<T>>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    const prev = this.value;
    if (Object.is(prev, next)) return;
    this.value = next;
    for (const l of this.listeners) l(next, prev);
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this.value));
  }

  subscribe(listener: Listener<T>, immediate = false): () => void {
    this.listeners.add(listener);
    if (immediate) listener(this.value, this.value);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** Derives a child signal from a parent — read-only mirror. */
export function derive<T, U>(parent: Signal<T>, project: (v: T) => U): Signal<U> {
  const child = new Signal<U>(project(parent.get()));
  parent.subscribe((next) => child.set(project(next)));
  return child;
}
