import { Module } from '@nestjs/common';
import { ModelModule } from '../model/model.module.js';
import { ToolsModule } from '../tools/tools.module.js';
import { AgentRegistry } from './agent.registry.js';
import { AssistantAgent } from './assistant.agent.js';

@Module({
  imports: [ModelModule, ToolsModule],
  providers: [AssistantAgent, AgentRegistry],
  exports: [AssistantAgent, AgentRegistry],
})
export class AgentsModule {}
