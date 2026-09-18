import type { UIMessage } from 'ai';

export const CONVERSATION_STORE = Symbol('CONVERSATION_STORE');

export interface ConversationStore {
  load(conversationId: string): Promise<UIMessage[]>;
  save(conversationId: string, messages: UIMessage[]): Promise<void>;
}
