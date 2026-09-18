import { describe, expect, it } from 'vitest';
import { AssistantAgent } from './assistant.agent.js';
import { CancelOrderTool } from '../tools/cancel-order.tool.js';
import { OrderLookupTool } from '../tools/order-lookup.tool.js';
import { ListOrdersTool } from '../tools/list-orders.tool.js';
import { OrdersService } from '../tools/orders.service.js';
import type { ModelService } from '../model/model.service.js';
import {
  createScriptedModel,
  toolErrors,
  toolOutputs,
} from '../testing/mock-language-model.js';

function createAgent(
  model: ReturnType<typeof createScriptedModel>['model'],
  orders = new OrdersService(),
) {
  const modelService = {
    getModel: () => model,
  } as unknown as ModelService;

  return new AssistantAgent(
    modelService,
    new OrderLookupTool(orders),
    new ListOrdersTool(orders),
    new CancelOrderTool(orders),
  ).create({ userId: 'demo-user', requestId: 'test' }, model);
}

describe('AssistantAgent', () => {
  it('returns lookupOrder tool output matching real order state', async () => {
    const { model } = createScriptedModel([
      [
        {
          toolCallId: 'call-1',
          toolName: 'lookupOrder',
          input: { orderId: 'ord_1001' },
        },
      ],
      'stop',
    ]);

    const result = await createAgent(model).generate({
      prompt: 'What is the status of order ord_1001?',
    });

    expect(toolOutputs(result)).toContainEqual({
      toolName: 'lookupOrder',
      output: {
        id: 'ord_1001',
        status: 'shipped',
        totalCents: 4299,
        items: ['NestJS sticker pack', 'Agent mug'],
      },
    });
  });

  it('returns listOrders tool output for the current user only', async () => {
    const { model } = createScriptedModel([
      [{ toolCallId: 'call-1', toolName: 'listOrders', input: {} }],
      'stop',
    ]);

    const result = await createAgent(model).generate({
      prompt: 'List my orders',
    });

    expect(toolOutputs(result)).toContainEqual({
      toolName: 'listOrders',
      output: [
        { id: 'ord_1001', status: 'shipped', totalCents: 4299 },
        { id: 'ord_1002', status: 'pending', totalCents: 1999 },
      ],
    });
  });

  it('surfaces a tool error when looking up another users order', async () => {
    const { model } = createScriptedModel([
      [
        {
          toolCallId: 'call-1',
          toolName: 'lookupOrder',
          input: { orderId: 'ord_2001' },
        },
      ],
      'stop',
    ]);

    const result = await createAgent(model).generate({
      prompt: 'Look up ord_2001',
    });

    const errors = toolErrors(result);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      type: 'tool-error',
      toolName: 'lookupOrder',
    });
    expect(String((errors[0] as { error?: unknown }).error)).toMatch(
      /not found/i,
    );
    expect(toolOutputs(result)).toEqual([]);
  });

  it('requests approval for cancelOrder instead of executing immediately', async () => {
    const orders = new OrdersService();
    const { model } = createScriptedModel([
      [
        {
          toolCallId: 'call-1',
          toolName: 'cancelOrder',
          input: { orderId: 'ord_1002' },
        },
      ],
      'stop',
    ]);

    const result = await createAgent(model, orders).generate({
      prompt: 'Cancel order ord_1002',
    });

    expect(toolOutputs(result)).toEqual([]);
    expect(orders.findForUser('demo-user', 'ord_1002').status).toBe('pending');
    expect(
      result.content.some(
        (part) =>
          typeof part === 'object' &&
          part !== null &&
          'type' in part &&
          (part as { type: string }).type === 'tool-approval-request',
      ),
    ).toBe(true);
  });

  it('stops after the step budget instead of looping forever', async () => {
    const { model, getCallCount } = createScriptedModel(
      Array.from({ length: 20 }, (_, i) => [
        {
          toolCallId: `call-${i}`,
          toolName: 'listOrders',
          input: {},
        },
      ]),
    );

    const result = await createAgent(model).generate({
      prompt: 'Keep listing orders',
    });

    expect(result.steps.length).toBe(8);
    expect(getCallCount()).toBe(8);
  });
});
