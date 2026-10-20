import { Controller, Get, Inject } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { hashbrownConfig, type LlmProvider } from '../config/hashbrown.config.js';

/** 'sdk-default': no key in .env, so the provider SDK looks for credentials itself. 'none': the provider takes no key. */
type Credentials = 'api-key' | 'sdk-default' | 'none' | 'missing';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(hashbrownConfig.KEY)
    private readonly config: ConfigType<typeof hashbrownConfig>,
  ) {}

  @Get()
  check(): { ok: boolean; provider: LlmProvider; model: string; credentials: Credentials } {
    const { apiKey, keyRequired, provider, model } = this.config;
    const credentials: Credentials =
      provider === 'replay' || provider === 'ollama' ? 'none' : apiKey ? 'api-key' : keyRequired ? 'missing' : 'sdk-default';
    return { ok: credentials !== 'missing', provider, model, credentials };
  }
}
