import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { generateId, pipeAgentUIStreamToResponse, type UIMessage } from 'ai';
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

function truthyEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly agents: AgentRegistry,
    @Inject(CONVERSATION_STORE)
    private readonly conversations: ConversationStore,
    private readonly config: ConfigService,
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
    const logMetrics = truthyEnv(this.config.get<string>('AGENT_METRICS_LOG'));

    await pipeAgentUIStreamToResponse({
      response,
      agent,
      uiMessages,
      abortSignal,
      onStepFinish: async (step) => {
        if (!logMetrics) {
          return;
        }
        this.logger.log(
          JSON.stringify({
            msg: 'agent.step',
            requestId: ctx.requestId,
            userId: ctx.userId,
            agentId,
            finishReason: step.finishReason,
            usage: step.usage,
          }),
        );
      },
      onFinish: async ({
        messages: finalMessages,
        isAborted,
        finishReason,
      }) => {
        if (logMetrics) {
          this.logger.log(
            JSON.stringify({
              msg: 'agent.finish',
              requestId: ctx.requestId,
              userId: ctx.userId,
              agentId,
              isAborted,
              finishReason,
              messageCount: finalMessages.length,
            }),
          );
        }

        if (!conversationId) {
          return;
        }
        await this.conversations.save(
          ctx.userId,
          conversationId,
          finalMessages,
        );
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
