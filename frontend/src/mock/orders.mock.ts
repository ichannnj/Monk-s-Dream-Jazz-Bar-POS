import type { TakeoutOrder, OnlineDeliveryOrder } from '../types/floor';

export const SEED_TAKEOUT_ORDERS: TakeoutOrder[] = [
  {
    id: 'to-105',
    ticketNumber: 'T-105',
    customerName: 'Sarah Jenkins',
    total: 9.8,
    status: 'ready',
    elapsedTime: '6m',
    isPrepaid: true,
    notes: 'To-Go Cup, less ice',
    items: [
      {
        id: 'to-item-1',
        productId: 'm-flat-white',
        productName: 'Flat White (Iced)',
        unitPrice: 5.0,
        quantity: 1,
        stationTarget: 'bar',
        modifiers: ['Oat Milk Swap'],
        status: 'ready',
      },
      {
        id: 'to-item-2',
        productId: 'm-resold-croissant',
        productName: 'Bakery Almond Croissant (Pre-made)',
        unitPrice: 4.8,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'ready',
      },
    ],
  },
  {
    id: 'to-106',
    ticketNumber: 'T-106',
    customerName: 'Dave Miller',
    total: 23.0,
    status: 'preparing',
    elapsedTime: '11m',
    isPrepaid: false,
    items: [
      {
        id: 'to-item-3',
        productId: 'm-truffle-carbonara',
        productName: 'Truffle Carbonara',
        unitPrice: 18.0,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'preparing',
        notes: 'To-Go box, extra parmesan packet',
      },
      {
        id: 'to-item-4',
        productId: 'm-cold-brew',
        productName: 'Single Origin Cold Brew',
        unitPrice: 5.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
  },
];

// -------------------------------------------------------------
// ONLINE DELIVERY ORDERS (GrabFood & Foodpanda)

export const SEED_ONLINE_ORDERS: OnlineDeliveryOrder[] = [
  {
    id: 'od-grab-1',
    platform: 'grabfood',
    platformOrderRef: 'GF-8842',
    riderName: 'Mike (GrabBike)',
    customerName: 'Kevin Zhao',
    total: 32.0,
    status: 'ready',
    elapsedTime: '16m',
    paymentStatus: 'PAID_ONLINE_GRAB',
    items: [
      {
        id: 'od-item-1',
        productId: 'm-truffle-carbonara',
        productName: 'Truffle Carbonara',
        unitPrice: 18.0,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'ready',
      },
      {
        id: 'od-item-2',
        productId: 'm-classic-negroni',
        productName: 'Monk’s Classic Negroni (Bottled)',
        unitPrice: 14.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
  },
  {
    id: 'od-panda-1',
    platform: 'foodpanda',
    platformOrderRef: 'FP-3012',
    riderName: 'Dave (Pink Vespa)',
    customerName: 'Aria Montgomery',
    total: 21.0,
    status: 'preparing',
    elapsedTime: '8m',
    paymentStatus: 'PAID_ONLINE_FOODPANDA',
    items: [
      {
        id: 'od-item-3',
        productId: 'm-margherita-pizza',
        productName: 'Wood-Fired Margherita Pizza',
        unitPrice: 16.0,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'preparing',
      },
      {
        id: 'od-item-4',
        productId: 'm-cold-brew',
        productName: 'Single Origin Cold Brew',
        unitPrice: 5.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
  },
];

// -------------------------------------------------------------
// CHECKS & SETTLED RECEIPTS HISTORY
