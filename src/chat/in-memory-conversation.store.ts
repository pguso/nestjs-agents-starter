import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { UIMessage } from 'ai';
import type { ConversationStore } from './conversation-store.js';

@Injectable()
export class InMemoryConversationStore
  implements ConversationStore, OnModuleInit
{
  private readonly logger = new Logger(InMemoryConversationStore.name);
  private readonly conversations = new Map<string, UIMessage[]>();

  onModuleInit(): void {
    this.logger.warn(
      'conversation store = in-memory (ephemeral). Lost on restart; not shared across instances. Swap for a durable ConversationStore before production.',
    );
  }

  private key(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }

  async load(userId: string, conversationId: string): Promise<UIMessage[]> {
    return this.conversations.get(this.key(userId, conversationId)) ?? [];
  }

  async save(
    userId: string,
    conversationId: string,
    messages: UIMessage[],
  ): Promise<void> {
    this.conversations.set(this.key(userId, conversationId), messages);
  }
}
