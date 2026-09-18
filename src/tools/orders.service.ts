import { Injectable, NotFoundException } from '@nestjs/common';

export interface Order {
  id: string;
  userId: string;
  status: 'pending' | 'shipped' | 'delivered';
  totalCents: number;
  items: string[];
}

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [
    {
      id: 'ord_1001',
      userId: 'demo-user',
      status: 'shipped',
      totalCents: 4299,
      items: ['NestJS sticker pack', 'Agent mug'],
    },
    {
      id: 'ord_1002',
      userId: 'demo-user',
      status: 'pending',
      totalCents: 1999,
      items: ['Clean Architecture paperback'],
    },
    {
      id: 'ord_2001',
      userId: 'other-user',
      status: 'delivered',
      totalCents: 9999,
      items: ['Secret laptop'],
    },
  ];

  findForUser(userId: string, orderId: string): Order {
    const order = this.orders.find((o) => o.id === orderId && o.userId === userId);
    if (!order) {
      throw new NotFoundException(
        `Order ${orderId} was not found for the current user`,
      );
    }
    return order;
  }

  listForUser(userId: string): Order[] {
    return this.orders.filter((o) => o.userId === userId);
  }
}
