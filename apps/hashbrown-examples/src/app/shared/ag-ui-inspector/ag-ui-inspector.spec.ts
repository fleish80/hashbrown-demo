import type { AGUIEvent } from '@ag-ui/core';
import type { Transport, TransportRequest } from '@hashbrownai/core';
import { agUiInspector, inspectTransport } from './ag-ui-inspector';

function request(text: string, requestId = 'req-1'): TransportRequest {
  return {
    requestId,
    attempt: 1,
    maxAttempts: 1,
    signal: new AbortController().signal,
    input: {
      threadId: 't',
      runId: 'r',
      state: {},
      context: [],
      forwardedProps: {},
      tools: [{ name: 'getMetrics', description: '', parameters: {} }],
      messages: [{ id: 'u', role: 'user', content: text }],
      hashbrown: { responseSchema: {}, ui: true },
    },
  };
}

function fakeTransport(events: AGUIEvent[], fail = false): Transport {
  return {
    name: 'Fake',
    async send() {
      if (fail) {
        throw new Error('network down');
      }
      return {
        events: (async function* () {
          for (const event of events) {
            yield event;
          }
        })(),
      };
    },
  };
}

async function drain(iterable: AsyncIterable<AGUIEvent>): Promise<void> {
  for await (const _ of iterable) {
    void _;
  }
}

const RUN: AGUIEvent[] = [
  { type: 'RUN_STARTED', threadId: 't', runId: 'r' },
  { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm', delta: 'hi' },
  { type: 'RUN_FINISHED', threadId: 't', runId: 'r' },
] as AGUIEvent[];

describe('inspectTransport', () => {
  beforeEach(() => agUiInspector.clear());

  it('should record the request summary and every event, then mark the run finished', async () => {
    const transport = inspectTransport(fakeTransport(RUN));
    const response = await transport.send(request('How are we doing?'));
    expect(agUiInspector.runs()[0].status).toBe('running');

    await drain(response.events);

    const [run] = agUiInspector.runs();
    expect(run.request).toMatchObject({ lastUserMessage: 'How are we doing?', messageCount: 1, tools: ['getMetrics'], structured: true, ui: true });
    expect(run.events.map((event) => event.type)).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_CONTENT', 'RUN_FINISHED']);
    expect(run.events[1].payload).toEqual({ messageId: 'm', delta: 'hi' });
    expect(run.status).toBe('finished');
    expect(agUiInspector.eventCount()).toBe(3);
  });

  it('should mark a run as error when the stream carries RUN_ERROR', async () => {
    const transport = inspectTransport(fakeTransport([RUN[0], { type: 'RUN_ERROR', message: 'overloaded' } as AGUIEvent]));
    await drain((await transport.send(request('hi'))).events);
    expect(agUiInspector.runs()[0]).toMatchObject({ status: 'error', error: 'overloaded' });
  });

  it('should mark a run as error when the request itself fails', async () => {
    const transport = inspectTransport(fakeTransport([], true));
    await expect(transport.send(request('hi'))).rejects.toThrow('network down');
    expect(agUiInspector.runs()[0]).toMatchObject({ status: 'error', error: 'network down' });
  });

  it('should mark a run as aborted when the consumer stops reading', async () => {
    const transport = inspectTransport(fakeTransport(RUN));
    const { events } = await transport.send(request('hi'));
    for await (const _ of events) {
      void _;
      break;
    }
    expect(agUiInspector.runs()[0].status).toBe('aborted');
  });

  it('should list the newest run first', async () => {
    const transport = inspectTransport(fakeTransport(RUN));
    await drain((await transport.send(request('first', 'req-1'))).events);
    await drain((await transport.send(request('second', 'req-2'))).events);
    expect(agUiInspector.runs().map((run) => run.request.lastUserMessage)).toEqual(['second', 'first']);
  });
});
