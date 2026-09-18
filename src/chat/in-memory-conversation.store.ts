import { Injectable } from '@nestjs/common';
import type { UIMessage } from 'ai';
import type { ConversationStore } from './conversation-store.js';

@Injectable()
export class InMemoryConversationStore implements ConversationStore {
  private readonly conversations = new Map<string, UIMessage[]>();

  async load(conversationId: string): Promise<UIMessage[]> {
    return this.conversations.get(conversationId) ?? [];
  }

  async save(conversationId: string, messages: UIMessage[]): Promise<void> {
    this.conversations.set(conversationId, messages);
  }
}
