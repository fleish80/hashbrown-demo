import type { BaseEvent } from '@ag-ui/core';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { fingerprint, type RunInput } from './fixture-key.js';
import { recordRun } from './fixture-recorder.js';
import type { RunFixture } from './run-fixture.js';

const INPUT: RunInput = {
  threadId: 't',
  runId: 'r',
  state: {},
  tools: [],
  context: [],
  forwardedProps: {},
  messages: [{ id: 'u', role: 'user', content: 'Say hi' }],
};

async function* events(last: BaseEvent['type']): AsyncIterable<BaseEvent> {
  yield { type: 'RUN_STARTED', threadId: 't', runId: 'r' } as BaseEvent;
  yield { type: last, threadId: 't', runId: 'r' } as BaseEvent;
}

async function drain(iterable: AsyncIterable<BaseEvent>): Promise<BaseEvent[]> {
  const seen: BaseEvent[] = [];
  for await (const event of iterable) {
    seen.push(event);
  }
  return seen;
}

describe('recordRun', () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(await mkdtemp(join(tmpdir(), 'record-')), 'nested');
  });

  it('should pass events through and write a fixture once the run finished', async () => {
    const seen = await drain(recordRun(dir, { provider: 'google', models: 'a,b' }, INPUT, events('RUN_FINISHED')));
    expect(seen.map((event) => event.type)).toEqual(['RUN_STARTED', 'RUN_FINISHED']);

    const [file] = await readdir(dir);
    expect(file).toMatch(/^chat-say-hi-[0-9a-f]{10}\.json$/);
    const fixture = JSON.parse(await readFile(join(dir, file), 'utf8')) as RunFixture;
    expect(fixture).toMatchObject({ version: 1, provider: 'google', models: 'a,b', fingerprint: fingerprint(INPUT) });
    expect(fixture.events).toHaveLength(2);
  });

  it('should not record a run that ended in an error', async () => {
    await drain(recordRun(dir, { provider: 'google', models: 'a' }, INPUT, events('RUN_ERROR')));
    await expect(readdir(dir)).rejects.toThrow();
  });
});
