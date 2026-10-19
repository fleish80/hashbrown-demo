import { registerAs } from '@nestjs/config';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const LLM_PROVIDERS = ['google', 'openai', 'anthropic'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

interface ProviderSettings {
  readonly keyVar: string;
  readonly modelVar: string;
  readonly defaultModel: string;
  /** False when the SDK can find credentials on its own if no key is set. */
  readonly keyRequired: boolean;
}

const PROVIDERS: Record<LlmProvider, ProviderSettings> = {
  google: {
    keyVar: 'GEMINI_API_KEY',
    modelVar: 'GEMINI_MODEL',
    defaultModel: 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite',
    keyRequired: true,
  },
  openai: { keyVar: 'OPENAI_API_KEY', modelVar: 'OPENAI_MODEL', defaultModel: 'gpt-5-mini', keyRequired: true },
  // Without ANTHROPIC_API_KEY the Anthropic SDK falls back to ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.
  anthropic: { keyVar: 'ANTHROPIC_API_KEY', modelVar: 'CLAUDE_MODEL', defaultModel: 'claude-opus-5-5', keyRequired: false },
};

export function isLlmProvider(value: unknown): value is LlmProvider {
  return (LLM_PROVIDERS as readonly unknown[]).includes(value);
}

export function missingKeyMessage(provider: LlmProvider): string {
  if (provider === 'anthropic') {
    const profile = process.env['ANTHROPIC_PROFILE'];
    const login = profile ? `ant --profile ${profile} auth login` : 'ant auth login';
    return `No Claude credentials found. Set ANTHROPIC_API_KEY in apps/api/.env, or run \`${login}\`, then restart the API.`;
  }
  return `${PROVIDERS[provider].keyVar} is not set on the server. Copy apps/api/.env.example to apps/api/.env and fill it in.`;
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

export const hashbrownConfig = registerAs('hashbrown', () => {
  const provider = resolveProvider();
  const { keyVar, modelVar, defaultModel } = PROVIDERS[provider];
  const keyRequired = PROVIDERS[provider].keyRequired || (provider === 'anthropic' && !hasAnthropicSdkCredentials());
  const models = (process.env[modelVar] || defaultModel)
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return {
    provider,
    apiKey: process.env[keyVar] || undefined,
    keyRequired,
    model: models[0] ?? defaultModel,
    fallbackModels: models.slice(1),
    firstEventTimeoutMs: Number(process.env['MODEL_FIRST_EVENT_TIMEOUT_MS'] || 20_000),
  };
});

export type HashbrownConfig = ReturnType<typeof hashbrownConfig>;
