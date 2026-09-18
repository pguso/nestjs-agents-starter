import { describe, expect, it } from 'vitest';
import { OrdersService } from './orders.service.js';
import { OrderLookupTool } from './order-lookup.tool.js';

describe('OrderLookupTool', () => {
  const orders = new OrdersService();
  const toolProvider = new OrderLookupTool(orders);

  it('returns the order for the current user', async () => {
    const built = toolProvider.build({
      userId: 'demo-user',
      requestId: 'test',
    });
    const result = await built.execute!(
      { orderId: 'ord_1001' },
      {
        toolCallId: 't1',
        messages: [],
        abortSignal: new AbortController().signal,
      },
    );

    expect(result).toMatchObject({
      id: 'ord_1001',
      status: 'shipped',
    });
  });

  it("does not return another user's order", async () => {
    const built = toolProvider.build({
      userId: 'demo-user',
      requestId: 'test',
    });

    await expect(
      built.execute!(
        { orderId: 'ord_2001' },
        {
          toolCallId: 't2',
          messages: [],
          abortSignal: new AbortController().signal,
        },
      ),
    ).rejects.toThrow(/not found/i);
  });
});
