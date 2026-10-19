import type { BaseEvent } from '@ag-ui/core';

const RETRYABLE = /\b(429|503)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand/i;
const TIMED_OUT = Symbol('timed out');

export type FallbackReason = 'unavailable' | 'timeout';

export interface ModelFallbackOptions {
  /** How long a model may stay silent before its first output; after that the next model is tried. */
  readonly firstEventTimeoutMs?: number;
  readonly onFallback?: (failed: string, next: string, reason: FallbackReason) => void;
}

function isRetryableError(event: BaseEvent): boolean {
  return event.type === 'RUN_ERROR' && RETRYABLE.test(JSON.stringify(event));
}

function nextWithTimeout<T>(
  iterator: AsyncIterator<T>,
  ms: number,
): Promise<IteratorResult<T> | typeof TIMED_OUT> {
  const next = iterator.next();
  // The abandoned call rejects once the attempt is aborted; nobody awaits it any more.
  next.catch(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  return Promise.race([next, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Runs the first model. If it fails with a capacity error, or stays silent past the timeout,
 * before producing any output, the same run is retried on the next model. The browser never
 * sees the failed attempt. Once output has streamed, errors pass through unchanged.
 */
export async function* streamWithModelFallback(
  models: readonly string[],
  start: (model: string, attemptSignal: AbortSignal) => AsyncIterable<BaseEvent>,
  { firstEventTimeoutMs = 20_000, onFallback }: ModelFallbackOptions = {},
): AsyncGenerator<BaseEvent> {
  for (const [index, model] of models.entries()) {
    const next = models[index + 1];
    const attempt = new AbortController();
    const iterator = start(model, attempt.signal)[Symbol.asyncIterator]();
    const pending: BaseEvent[] = [];
    let committed = false;
    let retry = false;

    try {
      while (true) {
        const result =
          committed || !next ? await iterator.next() : await nextWithTimeout(iterator, firstEventTimeoutMs);

        if (result === TIMED_OUT) {
          retry = true;
          attempt.abort();
          onFallback?.(model, next ?? model, 'timeout');
          break;
        }
        if (result.done) {
          break;
        }

        const event = result.value;
        if (committed) {
          yield event;
          continue;
        }
        if (event.type === 'RUN_STARTED') {
          pending.push(event);
          continue;
        }
        if (next && isRetryableError(event)) {
          retry = true;
          attempt.abort();
          onFallback?.(model, next, 'unavailable');
          break;
        }
        committed = true;
        yield* pending;
        yield event;
      }
    } finally {
      if (retry) {
        void iterator.return?.()?.catch(() => undefined);
      }
    }

    if (!retry) {
      if (!committed) {
        yield* pending;
      }
      return;
    }
  }
}
