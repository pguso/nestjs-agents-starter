import { Injectable } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import type { RequestContext } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';

/**
 * Write tool that requires human approval before execute runs.
 * The AI SDK surfaces a `tool-approval-request`; the client must approve/deny
 * (see `examples/chat-ui` and lesson 4).
 */
@Injectable()
export class CancelOrderTool {
  constructor(private readonly orders: OrdersService) {}

  build(ctx: RequestContext) {
    return tool({
      description:
        "Cancel one of the current user's pending orders. Requires explicit user approval before it runs.",
      inputSchema: z.object({
        orderId: z.string().describe('The pending order id to cancel'),
      }),
      needsApproval: true,
      execute: async ({ orderId }) => {
        const order = this.orders.cancelForUser(ctx.userId, orderId);
        return {
          id: order.id,
          status: order.status,
          totalCents: order.totalCents,
          items: order.items,
        };
      },
    });
  }
}
