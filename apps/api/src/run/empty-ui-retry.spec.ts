import type { BaseEvent } from '@ag-ui/core';
import { describe, expect, it, vi } from 'vitest';
import { retryEmptyUi } from './empty-ui-retry.js';

function reply(text: string): BaseEvent[] {
  return [
    { type: 'RUN_STARTED' },
    { type: 'TEXT_MESSAGE_START', messageId: 'm' },
    { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: text },
    { type: 'TEXT_MESSAGE_END', messageId: 'm' },
    { type: 'RUN_FINISHED' },
  ] as BaseEvent[];
}

async function collect(iterable: AsyncIterable<BaseEvent>): Promise<BaseEvent[]> {
  const items: BaseEvent[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

describe('retryEmptyUi', () => {
  it('should pass a non-empty answer through untouched', async () => {
    const start = vi.fn(async function* () {
      yield* reply('{"ui":[{"Markdown":{"props":{"children":"hi"}}}]}');
    });
    const events = await collect(retryEmptyUi(start));
    expect(events).toHaveLength(5);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('should start again when the answer is an empty ui list', async () => {
    const answers = ['{ "ui": [] }', '{"ui":[]}', '{"ui":[{"Markdown":{"props":{"children":"third"}}}]}'];
    const onRetry = vi.fn();
    const start = vi.fn(async function* () {
      yield* reply(answers.shift() as string);
    });
    const events = await collect(retryEmptyUi(start, { onRetry }));
    expect(start).toHaveBeenCalledTimes(3);
    expect(onRetry.mock.calls).toEqual([[1], [2]]);
    expect(events[2]).toMatchObject({ delta: expect.stringContaining('third') });
  });

  it('should give up after the last attempt and return the empty answer', async () => {
    const start = vi.fn(async function* () {
      yield* reply('{"ui":[]}');
    });
    const events = await collect(retryEmptyUi(start, { attempts: 2 }));
    expect(start).toHaveBeenCalledTimes(2);
    expect(events[2]).toMatchObject({ delta: '{"ui":[]}' });
  });
});
