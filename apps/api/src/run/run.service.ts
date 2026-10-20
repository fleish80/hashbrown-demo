import type { BaseEvent, RunAgentInput } from '@ag-ui/core';
import { HashbrownAnthropic } from '@hashbrownai/anthropic';
import { HashbrownGoogle } from '@hashbrownai/google';
import { HashbrownOllama } from '@hashbrownai/ollama';
import { HashbrownOpenAI } from '@hashbrownai/openai';
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { hashbrownConfig, missingKeyMessage } from '../config/hashbrown.config.js';
import { recordRun } from '../replay/fixture-recorder.js';
import { ReplayService } from '../replay/replay.service.js';
import { retryEmptyUi } from './empty-ui-retry.js';
import { streamWithModelFallback } from './model-fallback.js';

type ClaudeRequest = Parameters<
  NonNullable<Parameters<typeof HashbrownAnthropic.stream.text>[0]['transformRequestOptions']>
>[0];
type OllamaRequest = Parameters<
  NonNullable<Parameters<typeof HashbrownOllama.stream.text>[0]['transformRequestOptions']>
>[0];

/**
 * The adapter caps replies at 4,096 tokens, and Claude's always-on thinking counts toward that cap,
 * so long answers would be cut off. Streaming makes a larger cap safe. Opus 5.5 defaults to medium
 * effort; it is set explicitly so the choice is visible. The adapter's own output_config is kept.
 */
export function withClaudeDefaults(request: ClaudeRequest): ClaudeRequest {
  return {
    ...request,
    max_tokens: 64_000,
    output_config: { ...request.output_config, effort: 'medium' },
  };
}

/**
 * Two Ollama adjustments. Thinking is off: on a thinking model such as Qwen 3 it doubles the latency
 * of these short answers without changing them, and non-thinking models accept the flag. And
 * Ollama's constrained JSON output (`format`) stops small local models from emitting a tool call:
 * with tools and a schema together, Llama 3.2 answers an empty `{"ui":[]}` or stalls. So while a
 * run still has tools to call and no tool result in its history, the schema is withheld; once the
 * tool result is there, the schema is applied and the model writes the structured answer.
 */
export function withOllamaDefaults(request: OllamaRequest): OllamaRequest {
  const toolsPending = (request.tools?.length ?? 0) > 0 && !(request.messages ?? []).some((message) => message.role === 'tool');
  if (!toolsPending || request.format === undefined) {
    return { ...request, think: false };
  }
  const { format: _format, ...withoutSchema } = request;
  return { ...withoutSchema, think: false };
}

@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);

  constructor(
    @Inject(hashbrownConfig.KEY)
    private readonly config: ConfigType<typeof hashbrownConfig>,
    private readonly replay: ReplayService,
  ) {}

  /**
   * Step 6: starts a model run; throws 503 before any output when no key is configured.
   *
   * The Hashbrown adapter does the provider-specific work. It turns the AG-UI messages and tools
   * into a Gemini, Claude or OpenAI request, calls the streaming API, and translates every chunk the
   * model returns back into AG-UI events. Swapping providers therefore never touches the Angular app.
   */
  stream(input: RunAgentInput, signal: AbortSignal): AsyncIterable<BaseEvent> {
    const { provider, apiKey, keyRequired, model, fallbackModels, firstEventTimeoutMs, ollamaHost, replay } = this.config;
    // LLM_PROVIDER=replay: no model at all, recorded fixtures are streamed back instead.
    if (provider === 'replay') {
      return this.replay.stream(input, signal);
    }
    if (!apiKey && keyRequired) {
      throw new ServiceUnavailableException(missingKeyMessage(provider));
    }
    // Each attempt gets its own abort signal, so a stalled model can be cancelled on its own,
    // while the browser closing the connection still cancels everything.
    const start = (candidate: string, attemptSignal: AbortSignal): AsyncIterable<BaseEvent> => {
      const attempt = { model: candidate, input, signal: AbortSignal.any([signal, attemptSignal]) };
      switch (provider) {
        case 'google':
          return HashbrownGoogle.stream.text({ ...attempt, apiKey: apiKey as string });
        case 'openai':
          return HashbrownOpenAI.stream.text({ ...attempt, apiKey: apiKey as string });
        case 'ollama':
          // No key: the adapter talks to the local Ollama daemon over plain HTTP.
          return HashbrownOllama.stream.text({ ...attempt, host: ollamaHost, transformRequestOptions: withOllamaDefaults });
        case 'anthropic':
          return HashbrownAnthropic.stream.text({
            ...attempt,
            // The adapter types require a key, but undefined lets the SDK use its own credential chain.
            apiKey: apiKey as string,
            transformRequestOptions: withClaudeDefaults,
          });
      }
    };

    // If a model is overloaded or silent for too long before any text, retry on the next model.
    const models = [model, ...fallbackModels];
    const withFallback = (): AsyncIterable<BaseEvent> =>
      streamWithModelFallback(models, start, {
        firstEventTimeoutMs,
        onFallback: (failed, next, reason) =>
          this.logger.warn(
            `${failed} ${reason === 'timeout' ? `sent nothing for ${firstEventTimeoutMs / 1000}s` : 'is unavailable'}, retrying the run on ${next}`,
          ),
      });
    // A local model answering a generative UI request with an empty tree is asked again.
    const uiRequested = Boolean((input as { hashbrown?: { ui?: boolean } }).hashbrown?.ui);
    const events =
      provider === 'ollama' && uiRequested
        ? retryEmptyUi(withFallback, { onRetry: (attempt) => this.logger.warn(`${model} returned an empty ui list (attempt ${attempt}), asking again`) })
        : withFallback();
    // RECORD_FIXTURES=true: save the finished run so LLM_PROVIDER=replay can serve it later.
    return replay.record ? recordRun(replay.fixturesDir, { provider, models: models.join(',') }, input, events) : events;
  }
}
