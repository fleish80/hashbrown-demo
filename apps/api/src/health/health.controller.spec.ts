import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { hashbrownConfig, type LlmProvider } from '../config/hashbrown.config.js';
import { HealthController } from './health.controller.js';

async function createController(
  apiKey: string | undefined,
  provider: LlmProvider = 'google',
): Promise<HealthController> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: hashbrownConfig.KEY, useValue: { provider, apiKey, keyRequired: provider !== 'anthropic', model: 'test-model', fallbackModels: [], firstEventTimeoutMs: 1000 } }],
  }).compile();
  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  it('should report ok when a key is configured', async () => {
    expect((await createController('test-key')).check()).toEqual({ ok: true, provider: 'google', model: 'test-model', credentials: 'api-key' });
  });

  it('should report not ok without a key', async () => {
    expect((await createController(undefined)).check().ok).toBe(false);
  });

  it('should report Claude without a key as using the SDK credential chain', async () => {
    const result = (await createController(undefined, 'anthropic')).check();
    expect(result).toMatchObject({ ok: true, provider: 'anthropic', credentials: 'sdk-default' });
  });
});
