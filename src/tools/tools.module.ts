import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { CancelOrderTool } from './cancel-order.tool.js';
import { ListOrdersTool } from './list-orders.tool.js';
import { OrderLookupTool } from './order-lookup.tool.js';

@Module({
  imports: [OrdersModule],
  providers: [OrderLookupTool, ListOrdersTool, CancelOrderTool],
  exports: [OrdersModule, OrderLookupTool, ListOrdersTool, CancelOrderTool],
})
export class ToolsModule {}
