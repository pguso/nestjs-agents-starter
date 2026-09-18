import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryConversationStore } from './in-memory-conversation.store.js';
import type { UIMessage } from 'ai';

describe('InMemoryConversationStore', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('round-trips messages for a user and conversation id', async () => {
    const store = new InMemoryConversationStore();
    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'hello' }],
      },
    ];

    expect(await store.load('user-a', 'c1')).toEqual([]);
    await store.save('user-a', 'c1', messages);
    expect(await store.load('user-a', 'c1')).toEqual(messages);
    expect(await store.load('user-a', 'c2')).toEqual([]);
  });

  it('isolates conversations by userId', async () => {
    const store = new InMemoryConversationStore();
    const messages: UIMessage[] = [
      {
        id: 'm1',
        role: 'user',
        parts: [{ type: 'text', text: 'secret' }],
      },
    ];

    await store.save('user-a', 'shared-id', messages);
    expect(await store.load('user-a', 'shared-id')).toEqual(messages);
    expect(await store.load('user-b', 'shared-id')).toEqual([]);
  });

  it('refuses to boot when NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    const store = new InMemoryConversationStore();
    expect(() => store.onModuleInit()).toThrow(
      /InMemoryConversationStore is not allowed when NODE_ENV=production/,
    );
  });

  it('warns but boots when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    const store = new InMemoryConversationStore();
    expect(() => store.onModuleInit()).not.toThrow();
  });
});
