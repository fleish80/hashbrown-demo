import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { hashbrownConfig } from '../config/hashbrown.config.js';
import { ReplayService } from '../replay/replay.service.js';
import { RunController } from './run.controller.js';
import { RunService } from './run.service.js';

@Module({
  imports: [ConfigModule.forFeature(hashbrownConfig)],
  controllers: [RunController],
  providers: [RunService, ReplayService],
})
export class RunModule {}
