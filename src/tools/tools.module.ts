import { Module } from '@nestjs/common';
import { CancelOrderTool } from './cancel-order.tool.js';
import { ListOrdersTool } from './list-orders.tool.js';
import { OrderLookupTool } from './order-lookup.tool.js';
import { OrdersService } from './orders.service.js';

@Module({
  providers: [OrdersService, OrderLookupTool, ListOrdersTool, CancelOrderTool],
  exports: [OrdersService, OrderLookupTool, ListOrdersTool, CancelOrderTool],
})
export class ToolsModule {}
