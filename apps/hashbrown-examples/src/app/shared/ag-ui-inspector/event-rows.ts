import type { InspectedEvent } from './ag-ui-inspector';

export const EVENT_CATEGORIES = ['run', 'text', 'tool', 'reasoning', 'state', 'other'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface EventRow {
  readonly key: number;
  readonly at: number;
  readonly type: string;
  readonly category: EventCategory;
  /** How many consecutive delta events were folded into this row. */
  readonly count: number;
  readonly summary: string;
  readonly payload: unknown;
}

const SUMMARY_LIMIT = 240;

/** Streaming events whose consecutive repeats read better as one row. */
const DELTA_TYPES = new Set([
  'TEXT_MESSAGE_CONTENT',
  'TOOL_CALL_ARGS',
  'REASONING_MESSAGE_CONTENT',
  'THINKING_TEXT_MESSAGE_CONTENT',
]);

export function categorize(type: string): EventCategory {
  if (type.startsWith('RUN_') || type.startsWith('STEP_')) {
    return 'run';
  }
  if (type.startsWith('TEXT_MESSAGE_')) {
    return 'text';
  }
  if (type.startsWith('TOOL_CALL_')) {
    return 'tool';
  }
  if (type.startsWith('REASONING') || type.startsWith('THINKING')) {
    return 'reasoning';
  }
  if (type.startsWith('STATE_') || type.startsWith('MESSAGES_')) {
    return 'state';
  }
  return 'other';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);
}

function truncate(value: string): string {
  return value.length > SUMMARY_LIMIT ? `${value.slice(0, SUMMARY_LIMIT)}…` : value;
}

export function summarize(type: string, payload: Readonly<Record<string, unknown>>): string {
  switch (type) {
    case 'TEXT_MESSAGE_CONTENT':
    case 'TOOL_CALL_ARGS':
    case 'REASONING_MESSAGE_CONTENT':
    case 'THINKING_TEXT_MESSAGE_CONTENT':
      return truncate(text(payload['delta']));
    case 'TEXT_MESSAGE_START':
      return text(payload['role']);
    case 'TOOL_CALL_START':
      return `${text(payload['toolCallName'])}(…)`;
    case 'TOOL_CALL_RESULT':
      return truncate(text(payload['content']));
    case 'RUN_ERROR':
      return truncate(text(payload['message']));
    case 'RUN_STARTED':
    case 'RUN_FINISHED':
      return `run ${text(payload['runId']).slice(0, 8)}`;
    default: {
      const rest = { ...payload };
      delete rest['timestamp'];
      delete rest['rawEvent'];
      return truncate(Object.keys(rest).length ? JSON.stringify(rest) : '');
    }
  }
}

function sameStream(a: InspectedEvent, b: InspectedEvent): boolean {
  return (
    a.type === b.type &&
    DELTA_TYPES.has(a.type) &&
    a.payload['messageId'] === b.payload['messageId'] &&
    a.payload['toolCallId'] === b.payload['toolCallId']
  );
}

/** Turns the raw event list into display rows, optionally folding runs of deltas into one row. */
export function toRows(events: readonly InspectedEvent[], collapseDeltas: boolean): EventRow[] {
  const rows: EventRow[] = [];
  let group: InspectedEvent[] = [];

  const flush = (): void => {
    if (group.length === 0) {
      return;
    }
    const [first] = group;
    const delta = group.map((event) => text(event.payload['delta'])).join('');
    const payload = group.length > 1 ? { ...first.payload, delta } : first.payload;
    rows.push({
      key: first.seq,
      at: first.at,
      type: first.type,
      category: categorize(first.type),
      count: group.length,
      summary: group.length > 1 ? truncate(delta) : summarize(first.type, first.payload),
      payload,
    });
    group = [];
  };

  for (const event of events) {
    if (collapseDeltas && group.length > 0 && sameStream(group[0], event)) {
      group.push(event);
      continue;
    }
    flush();
    group = [event];
  }
  flush();
  return rows;
}
