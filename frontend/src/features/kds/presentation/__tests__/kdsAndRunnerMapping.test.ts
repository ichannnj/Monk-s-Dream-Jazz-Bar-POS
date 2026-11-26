import { describe, it, expect } from 'vitest';
import { mapDineInTableTickets, mapTakeoutTickets } from '../common/hooks/kdsTicketMapper';
import type { TableItem, TakeoutOrder } from '@/types/floor';

describe('KDS Ticket Mapper Stage & Partial Delivery Regressions', () => {
  it('places newly dispatched takeout orders into NEW stage when items are pending', () => {
    const takeoutOrders: TakeoutOrder[] = [
      {
        id: 'to-uuid-1',
        ticketNumber: 'T-107',
        customerName: 'Nina',
        items: [
          {
            id: 'item-1',
            productId: 'p1',
            productName: 'Cortado',
            stationTarget: 'bar',
            unitPrice: 180,
            quantity: 1,
            status: 'pending',
          },
        ],
        total: 180,
        status: 'preparing',
        isPrepaid: true,
        elapsedTime: '00:10',
        createdAt: '2026-11-21T10:00:00Z',
      },
    ];

    const tickets = mapTakeoutTickets(takeoutOrders, 'bar');
    expect(tickets).toHaveLength(1);
    expect(tickets[0].stage).toBe('new');
  });

  it('keeps dine-in round in READY stage when one item was served and remaining item is ready', () => {
    const tables: TableItem[] = [
      {
        id: 'tbl-1',
        code: 'T-01',
        area: 'indoor',
        capacity: 4,
        status: 'waiting_for_items',
        activeTabs: [1],
        totalAmount: 1000,
        tabs: [
          {
            id: 'tab-uuid-1',
            tabIndex: 1,
            guestName: 'Miles',
            status: 'open',
            totalAmount: 1000,
            openedAt: '10:00 PM',
            items: [
              {
                id: 'dc-1',
                productId: 'd1000001-0000-0000-0000-000000000001',
                productName: 'Event Door Charge',
                categorySlug: 'door_charge',
                stationTarget: 'bar',
                unitPrice: 300,
                quantity: 1,
                status: 'served',
                roundNumber: 1,
              },
              {
                id: 'bar-1',
                productId: 'p-1',
                productName: 'Old Fashioned',
                stationTarget: 'bar',
                unitPrice: 350,
                quantity: 1,
                status: 'served',
                roundNumber: 1,
              },
              {
                id: 'bar-2',
                productId: 'p-2',
                productName: 'Americano',
                stationTarget: 'bar',
                unitPrice: 150,
                quantity: 1,
                status: 'ready',
                roundNumber: 1,
              },
            ],
          },
        ],
      },
    ];

    const tickets = mapDineInTableTickets(tables, 'bar', []);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].stage).toBe('ready');
    // Door charge must never leak onto Bar KDS ticket items
    expect(tickets[0].items.some((i) => i.categorySlug === 'door_charge')).toBe(false);
  });

  it('moves partial-ready ticket (1 ready + 1 pending) out of NEW into PREPARING', () => {
    const tables: TableItem[] = [
      {
        id: 'tbl-2',
        code: 'T-02',
        area: 'cafe',
        capacity: 2,
        status: 'preparing',
        activeTabs: [1],
        totalAmount: 500,
        tabs: [
          {
            id: 'tab-uuid-2',
            tabIndex: 1,
            guestName: 'Coltrane',
            status: 'open',
            totalAmount: 500,
            openedAt: '10:00 PM',
            items: [
              {
                id: 'k-1',
                productId: 'p-10',
                productName: 'Truffle Fries',
                stationTarget: 'kitchen',
                unitPrice: 250,
                quantity: 1,
                status: 'ready',
                roundNumber: 1,
              },
              {
                id: 'k-2',
                productId: 'p-11',
                productName: 'Ribeye Steak',
                stationTarget: 'kitchen',
                unitPrice: 250,
                quantity: 1,
                status: 'pending',
                roundNumber: 1,
              },
            ],
          },
        ],
      },
    ];

    const tickets = mapDineInTableTickets(tables, 'kitchen', []);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].stage).toBe('preparing');
  });
});
