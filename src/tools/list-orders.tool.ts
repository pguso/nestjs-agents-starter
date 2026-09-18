import { Injectable } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import type { RequestContext } from '../common/request-context.js';
import { OrdersService } from '../orders/orders.service.js';

@Injectable()
export class ListOrdersTool {
  constructor(private readonly orders: OrdersService) {}

  build(ctx: RequestContext) {
    return tool({
      description: "List the current user's orders (id and status only).",
      inputSchema: z.object({}),
      execute: async () => {
        return this.orders.listForUser(ctx.userId).map((o) => ({
          id: o.id,
          status: o.status,
          totalCents: o.totalCents,
        }));
      },
    });
  }
}
