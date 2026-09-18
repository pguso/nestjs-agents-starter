import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { CONVERSATION_STORE } from './conversation-store.js';
import { InMemoryConversationStore } from './in-memory-conversation.store.js';
// Skeleton only - copy/implement before binding (fails at module init if bound as-is):
// import { PostgresConversationStore } from './postgres-conversation.store.skeleton.js';

@Module({
  imports: [AgentsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: CONVERSATION_STORE,
      useClass: InMemoryConversationStore,
      // Swap for durable storage after implementing a real store (not the .skeleton file).
      // Required when NODE_ENV=production - InMemoryConversationStore refuses to boot.
      // useClass: PostgresConversationStore,
    },
  ],
})
export class ChatModule {}
