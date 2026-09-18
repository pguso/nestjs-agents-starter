import { describe, expect, it, vi } from 'vitest';
import { MockLanguageModelV3 } from 'ai/test';
import { AssistantAgent } from './assistant.agent.js';
import { OrderLookupTool } from '../tools/order-lookup.tool.js';
import { ListOrdersTool } from '../tools/list-orders.tool.js';
import { OrdersService } from '../tools/orders.service.js';
import type { ModelService } from '../model/model.service.js';

const testUsage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 10,
    text: 10,
    reasoning: undefined,
  },
};

describe('AssistantAgent', () => {
  it('calls lookupOrder with the model-requested order id', async () => {
    const orders = new OrdersService();
    const findSpy = vi.spyOn(orders, 'findForUser');

    let callCount = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        callCount += 1;
        if (callCount === 1) {
          return {
            content: [
              {
                type: 'tool-call' as const,
                toolCallId: 'call-1',
                toolName: 'lookupOrder',
                input: JSON.stringify({ orderId: 'ord_1001' }),
              },
            ],
            finishReason: { unified: 'tool-calls' as const, raw: undefined },
            usage: testUsage,
            warnings: [],
          };
        }

        return {
          content: [{ type: 'text' as const, text: 'Order ord_1001 is shipped.' }],
          finishReason: { unified: 'stop' as const, raw: undefined },
          usage: testUsage,
          warnings: [],
        };
      },
    });

    const modelService = {
      getModel: () => model,
    } as unknown as ModelService;

    const agentFactory = new AssistantAgent(
      modelService,
      new OrderLookupTool(orders),
      new ListOrdersTool(orders),
    );

    const agent = agentFactory.create({ userId: 'demo-user' }, model);
    const result = await agent.generate({
      prompt: 'What is the status of order ord_1001?',
    });

    expect(findSpy).toHaveBeenCalledWith('demo-user', 'ord_1001');
    expect(callCount).toBe(2);
    expect(result.text).toContain('ord_1001');
  });
});
