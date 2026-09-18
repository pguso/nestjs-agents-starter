import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import type { Response } from 'express';
import type { UIMessage } from 'ai';
import type { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service.js';
import { InMemoryConversationStore } from './in-memory-conversation.store.js';
import { AgentRegistry } from '../agents/agent.registry.js';
import { AssistantAgent } from '../agents/assistant.agent.js';
import { CancelOrderTool } from '../tools/cancel-order.tool.js';
import { OrderLookupTool } from '../tools/order-lookup.tool.js';
import { ListOrdersTool } from '../tools/list-orders.tool.js';
import { OrdersService } from '../orders/orders.service.js';
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

function configStub(
  values: Record<string, string | undefined> = {},
): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function createChatService(
  model: ReturnType<typeof createScriptedModel>['model'],
) {
  const store = new InMemoryConversationStore();
  const orders = new OrdersService();
  const modelService = {
    getModel: () => model,
  } as unknown as ModelService;

  const assistant = new AssistantAgent(
    modelService,
    new OrderLookupTool(orders),
    new ListOrdersTool(orders),
    new CancelOrderTool(orders),
  );
  const agents = new AgentRegistry(assistant);

  return {
    store,
    service: new ChatService(agents, store, configStub()),
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
      ctx: { userId: 'demo-user', requestId: 'test' },
      messages: [userMessage('hello')],
      response,
      abortSignal: new AbortController().signal,
    });

    expect(response.statusCode).toBe(200);
    expect(body().length).toBeGreaterThan(0);
    expect(await store.load('demo-user', 'any-id')).toEqual([]);
  });

  it('persists final messages when conversationId is set', async () => {
    const { model } = createScriptedModel(['stop']);
    const { service, store } = createChatService(model);
    const { response } = createMockResponse();

    await service.streamChat({
      ctx: { userId: 'demo-user', requestId: 'test' },
      messages: [
        { role: 'user', parts: [{ type: 'text', text: 'hello' }] } as UIMessage,
      ],
      conversationId: 'conv-1',
      response,
      abortSignal: new AbortController().signal,
    });

    const saved = await store.load('demo-user', 'conv-1');
    expect(saved.length).toBeGreaterThan(0);
    const user = saved.find((m) => m.role === 'user');
    expect(user?.id).toBeTruthy();
    expect(saved.some((m) => m.role === 'assistant')).toBe(true);
    expect(await store.load('demo-user', 'other')).toEqual([]);
  });

  it('does not expose one user conversation to another user', async () => {
    const { model } = createScriptedModel(['stop']);
    const { service, store } = createChatService(model);
    const { response } = createMockResponse();

    await service.streamChat({
      ctx: { userId: 'user-a', requestId: 'test' },
      messages: [userMessage('private')],
      conversationId: 'shared-id',
      response,
      abortSignal: new AbortController().signal,
    });

    expect((await store.load('user-a', 'shared-id')).length).toBeGreaterThan(0);
    expect(await service.loadConversation('user-b', 'shared-id')).toEqual([]);
  });

  it('loadConversation returns what was saved', async () => {
    const store = new InMemoryConversationStore();
    const { model } = createScriptedModel(['stop']);
    const orders = new OrdersService();
    const service = new ChatService(
      new AgentRegistry(
        new AssistantAgent(
          { getModel: () => model } as unknown as ModelService,
          new OrderLookupTool(orders),
          new ListOrdersTool(orders),
          new CancelOrderTool(orders),
        ),
      ),
      store,
      configStub(),
    );

    const messages: UIMessage[] = [userMessage('saved')];
    await store.save('demo-user', 'conv-2', messages);

    expect(await service.loadConversation('demo-user', 'conv-2')).toEqual(
      messages,
    );
    expect(await service.loadConversation('demo-user', 'missing')).toEqual([]);
  });

  it('rejects unknown agent ids', async () => {
    const { model } = createScriptedModel(['stop']);
    const { service } = createChatService(model);
    const { response } = createMockResponse();

    await expect(
      service.streamChat({
        ctx: { userId: 'demo-user', requestId: 'test' },
        messages: [userMessage('hello')],
        agentId: 'missing-agent',
        response,
        abortSignal: new AbortController().signal,
      }),
    ).rejects.toThrow(/Unknown agent/);
  });

  it('abort does not corrupt unrelated conversation ids', async () => {
    const { model } = createScriptedModel([
      [{ toolCallId: 'call-1', toolName: 'listOrders', input: {} }],
      'stop',
    ]);
    const { service, store } = createChatService(model);

    await store.save('demo-user', 'keep-me', [userMessage('keep')]);

    const abort = new AbortController();
    abort.abort();
    const { response } = createMockResponse();

    await service
      .streamChat({
        ctx: { userId: 'demo-user', requestId: 'test' },
        messages: [userMessage('abort me')],
        conversationId: 'aborted',
        response,
        abortSignal: abort.signal,
      })
      .catch(() => undefined);

    expect(await store.load('demo-user', 'keep-me')).toEqual([
      userMessage('keep'),
    ]);
  });
});
