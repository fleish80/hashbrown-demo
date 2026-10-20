import type { BaseEvent } from '@ag-ui/core';
import { Logger } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fingerprint, fixtureFileName, type RunInput } from './fixture-key.js';
import type { RunFixture } from './run-fixture.js';

const logger = new Logger('FixtureRecorder');

export interface RecordingMeta {
  readonly provider: string;
  readonly models: string;
}

/**
 * Passes every event through untouched and, once the run has finished cleanly, writes the whole
 * stream to a fixture file that the replay provider can serve later. Failed or aborted runs are
 * not recorded, so a 503 never becomes the demo's canned answer.
 */
export async function* recordRun(
  dir: string,
  meta: RecordingMeta,
  input: RunInput,
  events: AsyncIterable<BaseEvent>,
): AsyncIterable<BaseEvent> {
  const recorded: BaseEvent[] = [];
  for await (const event of events) {
    recorded.push(event);
    yield event;
  }
  if (recorded.at(-1)?.type !== 'RUN_FINISHED') {
    logger.warn('Run did not finish cleanly; nothing recorded');
    return;
  }
  const print = fingerprint(input);
  const fixture: RunFixture = {
    version: 1,
    recordedAt: new Date().toISOString(),
    provider: meta.provider,
    models: meta.models,
    fingerprint: print,
    events: recorded,
  };
  const file = join(dir, fixtureFileName(print));
  await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify(fixture, null, 2));
  logger.log(`Recorded ${recorded.length} events to ${file}`);
}
