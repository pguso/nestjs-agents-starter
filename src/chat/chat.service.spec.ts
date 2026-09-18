import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import type { Response } from 'express';
import type { UIMessage } from 'ai';
import { ChatService } from './chat.service.js';
import { InMemoryConversationStore } from './in-memory-conversation.store.js';
import { AssistantAgent } from '../agents/assistant.agent.js';
import { OrderLookupTool } from '../tools/order-lookup.tool.js';
import { ListOrdersTool } from '../tools/list-orders.tool.js';
import { OrdersService } from '../tools/orders.service.js';
import type { ModelService } from '../model/model.service.js';
import { createScriptedModel } from '../testing/mock-language-model.js';

function createMockResponse() {
  const chunks: Buffer[] = [];
  const emitter = new EventEmitter();

  const response = Object.assign(emitter, {
    headersSent: false,
    statusCode: 200,
    writeHead(statusCode: number, ..._rest: unknown[]) {
      this.statusCode = statusCode;
      this.headersSent = true;
      return this;
    },
    write(chunk: Buffer | string) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    },
    end(chunk?: Buffer | string) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      this.headersSent = true;
      emitter.emit('finish');
      return this;
    },
  }) as unknown as Response & EventEmitter;

  return {
    response,
    body: () => Buffer.concat(chunks).toString('utf8'),
  };
}

function createChatService(model: ReturnType<typeof createScriptedModel>['model']) {
  const store = new InMemoryConversationStore();
  const orders = new OrdersService();
  const modelService = {
    getModel: () => model,
  } as unknown as ModelService;

  const assistant = new AssistantAgent(
    modelService,
    new OrderLookupTool(orders),
    new ListOrdersTool(orders),
  );

  return {
    store,
    service: new ChatService(assistant, store),
  };
}

const userMessage = (text: string): UIMessage => ({
  id: 'm1',
  role: 'user',
  parts: [{ type: 'text', text }],
});

describe('ChatService', () => {
  it('does not persist when conversationId is omitted', async () => {
    const { model } = createScriptedModel(['stop']);
    const { service, store } = createChatService(model);
    const { response, body } = createMockResponse();

    await service.streamChat({
      ctx: { userId: 'demo-user' },
      messages: [userMessage('hello')],
      response,
      abortSignal: new AbortController().signal,
    });

    expect(response.statusCode).toBe(200);
    expect(body().length).toBeGreaterThan(0);
    expect(await store.load('any-id')).toEqual([]);
  });

  it('persists final messages when conversationId is set', async () => {
    const { model } = createScriptedModel(['stop']);
    const { service, store } = createChatService(model);
    const { response } = createMockResponse();

    await service.streamChat({
      ctx: { userId: 'demo-user' },
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hello' }] } as UIMessage],
      conversationId: 'conv-1',
      response,
      abortSignal: new AbortController().signal,
    });

    const saved = await store.load('conv-1');
    expect(saved.length).toBeGreaterThan(0);
    const user = saved.find((m) => m.role === 'user');
    expect(user?.id).toBeTruthy();
    expect(saved.some((m) => m.role === 'assistant')).toBe(true);
    expect(await store.load('other')).toEqual([]);
  });

  it('loadConversation returns what was saved', async () => {
    const store = new InMemoryConversationStore();
    const { model } = createScriptedModel(['stop']);
    const orders = new OrdersService();
    const service = new ChatService(
      new AssistantAgent(
        { getModel: () => model } as unknown as ModelService,
        new OrderLookupTool(orders),
        new ListOrdersTool(orders),
      ),
      store,
    );

    const messages: UIMessage[] = [userMessage('saved')];
    await store.save('conv-2', messages);

    expect(await service.loadConversation('conv-2')).toEqual(messages);
    expect(await service.loadConversation('missing')).toEqual([]);
  });

  it('abort does not corrupt unrelated conversation ids', async () => {
    const { model } = createScriptedModel([
      [{ toolCallId: 'call-1', toolName: 'listOrders', input: {} }],
      'stop',
    ]);
    const { service, store } = createChatService(model);

    await store.save('keep-me', [userMessage('keep')]);

    const abort = new AbortController();
    abort.abort();
    const { response } = createMockResponse();

    await service.streamChat({
      ctx: { userId: 'demo-user' },
      messages: [userMessage('abort me')],
      conversationId: 'aborted',
      response,
      abortSignal: abort.signal,
    }).catch(() => undefined);

    expect(await store.load('keep-me')).toEqual([userMessage('keep')]);
  });
});
