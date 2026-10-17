import type { CheckItem, DrawerEntry, FloorAlert, ChatMessage } from '../types/floor';

export const SEED_CHECKS: CheckItem[] = [
  {
    id: 'chk-1041',
    checkNumber: '#1041',
    orderType: 'dine_in',
    tableOrRef: 'Table 4',
    guestName: 'Bill Evans',
    itemsCount: 3,
    subtotal: 38.0,
    tax: 3.8,
    total: 41.8,
    paymentMethod: 'card',
    status: 'paid',
    timestamp: '20:15',
    cashierName: 'Coltrane (Cashier)',
    itemsSummary: '1x Flat White, 1x Carbonara, 1x Tiramisu',
  },
  {
    id: 'chk-1040',
    checkNumber: '#1040',
    orderType: 'takeout',
    tableOrRef: 'Takeout #T-104',
    guestName: 'Rachel Green',
    itemsCount: 2,
    subtotal: 9.5,
    tax: 0.95,
    total: 10.45,
    paymentMethod: 'cash',
    status: 'paid',
    timestamp: '19:50',
    cashierName: 'Jess Santos',
    itemsSummary: '2x Iced Americano',
  },
  {
    id: 'chk-1039',
    checkNumber: '#1039',
    orderType: 'online_delivery',
    tableOrRef: 'GrabFood #GF-8839',
    guestName: 'Carlos M.',
    itemsCount: 2,
    subtotal: 27.0,
    tax: 2.7,
    total: 29.7,
    paymentMethod: 'platform_prepaid',
    status: 'paid',
    timestamp: '19:30',
    cashierName: 'Coltrane (Cashier)',
    itemsSummary: '1x Margherita Pizza, 1x Truffle Fries',
  },
  {
    id: 'chk-1038',
    checkNumber: '#1038',
    orderType: 'dine_in',
    tableOrRef: 'Bar Seat 2',
    guestName: 'Wayne Shorter',
    itemsCount: 1,
    subtotal: 14.0,
    tax: 1.4,
    total: 15.4,
    paymentMethod: 'digital_wallet',
    status: 'paid',
    timestamp: '19:12',
    cashierName: 'Jess Santos',
    itemsSummary: '1x Monk’s Classic Negroni',
  },
];

// -------------------------------------------------------------
// CASH DRAWER TRANSACTIONS & RECONCILIATION

export const SEED_DRAWER_TRANSACTIONS: DrawerEntry[] = [
  {
    id: 'drw-1',
    type: 'float',
    amount: 200.0,
    reason: 'Shift Opening Cash Float',
    performedBy: 'Coltrane (Cashier)',
    timestamp: '08:00',
  },
  {
    id: 'drw-2',
    type: 'sale',
    amount: 10.45,
    reason: 'Takeout #T-104 Cash Payment',
    performedBy: 'Jess Santos',
    timestamp: '19:50',
  },
  {
    id: 'drw-3',
    type: 'cash_out',
    amount: -15.0,
    reason: 'Emergency ice bag purchase for bar',
    performedBy: 'Thelonious (Bartender)',
    timestamp: '18:40',
  },
  {
    id: 'drw-4',
    type: 'cash_in',
    amount: 50.0,
    reason: 'Small denomination change restock ($1 & $5 bills)',
    performedBy: 'Miles (Manager)',
    timestamp: '17:20',
  },
  {
    id: 'drw-5',
    type: 'drop',
    amount: -100.0,
    reason: 'Mid-shift safe cash drop (Excess cash)',
    performedBy: 'Miles (Manager)',
    timestamp: '16:00',
  },
];

// -------------------------------------------------------------
// FLOOR ALERTS & BUZZOUT NOTIFICATIONS

export const SEED_ALERTS: FloorAlert[] = [
  {
    id: 'alt-1',
    title: '🔔 Order #1042 Ready for Table B2',
    description: 'Bar and Kitchen stations have completed prep. Ready for FOH buzzout delivery.',
    type: 'station_ready',
    time: '2 mins ago',
    isRead: false,
    targetRef: 'B2',
  },
  {
    id: 'alt-2',
    title: '🔔 Takeout #T-105 Ready at Counter',
    description: 'Sarah Jenkins (Flat White & Croissant) packed and waiting at pickup pass.',
    type: 'station_ready',
    time: '5 mins ago',
    isRead: false,
    targetRef: 'T-105',
  },
  {
    id: 'alt-3',
    title: '⚠️ Auto-86 Alert: Matcha Latte',
    description: 'Uji Matcha powder depleted below 1 serving recipe threshold. Item greyed out on catalog.',
    type: 'auto_86',
    time: '14 mins ago',
    isRead: true,
  },
  {
    id: 'alt-4',
    title: '🔁 Station Re-route Broadcast',
    description: 'Table 4 Tab "Miles" relocated to Bar Seat 1. KDS destination cards updated.',
    type: 'transfer',
    time: '35 mins ago',
    isRead: true,
    targetRef: 'Bar 1',
  },
];

// -------------------------------------------------------------
// FLOOR & STATION CHAT

export const SEED_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'chat-1',
    channel: 'all',
    senderName: 'Chet (Chef)',
    senderRole: 'Kitchen',
    message: 'Carbonara prep line is flying tonight! 4 mins avg ticket time.',
    timestamp: '20:40',
  },
  {
    id: 'chat-2',
    channel: 'all',
    senderName: 'Jess Santos',
    senderRole: 'Waiter',
    message: 'Table C3 asking for extra bread and water carafes please.',
    timestamp: '20:42',
  },
  {
    id: 'chat-3',
    channel: 'bar',
    senderName: 'Thelonious',
    senderRole: 'Bartender',
    message: 'Running low on coupe cocktail glasses at the main bar rail.',
    timestamp: '20:30',
  },
  {
    id: 'chat-4',
    channel: 'kitchen',
    senderName: 'Ella',
    senderRole: 'Waiter',
    message: 'Heads up: Table B1 has a severe peanut allergy. Safe on carbonara?',
    timestamp: '20:35',
  },
  {
    id: 'chat-5',
    channel: 'kitchen',
    senderName: 'Chet (Chef)',
    senderRole: 'Kitchen',
    message: 'All clear! Zero peanuts in the pasta station.',
    timestamp: '20:36',
  },
];
