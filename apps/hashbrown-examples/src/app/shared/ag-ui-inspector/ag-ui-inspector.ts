import { computed, signal } from '@angular/core';
import type { AGUIEvent } from '@ag-ui/core';
import {
  createHttpTransport,
  type Transport,
  type TransportRequest,
  type TransportResponse,
} from '@hashbrownai/core';

/*
 * A window onto the AG-UI protocol. Hashbrown talks to the server through a Transport: it hands
 * over the run input and gets back an async stream of AG-UI events. This module wraps the default
 * HTTP transport so every request and every event is also kept in signals for the inspector panel.
 *
 * It is a module-level store rather than an injectable one because Hashbrown invokes the transport
 * factory lazily at generation time, outside any injection context, so inject() cannot reach it.
 */

export type RunStatus = 'running' | 'finished' | 'error' | 'aborted';

export interface InspectedEvent {
  readonly seq: number;
  /** Milliseconds since the request was sent. */
  readonly at: number;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface InspectedRequest {
  readonly messageCount: number;
  readonly lastUserMessage: string;
  readonly tools: readonly string[];
  readonly structured: boolean;
  readonly ui: boolean;
  readonly body: unknown;
}

export interface InspectedRun {
  readonly id: string;
  readonly startedAt: number;
  readonly request: InspectedRequest;
  readonly events: readonly InspectedEvent[];
  readonly status: RunStatus;
  readonly error?: string;
}

const MAX_RUNS = 12;

const runs = signal<readonly InspectedRun[]>([]);
const open = signal(false);
const collapseDeltas = signal(true);

export const agUiInspector = {
  /** Newest run first. */
  runs: runs.asReadonly(),
  open: open.asReadonly(),
  collapseDeltas: collapseDeltas.asReadonly(),
  eventCount: computed(() => runs().reduce((count, run) => count + run.events.length, 0)),
  toggle(): void {
    open.update((value) => !value);
  },
  setCollapseDeltas(value: boolean): void {
    collapseDeltas.set(value);
  },
  clear(): void {
    runs.set([]);
  },
};

function summarizeRequest(input: TransportRequest['input']): InspectedRequest {
  const messages = input.messages ?? [];
  const lastUser = [...messages].reverse().find((message) => message.role === 'user');
  const content = lastUser?.content;
  return {
    messageCount: messages.length,
    lastUserMessage: typeof content === 'string' ? content : '',
    tools: (input.tools ?? []).map((tool) => tool.name),
    structured: Boolean(input.hashbrown?.responseSchema),
    ui: Boolean(input.hashbrown?.ui),
    body: input,
  };
}

function patchRun(id: string, patch: (run: InspectedRun) => InspectedRun): void {
  runs.update((list) => list.map((run) => (run.id === id ? patch(run) : run)));
}

function startRun(request: TransportRequest): InspectedRun {
  const run: InspectedRun = {
    id: `${request.requestId}#${request.attempt}`,
    startedAt: performance.now(),
    request: summarizeRequest(request.input),
    events: [],
    status: 'running',
  };
  runs.update((list) => [run, ...list].slice(0, MAX_RUNS));
  return run;
}

function recordEvent(run: InspectedRun, event: AGUIEvent): void {
  const { type, ...payload } = event;
  patchRun(run.id, (current) => ({
    ...current,
    events: [
      ...current.events,
      { seq: current.events.length + 1, at: Math.round(performance.now() - run.startedAt), type, payload },
    ],
    // Hashbrown stops reading right after the terminal event, so settle here, not after the loop.
    status: type === 'RUN_ERROR' ? 'error' : type === 'RUN_FINISHED' ? 'finished' : current.status,
    error: type === 'RUN_ERROR' ? String((payload as { message?: unknown }).message ?? '') : current.error,
  }));
}

function settleRun(id: string, status: RunStatus, error?: string): void {
  patchRun(id, (run) => (run.status === 'running' ? { ...run, status, error: error ?? run.error } : run));
}

async function* tee(source: AsyncIterable<AGUIEvent>, run: InspectedRun): AsyncIterable<AGUIEvent> {
  try {
    for await (const event of source) {
      recordEvent(run, event);
      yield event;
    }
    settleRun(run.id, 'finished');
  } catch (error) {
    settleRun(run.id, 'error', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    // Reached while still running only when the consumer stopped early (Stop button, navigation).
    settleRun(run.id, 'aborted');
  }
}

/** Wraps any transport so its requests and events show up in the inspector. */
export function inspectTransport(inner: Transport): Transport {
  return {
    name: `Inspected(${inner.name})`,
    async send(request: TransportRequest): Promise<TransportResponse> {
      const run = startRun(request);
      try {
        const response = await inner.send(request);
        return { ...response, events: tee(response.events, run) };
      } catch (error) {
        settleRun(run.id, 'error', error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
  };
}

export function createInspectedTransport(baseUrl: string): Transport {
  return inspectTransport(createHttpTransport({ baseUrl }));
}
