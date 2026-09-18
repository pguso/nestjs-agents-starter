import { Injectable, Inject } from '@nestjs/common';
import type { Response } from 'express';
import {
  generateId,
  pipeAgentUIStreamToResponse,
  type UIMessage,
} from 'ai';
import type { RequestContext } from '../common/request-context.js';
import { AssistantAgent } from '../agents/assistant.agent.js';
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
    private readonly assistant: AssistantAgent,
    @Inject(CONVERSATION_STORE)
    private readonly conversations: ConversationStore,
  ) {}

  async streamChat(params: {
    ctx: RequestContext;
    messages: UIMessage[];
    conversationId?: string;
    response: Response;
    abortSignal: AbortSignal;
  }): Promise<void> {
    const { ctx, messages, conversationId, response, abortSignal } = params;
    const agent = this.assistant.create(ctx);
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
        await this.conversations.save(conversationId, finalMessages);
      },
    });
  }

  async loadConversation(conversationId: string): Promise<UIMessage[]> {
    return this.conversations.load(conversationId);
  }
}
