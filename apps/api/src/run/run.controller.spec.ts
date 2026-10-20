import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type HashbrownConfig, hashbrownConfig } from '../config/hashbrown.config.js';
import { RunModule } from './run.module.js';
import { withClaudeDefaults, withOllamaDefaults } from './run.service.js';

const googleStream = vi.hoisted(() => vi.fn());
const openaiStream = vi.hoisted(() => vi.fn());
const anthropicStream = vi.hoisted(() => vi.fn());
vi.mock('@hashbrownai/google', () => ({ HashbrownGoogle: { stream: { text: googleStream } } }));
vi.mock('@hashbrownai/openai', () => ({ HashbrownOpenAI: { stream: { text: openaiStream } } }));
vi.mock('@hashbrownai/anthropic', () => ({ HashbrownAnthropic: { stream: { text: anthropicStream } } }));
const ollamaStream = vi.hoisted(() => vi.fn());
vi.mock('@hashbrownai/ollama', () => ({ HashbrownOllama: { stream: { text: ollamaStream } } }));

const RUN_INPUT = { threadId: 't', runId: 'r', messages: [], tools: [] };
const REPLAY = { fixturesDir: 'fixtures', delayMs: 0, record: false };

async function* twoEvents() {
  yield { type: 'RUN_STARTED', threadId: 't', runId: 'r' };
  yield { type: 'RUN_FINISHED', threadId: 't', runId: 'r' };
}

async function createApp(config: HashbrownConfig): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [RunModule] })
    .overrideProvider(hashbrownConfig.KEY)
    .useValue(config)
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

function readBody(res: unknown, done: (err: Error | null, body: string) => void): void {
  let body = '';
  const stream = res as NodeJS.ReadableStream;
  stream.on('data', (chunk: Buffer) => (body += chunk.toString()));
  stream.on('end', () => done(null, body));
}

function postRun(app: INestApplication) {
  return request(app.getHttpServer()).post('/run').send(RUN_INPUT).buffer(true).parse(readBody);
}

describe('POST /run', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    googleStream.mockReset();
    openaiStream.mockReset();
    anthropicStream.mockReset();
    ollamaStream.mockReset();
  });

  it('should return 503 naming the missing key', async () => {
    app = await createApp({ provider: 'google', apiKey: undefined, keyRequired: true, model: 'm', fallbackModels: [], firstEventTimeoutMs: 1000, ollamaHost: 'http://localhost:11434', replay: REPLAY });
    const response = await request(app.getHttpServer()).post('/run').send(RUN_INPUT);
    expect(response.status).toBe(503);
    expect(response.body.message).toContain('GEMINI_API_KEY');
    expect(googleStream).not.toHaveBeenCalled();
  });

  it('should stream Gemini events as server-sent events', async () => {
    googleStream.mockImplementation(twoEvents);
    app = await createApp({ provider: 'google', apiKey: 'test-key', keyRequired: true, model: 'gemini-test', fallbackModels: [], firstEventTimeoutMs: 1000, ollamaHost: 'http://localhost:11434', replay: REPLAY });

    const response = await postRun(app);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(googleStream).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'test-key', model: 'gemini-test', input: RUN_INPUT }),
    );
    expect(openaiStream).not.toHaveBeenCalled();
    const events = String(response.body).split('\n\n').filter(Boolean);
    expect(events).toHaveLength(2);
    expect(events[0]).toContain('"type":"RUN_STARTED"');
    expect(events[1]).toContain('"type":"RUN_FINISHED"');
  });

  it('should use the OpenAI adapter when that provider is configured', async () => {
    openaiStream.mockImplementation(twoEvents);
    app = await createApp({ provider: 'openai', apiKey: 'test-key', keyRequired: true, model: 'gpt-test', fallbackModels: [], firstEventTimeoutMs: 1000, ollamaHost: 'http://localhost:11434', replay: REPLAY });

    await postRun(app);

    expect(openaiStream).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-test' }));
    expect(googleStream).not.toHaveBeenCalled();
  });

  it('should use the Claude adapter with the larger token cap', async () => {
    anthropicStream.mockImplementation(twoEvents);
    app = await createApp({ provider: 'anthropic', apiKey: 'test-key', keyRequired: false, model: 'claude-opus-5-5', fallbackModels: [], firstEventTimeoutMs: 1000, ollamaHost: 'http://localhost:11434', replay: REPLAY });

    await postRun(app);

    expect(anthropicStream).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'test-key', model: 'claude-opus-5-5', transformRequestOptions: withClaudeDefaults }),
    );
    expect(googleStream).not.toHaveBeenCalled();
  });

  it('should use the Ollama adapter with the configured host and no key', async () => {
    ollamaStream.mockImplementation(twoEvents);
    app = await createApp({ provider: 'ollama', apiKey: undefined, keyRequired: false, model: 'llama3.2', fallbackModels: [], firstEventTimeoutMs: 1000, ollamaHost: 'http://localhost:11434', replay: REPLAY });

    const response = await postRun(app);

    expect(response.status).toBe(200);
    expect(ollamaStream).toHaveBeenCalledWith(expect.objectContaining({ model: 'llama3.2', host: 'http://localhost:11434', input: RUN_INPUT, transformRequestOptions: withOllamaDefaults }));
    expect(googleStream).not.toHaveBeenCalled();
  });

  it('should let Claude run without a key so the SDK can find its own credentials', async () => {
    anthropicStream.mockImplementation(twoEvents);
    app = await createApp({ provider: 'anthropic', apiKey: undefined, keyRequired: false, model: 'claude-opus-5-5', fallbackModels: [], firstEventTimeoutMs: 1000, ollamaHost: 'http://localhost:11434', replay: REPLAY });

    const response = await postRun(app);

    expect(response.status).toBe(200);
    expect(anthropicStream.mock.calls[0][0].apiKey).toBeUndefined();
  });
});

describe('withClaudeDefaults', () => {
  it('should raise the token cap and set effort without dropping the response schema', () => {
    const request = {
      stream: true as const,
      model: 'claude-opus-5-5',
      max_tokens: 4096,
      messages: [],
      output_config: { format: { type: 'json_schema' as const, schema: { type: 'object' } } },
    };
    expect(withClaudeDefaults(request)).toEqual({
      ...request,
      max_tokens: 64_000,
      output_config: { format: request.output_config.format, effort: 'medium' },
    });
  });
});

describe('withOllamaDefaults', () => {
  const schema = { type: 'object' };
  const tools = [{ type: 'function' as const, function: { name: 'getMetrics', description: 'metrics' } }];
  const user = { role: 'user' as const, content: 'How are we doing?' };

  it('should withhold the schema while tools are still to be called', () => {
    const request = { stream: true as const, model: 'llama3.2', messages: [user], tools, format: schema };
    expect(withOllamaDefaults(request)).toEqual({ stream: true, model: 'llama3.2', messages: [user], tools, think: false });
  });

  it('should keep the schema once a tool result is in the history', () => {
    const messages = [user, { role: 'assistant' as const, content: '' }, { role: 'tool' as const, content: '[]', tool_name: 'getMetrics' }];
    const request = { stream: true as const, model: 'llama3.2', messages, tools, format: schema };
    expect(withOllamaDefaults(request)).toEqual({ ...request, think: false });
  });

  it('should keep the schema of a run without tools and only switch thinking off', () => {
    const request = { stream: true as const, model: 'llama3.2', messages: [user], format: schema };
    expect(withOllamaDefaults(request)).toEqual({ ...request, think: false });
  });
});
