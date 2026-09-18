import { Injectable, Inject } from '@nestjs/common';
import type { Response } from 'express';
import {
  generateId,
  pipeAgentUIStreamToResponse,
  type UIMessage,
} from 'ai';
import type { RequestContext } from '../common/request-context.js';
import { AgentRegistry, DEFAULT_AGENT_ID } from '../agents/agent.registry.js';
import {
  CONVERSATION_STORE,
  type ConversationStore,
} from './conversation-store.js';

function ensureMessageIds(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) =>
    message.id ? message : { ...message, id: generateId() },
  );
}

@Injectable()
export class ChatService {
  constructor(
    private readonly agents: AgentRegistry,
    @Inject(CONVERSATION_STORE)
    private readonly conversations: ConversationStore,
  ) {}

  async streamChat(params: {
    ctx: RequestContext;
    messages: UIMessage[];
    conversationId?: string;
    agentId?: string;
    response: Response;
    abortSignal: AbortSignal;
  }): Promise<void> {
    const {
      ctx,
      messages,
      conversationId,
      agentId = DEFAULT_AGENT_ID,
      response,
      abortSignal,
    } = params;
    const agent = this.agents.get(agentId).create(ctx);
    const uiMessages = ensureMessageIds(messages);

    await pipeAgentUIStreamToResponse({
      response,
      agent,
      uiMessages,
      abortSignal,
      onFinish: async ({ messages: finalMessages }) => {
        if (!conversationId) {
          return;
        }
        await this.conversations.save(ctx.userId, conversationId, finalMessages);
      },
    });
  }

  async loadConversation(
    userId: string,
    conversationId: string,
  ): Promise<UIMessage[]> {
    return this.conversations.load(userId, conversationId);
  }
}
