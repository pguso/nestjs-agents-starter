import { Injectable, OnModuleInit } from '@nestjs/common';
import type { UIMessage } from 'ai';
import type { ConversationStore } from './conversation-store.js';

/**
 * Skeleton only - not wired. Filename ends in `.skeleton.ts` so it is obvious
 * this is not a working Postgres store.
 *
 * To use durable storage:
 * 1. Copy this file to `postgres-conversation.store.ts` (drop `.skeleton`).
 * 2. Implement `load` / `save` with your client (pg, Prisma, Drizzle, …).
 * 3. Require `DATABASE_URL` (or equivalent) and remove `onModuleInit`.
 * 4. Bind in ChatModule instead of InMemoryConversationStore:
 *
 * ```ts
 * { provide: CONVERSATION_STORE, useClass: PostgresConversationStore }
 * ```
 *
 * Always key rows by (userId, conversationId) so history stays user-scoped.
 *
 * Binding this class as-is fails at module init - do not uncomment it until
 * load/save are real.
 */
@Injectable()
export class PostgresConversationStore
  implements ConversationStore, OnModuleInit
{
  // constructor(private readonly db: YourDbClient) {}

  onModuleInit(): void {
    throw new Error(
      'PostgresConversationStore is a skeleton (.skeleton.ts) and must not be bound until load/save are implemented and DATABASE_URL (or equivalent) is configured.',
    );
  }

  async load(userId: string, conversationId: string): Promise<UIMessage[]> {
    void userId;
    void conversationId;
    // TODO: SELECT messages WHERE user_id = $1 AND conversation_id = $2
    throw new Error(
      'PostgresConversationStore is a skeleton. Implement load/save before binding it in ChatModule.',
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
      'PostgresConversationStore is a skeleton. Implement load/save before binding it in ChatModule.',
    );
  }
}
