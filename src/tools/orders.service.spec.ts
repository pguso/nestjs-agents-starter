import { describe, expect, it } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  it('returns the owned order for the current user', () => {
    const orders = new OrdersService();

    expect(orders.findForUser('demo-user', 'ord_1001')).toMatchObject({
      id: 'ord_1001',
      userId: 'demo-user',
      status: 'shipped',
      totalCents: 4299,
      items: ['NestJS sticker pack', 'Agent mug'],
    });
  });

  it('throws NotFoundException for an unknown order id', () => {
    const orders = new OrdersService();

    expect(() => orders.findForUser('demo-user', 'ord_missing')).toThrow(
      NotFoundException,
    );
    expect(() => orders.findForUser('demo-user', 'ord_missing')).toThrow(
      /Order ord_missing was not found for the current user/,
    );
  });

  it("throws NotFoundException for another user's order", () => {
    const orders = new OrdersService();

    expect(() => orders.findForUser('demo-user', 'ord_2001')).toThrow(
      NotFoundException,
    );
    expect(() => orders.findForUser('demo-user', 'ord_2001')).toThrow(
      /not found for the current user/,
    );
  });

  it('lists only the current user orders', () => {
    const orders = new OrdersService();

    expect(orders.listForUser('demo-user').map((o) => o.id)).toEqual([
      'ord_1001',
      'ord_1002',
    ]);
    expect(orders.listForUser('other-user').map((o) => o.id)).toEqual([
      'ord_2001',
    ]);
  });

  it('keeps seed data local to each instance', () => {
    const a = new OrdersService();
    const b = new OrdersService();

    expect(a.listForUser('demo-user')).toEqual(b.listForUser('demo-user'));
    expect(a.listForUser('demo-user')).not.toBe(b.listForUser('demo-user'));
  });
});
