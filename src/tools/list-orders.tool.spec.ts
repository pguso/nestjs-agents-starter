import { describe, expect, it } from 'vitest';
import { OrdersService } from './orders.service.js';
import { ListOrdersTool } from './list-orders.tool.js';

describe('ListOrdersTool', () => {
  it('returns id, status, and totalCents for the current user only', async () => {
    const toolProvider = new ListOrdersTool(new OrdersService());
    const built = toolProvider.build({
      userId: 'demo-user',
      requestId: 'test',
    });

    const result = await built.execute!(
      {},
      {
        toolCallId: 't1',
        messages: [],
        abortSignal: new AbortController().signal,
      },
    );

    expect(result).toEqual([
      { id: 'ord_1001', status: 'shipped', totalCents: 4299 },
      { id: 'ord_1002', status: 'pending', totalCents: 1999 },
    ]);
  });

  it('never returns another users orders', async () => {
    const toolProvider = new ListOrdersTool(new OrdersService());
    const built = toolProvider.build({
      userId: 'other-user',
      requestId: 'test',
    });

    const result = await built.execute!(
      {},
      {
        toolCallId: 't2',
        messages: [],
        abortSignal: new AbortController().signal,
      },
    );

    expect(result).toEqual([
      { id: 'ord_2001', status: 'delivered', totalCents: 9999 },
    ]);
    expect(result).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'ord_1001' })]),
    );
  });
});
