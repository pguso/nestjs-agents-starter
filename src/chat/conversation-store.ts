import type { UIMessage } from 'ai';

export const CONVERSATION_STORE = Symbol('CONVERSATION_STORE');

export interface ConversationStore {
  load(userId: string, conversationId: string): Promise<UIMessage[]>;
  save(
    userId: string,
    conversationId: string,
    messages: UIMessage[],
  ): Promise<void>;
}
