import { linkedSignal, Resource, Signal } from '@angular/core';

/**
 * Reads a resource's value without throwing: in the error state it keeps the last good value.
 *
 * Angular resources throw from value() while status() is 'error'. linkedSignal remembers its
 * previous result, so on an error it hands back the last conversation instead of throwing.
 */
export function latchResourceValue<T>(resource: Resource<T>, initial: T): Signal<T> {
  return linkedSignal<{ ok: boolean; value?: T }, T>({
    source: () =>
      resource.status() === 'error' ? { ok: false } : { ok: true, value: resource.value() },
    computation: (current, previous) =>
      current.ok ? (current.value as T) : (previous?.value ?? initial),
  }).asReadonly();
}
