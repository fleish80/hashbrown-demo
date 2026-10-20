import type { BaseEvent } from '@ag-ui/core';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hashbrownConfig } from '../config/hashbrown.config.js';
import { exactKey, fingerprint, looseKey, type RunInput } from './fixture-key.js';
import type { RunFixture } from './run-fixture.js';

const ID_FIELDS = ['messageId', 'parentMessageId', 'toolCallId'] as const;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Serves recorded runs instead of calling a model, so a demo is deterministic and works offline.
 * Fixtures are matched on the request fingerprint: first exactly, then on the same prompt and tool
 * names if the tools returned something different from the recording.
 */
@Injectable()
export class ReplayService {
  private readonly logger = new Logger(ReplayService.name);

  constructor(
    @Inject(hashbrownConfig.KEY)
    private readonly config: ConfigType<typeof hashbrownConfig>,
  ) {}

  async *stream(input: RunInput, signal: AbortSignal): AsyncIterable<BaseEvent> {
    const print = fingerprint(input);
    const fixture = await this.find(exactKey(print), looseKey(print));
    const identity = { threadId: input.threadId, runId: input.runId };
    if (!fixture) {
      this.logger.warn(`No fixture for "${print.lastUserMessage}" (${exactKey(print)})`);
      yield { type: 'RUN_STARTED', ...identity } as BaseEvent;
      yield {
        type: 'RUN_ERROR',
        ...identity,
        message: `No recorded reply for "${print.lastUserMessage}". Run the API with a real provider and RECORD_FIXTURES=true to record one.`,
      } as BaseEvent;
      return;
    }
    // Fresh ids per replay, so the same fixture can be played twice in one thread.
    const ids = new Map<string, string>();
    const freshId = (recorded: string): string => {
      const existing = ids.get(recorded);
      if (existing) {
        return existing;
      }
      const fresh = randomUUID();
      ids.set(recorded, fresh);
      return fresh;
    };
    for (const recorded of fixture.events) {
      if (signal.aborted) {
        return;
      }
      await sleep(this.config.replay.delayMs, signal);
      const event: Record<string, unknown> = { ...recorded };
      for (const field of ID_FIELDS) {
        if (typeof event[field] === 'string') {
          event[field] = freshId(event[field]);
        }
      }
      if (event['type'] === 'RUN_STARTED' || event['type'] === 'RUN_FINISHED' || event['type'] === 'RUN_ERROR') {
        Object.assign(event, identity);
      }
      yield event as BaseEvent;
    }
  }

  /** Reads the fixtures directory on every run, so a newly recorded file is served without a restart. */
  private async find(exact: string, loose: string): Promise<RunFixture | undefined> {
    const dir = this.config.replay.fixturesDir;
    let files: string[];
    try {
      files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
    } catch {
      return undefined;
    }
    const fixtures = await Promise.all(
      files.map(async (file) => JSON.parse(await readFile(join(dir, file), 'utf8')) as RunFixture),
    );
    return (
      fixtures.find((fixture) => exactKey(fixture.fingerprint) === exact) ??
      fixtures.find((fixture) => looseKey(fixture.fingerprint) === loose)
    );
  }
}
