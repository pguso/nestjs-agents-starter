import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { AgentRegistry } from './agent.registry.js';
import { AssistantAgent } from './assistant.agent.js';
import type { NestAgent } from './agent.js';
import type { ModelService } from '../model/model.service.js';
import { CancelOrderTool } from '../tools/cancel-order.tool.js';
import { OrderLookupTool } from '../tools/order-lookup.tool.js';
import { ListOrdersTool } from '../tools/list-orders.tool.js';
import { OrdersService } from '../tools/orders.service.js';
import { createScriptedModel } from '../testing/mock-language-model.js';

function createAssistant() {
  const { model } = createScriptedModel(['stop']);
  const orders = new OrdersService();
  return new AssistantAgent(
    { getModel: () => model } as unknown as ModelService,
    new OrderLookupTool(orders),
    new ListOrdersTool(orders),
    new CancelOrderTool(orders),
  );
}

describe('AgentRegistry', () => {
  it('resolves the default assistant agent', () => {
    const registry = new AgentRegistry(createAssistant());
    expect(registry.get().id).toBe('assistant');
    expect(registry.get('assistant').id).toBe('assistant');
  });

  it('registers additional agents', () => {
    const registry = new AgentRegistry(createAssistant());
    const extra: NestAgent = {
      id: 'support',
      create: () => {
        throw new Error('not used');
      },
    };
    registry.register(extra);
    expect(registry.get('support').id).toBe('support');
    expect(registry.ids().sort()).toEqual(['assistant', 'support']);
  });

  it('throws NotFoundException for unknown ids', () => {
    const registry = new AgentRegistry(createAssistant());
    expect(() => registry.get('missing')).toThrow(NotFoundException);
  });
});
