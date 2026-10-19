import { computed, Resource, ResourceStatus, signal } from '@angular/core';
import { latchResourceValue } from './latch-resource-value';

function fakeResource<T>(value: T) {
  const status = signal<ResourceStatus>('resolved');
  const current = signal<T>(value);
  const resource = {
    status,
    error: computed(() => (status() === 'error' ? new Error('boom') : undefined)),
    isLoading: computed(() => status() === 'loading'),
    hasValue: () => status() !== 'error',
    value: computed(() => {
      if (status() === 'error') {
        throw new Error('boom');
      }
      return current();
    }),
  } as unknown as Resource<T>;
  return { resource, status, current };
}

describe('latchResourceValue', () => {
  it('should keep the last good value while the resource is in error', () => {
    const { resource, status, current } = fakeResource<string[]>(['a']);
    const latched = latchResourceValue(resource, []);
    expect(latched()).toEqual(['a']);

    status.set('error');
    expect(latched()).toEqual(['a']);

    status.set('resolved');
    current.set(['a', 'b']);
    expect(latched()).toEqual(['a', 'b']);
  });

  it('should fall back to the initial value when it errors before resolving', () => {
    const { resource, status } = fakeResource<string[]>(['a']);
    status.set('error');
    expect(latchResourceValue(resource, [])()).toEqual([]);
  });
});
