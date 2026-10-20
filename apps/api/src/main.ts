import { Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { hashbrownConfig, missingKeyMessage } from './config/hashbrown.config.js';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.useBodyParser('json', { limit: '2mb' });
app.setGlobalPrefix('api');
app.enableShutdownHooks();

const host = process.env['HOST'] ?? 'localhost';
const port = Number(process.env['API_PORT'] ?? 3333);
await app.listen(port, host);

const { provider, model, apiKey, keyRequired } = app.get<ConfigType<typeof hashbrownConfig>>(hashbrownConfig.KEY);
const logger = new Logger('Bootstrap');
logger.log(`Ready on http://${host}:${port}/api (${provider}: ${model})`);
if (provider === 'replay') {
  logger.log('Replaying recorded fixtures; no model is called.');
} else if (!apiKey && keyRequired) {
  logger.warn(missingKeyMessage(provider));
} else if (!apiKey) {
  logger.log('No API key in .env; the Anthropic SDK will use ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.');
}
