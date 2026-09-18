import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { CONVERSATION_STORE } from './conversation-store.js';
import { InMemoryConversationStore } from './in-memory-conversation.store.js';

@Module({
  imports: [AgentsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    {
      provide: CONVERSATION_STORE,
      useClass: InMemoryConversationStore,
    },
  ],
})
export class ChatModule {}
