import { registerAs } from '@nestjs/config';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** 'ollama' runs a local model; 'replay' serves recorded fixtures instead of calling a model (see src/replay). */
export const LLM_PROVIDERS = ['google', 'openai', 'anthropic', 'ollama', 'replay'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];
export type ModelProvider = Exclude<LlmProvider, 'replay'>;

interface ProviderSettings {
  /** Unset for a provider that takes no key at all (Ollama). */
  readonly keyVar?: string;
  readonly modelVar: string;
  readonly defaultModel: string;
  /** False when the SDK can find credentials on its own if no key is set. */
  readonly keyRequired: boolean;
}

const PROVIDERS: Record<ModelProvider, ProviderSettings> = {
  google: {
    keyVar: 'GEMINI_API_KEY',
    modelVar: 'GEMINI_MODEL',
    defaultModel: 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite',
    keyRequired: true,
  },
  openai: { keyVar: 'OPENAI_API_KEY', modelVar: 'OPENAI_MODEL', defaultModel: 'gpt-5-mini', keyRequired: true },
  // Without ANTHROPIC_API_KEY the Anthropic SDK falls back to ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.
  anthropic: { keyVar: 'ANTHROPIC_API_KEY', modelVar: 'CLAUDE_MODEL', defaultModel: 'claude-opus-5-5', keyRequired: false },
  // Local models through the Ollama daemon. Tool calling and generative UI need a model that supports tools.
  ollama: { modelVar: 'OLLAMA_MODEL', defaultModel: 'qwen3:8b', keyRequired: false },
};

export const DEFAULT_OLLAMA_HOST = 'http://localhost:11434';

export function isLlmProvider(value: unknown): value is LlmProvider {
  return (LLM_PROVIDERS as readonly unknown[]).includes(value);
}

export function missingKeyMessage(provider: ModelProvider): string {
  if (provider === 'anthropic') {
    const profile = process.env['ANTHROPIC_PROFILE'];
    const login = profile ? `ant --profile ${profile} auth login` : 'ant auth login';
    return `No Claude credentials found. Set ANTHROPIC_API_KEY in apps/api/.env, or run \`${login}\`, then restart the API.`;
  }
  return `${PROVIDERS[provider].keyVar ?? 'The API key'} is not set on the server. Copy apps/api/.env.example to apps/api/.env and fill it in.`;
}

/** True when the Anthropic SDK could authenticate without an API key: an auth token, or a saved `ant auth login` profile. */
function hasAnthropicSdkCredentials(): boolean {
  if (process.env['ANTHROPIC_AUTH_TOKEN']) {
    return true;
  }
  const configDir = process.env['ANTHROPIC_CONFIG_DIR'] || join(homedir(), '.config', 'anthropic');
  const credentialsDir = join(configDir, 'credentials');
  const profile = process.env['ANTHROPIC_PROFILE'];
  if (profile) {
    return existsSync(join(credentialsDir, `${profile}.json`));
  }
  return existsSync(credentialsDir) && readdirSync(credentialsDir).some((file) => file.endsWith('.json'));
}

function resolveProvider(): LlmProvider {
  const requested = process.env['LLM_PROVIDER'];
  if (isLlmProvider(requested)) {
    return requested;
  }
  if (process.env['GEMINI_API_KEY']) {
    return 'google';
  }
  if (process.env['ANTHROPIC_API_KEY']) {
    return 'anthropic';
  }
  return process.env['OPENAI_API_KEY'] ? 'openai' : 'google';
}

export interface ReplaySettings {
  /** Where recorded runs live; relative to the API's working directory (apps/api). */
  readonly fixturesDir: string;
  /** Pause between replayed events, so streaming still looks like streaming. */
  readonly delayMs: number;
  /** With a real provider: also write every finished run to fixturesDir. */
  readonly record: boolean;
}

function replaySettings(): ReplaySettings {
  return {
    fixturesDir: process.env['FIXTURES_DIR'] || 'fixtures',
    delayMs: Number(process.env['REPLAY_DELAY_MS'] ?? 15),
    record: process.env['RECORD_FIXTURES'] === 'true',
  };
}

export const hashbrownConfig = registerAs('hashbrown', () => {
  const provider = resolveProvider();
  const firstEventTimeoutMs = Number(process.env['MODEL_FIRST_EVENT_TIMEOUT_MS'] || 20_000);
  if (provider === 'replay') {
    return {
      provider,
      apiKey: undefined,
      keyRequired: false,
      model: 'recorded fixtures',
      fallbackModels: [] as string[],
      firstEventTimeoutMs,
      ollamaHost: process.env['OLLAMA_HOST'] || DEFAULT_OLLAMA_HOST,
      replay: replaySettings(),
    };
  }
  const { keyVar, modelVar, defaultModel } = PROVIDERS[provider];
  const keyRequired = PROVIDERS[provider].keyRequired || (provider === 'anthropic' && !hasAnthropicSdkCredentials());
  const models = (process.env[modelVar] || defaultModel)
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return {
    provider,
    apiKey: keyVar ? process.env[keyVar] || undefined : undefined,
    keyRequired,
    model: models[0] ?? defaultModel,
    fallbackModels: models.slice(1),
    firstEventTimeoutMs,
    ollamaHost: process.env['OLLAMA_HOST'] || DEFAULT_OLLAMA_HOST,
    replay: replaySettings(),
  };
});

export type HashbrownConfig = ReturnType<typeof hashbrownConfig>;
