import type { BaseEvent } from '@ag-ui/core';

const EMPTY_UI = /^\s*\{\s*"ui"\s*:\s*\[\s*\]\s*\}\s*$/;

export interface EmptyUiRetryOptions {
  /** Total attempts, including the first. */
  readonly attempts?: number;
  readonly onRetry?: (attempt: number) => void;
}

function isEmptyUi(events: readonly BaseEvent[]): boolean {
  const text = events
    .filter((event) => event.type === 'TEXT_MESSAGE_CONTENT')
    .map((event) => String((event as { delta?: unknown }).delta ?? ''))
    .join('');
  return EMPTY_UI.test(text);
}

/**
 * Small local models sometimes answer a generative UI request with `{"ui":[]}`, the cheapest
 * output the schema allows. Such a reply is short and quick, so the run is buffered and, when it
 * turns out empty, started again before anything reaches the browser.
 */
export async function* retryEmptyUi(
  start: () => AsyncIterable<BaseEvent>,
  { attempts = 3, onRetry }: EmptyUiRetryOptions = {},
): AsyncIterable<BaseEvent> {
  for (let attempt = 1; ; attempt += 1) {
    const events: BaseEvent[] = [];
    for await (const event of start()) {
      events.push(event);
    }
    if (attempt < attempts && isEmptyUi(events)) {
      onRetry?.(attempt);
      continue;
    }
    yield* events;
    return;
  }
}
