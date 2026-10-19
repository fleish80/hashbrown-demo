import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { hashbrownConfig } from '../config/hashbrown.config.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [ConfigModule.forFeature(hashbrownConfig)],
  controllers: [HealthController],
})
export class HealthModule {}
