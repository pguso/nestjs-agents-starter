import { Injectable } from '@nestjs/common';
import type { UIMessage } from 'ai';
import type { ConversationStore } from './conversation-store.js';

/**
 * Skeleton for a durable store. Wire a Postgres client (pg, Prisma, Drizzle, …),
 * then bind this class in ChatModule instead of InMemoryConversationStore:
 *
 * ```ts
 * { provide: CONVERSATION_STORE, useClass: PostgresConversationStore }
 * ```
 *
 * Always key rows by (userId, conversationId) so history stays user-scoped.
 */
@Injectable()
export class PostgresConversationStore implements ConversationStore {
  // constructor(private readonly db: YourDbClient) {}

  async load(userId: string, conversationId: string): Promise<UIMessage[]> {
    void userId;
    void conversationId;
    // TODO: SELECT messages WHERE user_id = $1 AND conversation_id = $2
    throw new Error(
      'PostgresConversationStore is a skeleton. Implement load/save and bind it in ChatModule.',
    );
  }

  async save(
    userId: string,
    conversationId: string,
    messages: UIMessage[],
  ): Promise<void> {
    void userId;
    void conversationId;
    void messages;
    // TODO: UPSERT messages for (user_id, conversation_id)
    throw new Error(
      'PostgresConversationStore is a skeleton. Implement load/save and bind it in ChatModule.',
    );
  }
}
