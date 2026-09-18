import { describe, expect, it } from 'vitest';
import { InMemoryConversationStore } from './in-memory-conversation.store.js';
import type { UIMessage } from 'ai';

describe('InMemoryConversationStore', () => {
  it('round-trips messages for a conversation id', async () => {
    const store = new InMemoryConversationStore();
    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'hello' }],
      },
    ];

    expect(await store.load('c1')).toEqual([]);
    await store.save('c1', messages);
    expect(await store.load('c1')).toEqual(messages);
    expect(await store.load('c2')).toEqual([]);
  });
});
