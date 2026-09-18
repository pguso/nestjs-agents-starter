import { Injectable } from '@nestjs/common';
import { ToolLoopAgent, stepCountIs } from 'ai';
import type { LanguageModel } from 'ai';
import type { RequestContext } from '../common/request-context.js';
import { ModelService } from '../model/model.service.js';
import { ListOrdersTool } from '../tools/list-orders.tool.js';
import { OrderLookupTool } from '../tools/order-lookup.tool.js';
import type { NestAgent } from './agent.js';

const MAX_STEPS = 8;

@Injectable()
export class AssistantAgent implements NestAgent {
  readonly id = 'assistant';

  constructor(
    private readonly modelService: ModelService,
    private readonly orderLookup: OrderLookupTool,
    private readonly listOrders: ListOrdersTool,
  ) {}

  // Return type inferred from ToolLoopAgent; NestAgent.create is intentionally loose.
  create(ctx: RequestContext, model?: LanguageModel) {
    return new ToolLoopAgent({
      model: model ?? this.modelService.getModel(),
      instructions: [
        'You are a helpful shopping assistant for a NestJS demo shop.',
        "You can list the current user's orders and look up a single order by id.",
        "Never invent order ids or claim access to other users' data.",
        'Prefer calling tools over guessing.',
      ].join(' '),
      tools: {
        listOrders: this.listOrders.build(ctx),
        lookupOrder: this.orderLookup.build(ctx),
      },
      stopWhen: stepCountIs(MAX_STEPS),
    });
  }
}
