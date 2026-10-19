import type { BaseEvent } from '@ag-ui/core';
import { describe, expect, it } from 'vitest';
import { streamWithModelFallback } from './model-fallback.js';

const started = { type: 'RUN_STARTED' } as BaseEvent;
const text = { type: 'TEXT_MESSAGE_CONTENT', delta: 'hi' } as BaseEvent;
const finished = { type: 'RUN_FINISHED' } as BaseEvent;
const busy = { type: 'RUN_ERROR', message: '{"code":503,"status":"UNAVAILABLE"}' } as BaseEvent;
const badRequest = { type: 'RUN_ERROR', message: '{"code":400,"status":"INVALID_ARGUMENT"}' } as BaseEvent;

async function* events(...items: BaseEvent[]) {
  yield* items;
}

/** Emits RUN_STARTED, then never produces anything until its attempt is aborted. */
async function* stalls(signal: AbortSignal) {
  yield started;
  await new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
}

async function collect(stream: AsyncIterable<BaseEvent>): Promise<string[]> {
  const types: string[] = [];
  for await (const event of stream) {
    types.push(event.type);
  }
  return types;
}

describe('streamWithModelFallback', () => {
  it('should retry on the next model when the first is unavailable', async () => {
    const tried: string[] = [];
    const runs: Record<string, BaseEvent[]> = { a: [started, busy], b: [started, text, finished] };
    const result = await collect(
      streamWithModelFallback(['a', 'b'], (model) => {
        tried.push(model);
        return events(...runs[model]);
      }),
    );
    expect(tried).toEqual(['a', 'b']);
    expect(result).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_CONTENT', 'RUN_FINISHED']);
  });

  it('should abort a silent model and retry on the next one', async () => {
    const tried: string[] = [];
    const aborted: string[] = [];
    const reasons: string[] = [];
    const result = await collect(
      streamWithModelFallback(
        ['slow', 'fast'],
        (model, signal) => {
          tried.push(model);
          signal.addEventListener('abort', () => aborted.push(model));
          return model === 'slow' ? stalls(signal) : events(started, text, finished);
        },
        { firstEventTimeoutMs: 20, onFallback: (_failed, _next, reason) => reasons.push(reason) },
      ),
    );
    expect(tried).toEqual(['slow', 'fast']);
    expect(aborted).toEqual(['slow']);
    expect(reasons).toEqual(['timeout']);
    expect(result).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_CONTENT', 'RUN_FINISHED']);
  });

  it('should not time out the last model', async () => {
    async function* slowButFine() {
      yield started;
      await new Promise((resolve) => setTimeout(resolve, 50));
      yield text;
      yield finished;
    }
    const result = await collect(
      streamWithModelFallback(['only'], () => slowButFine(), { firstEventTimeoutMs: 10 }),
    );
    expect(result).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_CONTENT', 'RUN_FINISHED']);
  });

  it('should not retry errors that are not capacity related', async () => {
    const tried: string[] = [];
    const result = await collect(
      streamWithModelFallback(['a', 'b'], (model) => {
        tried.push(model);
        return events(started, badRequest);
      }),
    );
    expect(tried).toEqual(['a']);
    expect(result).toEqual(['RUN_STARTED', 'RUN_ERROR']);
  });

  it('should surface the last error when every model is unavailable', async () => {
    const result = await collect(streamWithModelFallback(['a', 'b'], () => events(started, busy)));
    expect(result).toEqual(['RUN_STARTED', 'RUN_ERROR']);
  });

  it('should pass errors through once output has started', async () => {
    const tried: string[] = [];
    const result = await collect(
      streamWithModelFallback(['a', 'b'], (model) => {
        tried.push(model);
        return events(started, text, busy);
      }),
    );
    expect(tried).toEqual(['a']);
    expect(result).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_CONTENT', 'RUN_ERROR']);
  });
});
