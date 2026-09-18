import { Module } from '@nestjs/common';
import { ListOrdersTool } from './list-orders.tool.js';
import { OrderLookupTool } from './order-lookup.tool.js';
import { OrdersService } from './orders.service.js';

@Module({
  providers: [OrdersService, OrderLookupTool, ListOrdersTool],
  exports: [OrdersService, OrderLookupTool, ListOrdersTool],
})
export class ToolsModule {}
