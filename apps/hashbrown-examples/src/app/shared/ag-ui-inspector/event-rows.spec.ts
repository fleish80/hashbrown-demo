import type { InspectedEvent } from './ag-ui-inspector';
import { categorize, summarize, toRows } from './event-rows';

function event(seq: number, type: string, payload: Record<string, unknown> = {}): InspectedEvent {
  return { seq, at: seq * 10, type, payload };
}

const STREAM: InspectedEvent[] = [
  event(1, 'RUN_STARTED', { runId: 'run-12345678' }),
  event(2, 'TEXT_MESSAGE_START', { messageId: 'm1', role: 'assistant' }),
  event(3, 'TEXT_MESSAGE_CONTENT', { messageId: 'm1', delta: 'Hel' }),
  event(4, 'TEXT_MESSAGE_CONTENT', { messageId: 'm1', delta: 'lo' }),
  event(5, 'TEXT_MESSAGE_END', { messageId: 'm1' }),
  event(6, 'RUN_FINISHED', { runId: 'run-12345678' }),
];

describe('categorize', () => {
  it('should map event types to a category', () => {
    expect(categorize('RUN_STARTED')).toBe('run');
    expect(categorize('TEXT_MESSAGE_CONTENT')).toBe('text');
    expect(categorize('TOOL_CALL_ARGS')).toBe('tool');
    expect(categorize('REASONING_ENCRYPTED_VALUE')).toBe('reasoning');
    expect(categorize('STATE_SNAPSHOT')).toBe('state');
    expect(categorize('CUSTOM')).toBe('other');
  });
});

describe('summarize', () => {
  it('should pick the field a reader cares about', () => {
    expect(summarize('TEXT_MESSAGE_CONTENT', { delta: 'hi' })).toBe('hi');
    expect(summarize('TOOL_CALL_START', { toolCallName: 'getMetrics' })).toBe('getMetrics(…)');
    expect(summarize('RUN_STARTED', { runId: 'run-12345678' })).toBe('run run-1234');
    expect(summarize('RUN_ERROR', { message: 'boom' })).toBe('boom');
  });
});

describe('toRows', () => {
  it('should fold consecutive text deltas of one message into a single row', () => {
    const rows = toRows(STREAM, true);
    expect(rows.map((row) => row.type)).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'RUN_FINISHED']);
    const folded = rows[2];
    expect(folded.count).toBe(2);
    expect(folded.summary).toBe('Hello');
    expect(folded.payload).toEqual({ messageId: 'm1', delta: 'Hello' });
    expect(folded.key).toBe(3);
  });

  it('should keep every event when folding is off', () => {
    const rows = toRows(STREAM, false);
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.count === 1)).toBe(true);
  });

  it('should not fold deltas that belong to different messages', () => {
    const rows = toRows(
      [event(1, 'TEXT_MESSAGE_CONTENT', { messageId: 'a', delta: 'x' }), event(2, 'TEXT_MESSAGE_CONTENT', { messageId: 'b', delta: 'y' })],
      true,
    );
    expect(rows).toHaveLength(2);
  });
});
