import { Test } from '@nestjs/testing';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashbrownConfig } from '../config/hashbrown.config.js';
import { fingerprint, type RunInput } from './fixture-key.js';
import { ReplayService } from './replay.service.js';
import type { RunFixture } from './run-fixture.js';

function input(text: string, runId = 'run-1'): RunInput {
  return {
    threadId: 'thread-1',
    runId,
    state: {},
    tools: [],
    context: [],
    forwardedProps: {},
    messages: [{ id: 'u', role: 'user', content: text }],
  };
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

describe('ReplayService', () => {
  let dir: string;
  let service: ReplayService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'fixtures-'));
    const fixture: RunFixture = {
      version: 1,
      recordedAt: '2026-10-19T00:00:00.000Z',
      provider: 'google',
      models: 'gemini-test',
      fingerprint: fingerprint(input('Say hi')),
      events: [
        { type: 'RUN_STARTED', threadId: 'old-thread', runId: 'old-run' },
        { type: 'TEXT_MESSAGE_START', messageId: 'm-old', role: 'assistant' },
        { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm-old', delta: 'Hi!' },
        { type: 'TEXT_MESSAGE_END', messageId: 'm-old' },
        { type: 'RUN_FINISHED', threadId: 'old-thread', runId: 'old-run' },
      ] as RunFixture['events'],
    };
    await writeFile(join(dir, 'chat-say-hi.json'), JSON.stringify(fixture));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ReplayService,
        {
          provide: hashbrownConfig.KEY,
          useValue: { provider: 'replay', model: 'recorded fixtures', fallbackModels: [], firstEventTimeoutMs: 1000, replay: { fixturesDir: dir, delayMs: 0, record: false } },
        },
      ],
    }).compile();
    service = moduleRef.get(ReplayService);
  });

  it('should replay the matching fixture with the identity of the new run', async () => {
    const events = await collect(service.stream(input('  say HI ', 'run-9'), new AbortController().signal));
    expect(events.map((event) => event.type)).toEqual(['RUN_STARTED', 'TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT', 'TEXT_MESSAGE_END', 'RUN_FINISHED']);
    expect(events[0]).toMatchObject({ threadId: 'thread-1', runId: 'run-9' });
    expect(events[4]).toMatchObject({ threadId: 'thread-1', runId: 'run-9' });
    expect(events[2]).toMatchObject({ delta: 'Hi!' });
  });

  it('should give every replay fresh message ids', async () => {
    const first = await collect(service.stream(input('Say hi'), new AbortController().signal));
    const second = await collect(service.stream(input('Say hi'), new AbortController().signal));
    const idOf = (event: object) => (event as { messageId: string }).messageId;
    expect(idOf(first[1])).not.toBe('m-old');
    expect(idOf(first[1])).toBe(idOf(first[2]));
    expect(idOf(first[1])).not.toBe(idOf(second[1]));
  });

  it('should end with RUN_ERROR when nothing was recorded for the prompt', async () => {
    const events = await collect(service.stream(input('Something new'), new AbortController().signal));
    expect(events.map((event) => event.type)).toEqual(['RUN_STARTED', 'RUN_ERROR']);
    expect(events[1]).toMatchObject({ runId: 'run-1', message: expect.stringContaining('something new') });
  });

  it('should stop early when the request is aborted', async () => {
    const controller = new AbortController();
    const events = [];
    for await (const event of service.stream(input('Say hi'), controller.signal)) {
      events.push(event);
      controller.abort();
    }
    expect(events).toHaveLength(1);
  });
});
