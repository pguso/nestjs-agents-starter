import { Injectable, NotFoundException } from '@nestjs/common';
import { AssistantAgent } from './assistant.agent.js';
import type { NestAgent } from './agent.js';

export const DEFAULT_AGENT_ID = 'assistant';

/**
 * Explicit map of agent id -> NestAgent.
 * Add a second agent by injecting it here and calling `register`.
 */
@Injectable()
export class AgentRegistry {
  private readonly agents = new Map<string, NestAgent>();

  constructor(assistant: AssistantAgent) {
    this.register(assistant);
  }

  register(agent: NestAgent): void {
    this.agents.set(agent.id, agent);
  }

  get(agentId: string = DEFAULT_AGENT_ID): NestAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new NotFoundException(
        `Unknown agent "${agentId}". Registered: ${[...this.agents.keys()].join(', ') || '(none)'}`,
      );
    }
    return agent;
  }

  ids(): string[] {
    return [...this.agents.keys()];
  }
}
