import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentsModule } from './agents/agents.module.js';
import { ChatModule } from './chat/chat.module.js';
import { CommonModule } from './common/common.module.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { ModelModule } from './model/model.module.js';
import { ToolsModule } from './tools/tools.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CommonModule,
    HealthModule,
    ModelModule,
    ToolsModule,
    AgentsModule,
    ChatModule,
  ],
})
export class AppModule {}
