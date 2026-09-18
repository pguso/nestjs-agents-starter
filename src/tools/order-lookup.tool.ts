import { Injectable } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import type { RequestContext } from '../common/request-context.js';
import { OrdersService } from './orders.service.js';

@Injectable()
export class OrderLookupTool {
  constructor(private readonly orders: OrdersService) {}

  build(ctx: RequestContext) {
    return tool({
      description:
        "Look up one of the current user's orders by id. Returns status, total, and items.",
      inputSchema: z.object({
        orderId: z.string().describe('The order id to look up'),
      }),
      execute: async ({ orderId }) => {
        const order = this.orders.findForUser(ctx.userId, orderId);
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
