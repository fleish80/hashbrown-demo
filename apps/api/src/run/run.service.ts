import type { BaseEvent, RunAgentInput } from '@ag-ui/core';
import { HashbrownAnthropic } from '@hashbrownai/anthropic';
import { HashbrownGoogle } from '@hashbrownai/google';
import { HashbrownOpenAI } from '@hashbrownai/openai';
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { hashbrownConfig, missingKeyMessage } from '../config/hashbrown.config.js';
import { streamWithModelFallback } from './model-fallback.js';

type ClaudeRequest = Parameters<
  NonNullable<Parameters<typeof HashbrownAnthropic.stream.text>[0]['transformRequestOptions']>
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

@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);

  constructor(
    @Inject(hashbrownConfig.KEY)
    private readonly config: ConfigType<typeof hashbrownConfig>,
  ) {}

  /**
   * Step 6: starts a model run; throws 503 before any output when no key is configured.
   *
   * The Hashbrown adapter does the provider-specific work. It turns the AG-UI messages and tools
   * into a Gemini, Claude or OpenAI request, calls the streaming API, and translates every chunk the
   * model returns back into AG-UI events. Swapping providers therefore never touches the Angular app.
   */
  stream(input: RunAgentInput, signal: AbortSignal): AsyncIterable<BaseEvent> {
    const { provider, apiKey, keyRequired, model, fallbackModels, firstEventTimeoutMs } = this.config;
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
    return streamWithModelFallback([model, ...fallbackModels], start, {
      firstEventTimeoutMs,
      onFallback: (failed, next, reason) =>
        this.logger.warn(
          `${failed} ${reason === 'timeout' ? `sent nothing for ${firstEventTimeoutMs / 1000}s` : 'is unavailable'}, retrying the run on ${next}`,
        ),
    });
  }
}
