import { describe, expect, it } from 'vitest';
import { CancelOrderTool } from './cancel-order.tool.js';
import { OrdersService } from './orders.service.js';

describe('CancelOrderTool', () => {
  it('declares needsApproval so execute does not run until approved', () => {
    const orders = new OrdersService();
    const built = new CancelOrderTool(orders).build({
      userId: 'demo-user',
      requestId: 'test',
    });

    expect(built.needsApproval).toBe(true);
  });

  it('cancels a pending order for the current user when execute runs', async () => {
    const orders = new OrdersService();
    const built = new CancelOrderTool(orders).build({
      userId: 'demo-user',
      requestId: 'test',
    });

    const result = await built.execute!(
      { orderId: 'ord_1002' },
      {
        toolCallId: 'call-1',
        messages: [],
        abortSignal: new AbortController().signal,
      },
    );

    expect(result).toMatchObject({ id: 'ord_1002', status: 'cancelled' });
    expect(orders.findForUser('demo-user', 'ord_1002').status).toBe(
      'cancelled',
    );
  });
});
