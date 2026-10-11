export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number; // in centavos (PHP cents)
  category: string;
  stations: ('bar' | 'cafe' | 'food')[];
  isAvailable: boolean;
  isCorkage: boolean;
}

export interface TableItem {
  id: number;
  tableNumber: number;
  name: string;
  section: 'main_floor' | 'mezzanine' | 'bar_counter';
  capacity: number;
  status: 'EMPTY' | 'OCCUPIED' | 'PREPARING' | 'READY' | 'SERVED' | 'BILL_REQUESTED';
  currentOrderId: string | null;
  totalCentavos?: number;
}

export interface StationTicket {
  id: string;
  orderId: string;
  tableNumber: number;
  station: 'bar' | 'cafe' | 'food';
  status: 'NEW' | 'PREPARING' | 'READY' | 'SERVED';
  items: {
    id: string;
    name: string;
    quantity: number;
    notes?: string;
  }[];
  createdAt: string;
  elapsedMinutes: number;
}

export const INITIAL_MENU: MenuItem[] = [
  {
    id: 'menu-1',
    name: "Round Midnight Old Fashioned",
    description: "Bourbon, angostura bitters, smoked orange peel, demerara sugar",
    price: 45000,
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-2',
    name: "Blue Note Gin & Tonic",
    description: "Empress 1908 gin, premium tonic, rosemary sprig, dehydrated grapefruit",
    price: 42000,
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-3',
    name: "Miles Ahead Negroni",
    description: "Tanqueray gin, Campari, Antica Formula sweet vermouth",
    price: 48000,
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-4',
    name: "Birdland Whiskey Sour",
    description: "Rye whiskey, fresh lemon juice, simple syrup, egg white foam",
    price: 44000,
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-5',
    name: "Monk's Double Espresso",
    description: "Single-origin Ethiopian Yirgacheffe espresso extraction",
    price: 18000,
    category: "Coffee",
    stations: ["cafe"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-6',
    name: "Vanguard Pour-Over",
    description: "Hand-crafted pour over filter coffee with vibrant floral notes",
    price: 24000,
    category: "Coffee",
    stations: ["cafe"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-7',
    name: "Cold Brew Rhythm",
    description: "18-hour cold steeped Arabica with tonic & citrus twist",
    price: 22000,
    category: "Coffee",
    stations: ["cafe"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-8',
    name: "Truffle Parmesan Fries",
    description: "Hand-cut Idaho potatoes, white truffle oil, 24-mo parmesan, roasted garlic aioli",
    price: 32000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-9',
    name: "Monk's Wagyu Jazz Burger",
    description: "Brioche bun, Wagyu beef patty, gruyere, caramelized onions, bacon jam",
    price: 58000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-10',
    name: "Crispy Salt & Pepper Calamari",
    description: "Lightly battered squid, spiced sea salt, spicy marinara dip",
    price: 38000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-11',
    name: "Artisan Charcuterie Platter",
    description: "Prosciutto di Parma, salami, aged cheddar, brie, figs, water crackers",
    price: 75000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
  },
  {
    id: 'menu-12',
    name: "Outside Wine Corkage (20%)",
    description: "Guest bring-your-own wine bottle service & glassware",
    price: 150000,
    category: "Corkage",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: true,
  },
  {
    id: 'menu-13',
    name: "Outside Spirits Corkage (20%)",
    description: "Guest bring-your-own single malt or spirits bottle service",
    price: 250000,
    category: "Corkage",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: true,
  },
];

export const INITIAL_TABLES: TableItem[] = [
  { id: 1, tableNumber: 1, name: 'Table 1', section: 'main_floor', capacity: 2, status: 'OCCUPIED', currentOrderId: 'ord-101', totalCentavos: 87000 },
  { id: 2, tableNumber: 2, name: 'Table 2', section: 'main_floor', capacity: 4, status: 'EMPTY', currentOrderId: null },
  { id: 3, tableNumber: 3, name: 'Table 3', section: 'main_floor', capacity: 4, status: 'PREPARING', currentOrderId: 'ord-102', totalCentavos: 122000 },
  { id: 4, tableNumber: 4, name: 'Table 4', section: 'main_floor', capacity: 6, status: 'READY', currentOrderId: 'ord-103', totalCentavos: 90000 },
  { id: 5, tableNumber: 5, name: 'Table 5', section: 'main_floor', capacity: 4, status: 'EMPTY', currentOrderId: null },
  { id: 6, tableNumber: 6, name: 'Table 6', section: 'main_floor', capacity: 4, status: 'BILL_REQUESTED', currentOrderId: 'ord-104', totalCentavos: 185000 },
  { id: 7, tableNumber: 7, name: 'Table 7', section: 'main_floor', capacity: 4, status: 'SERVED', currentOrderId: 'ord-105', totalCentavos: 45000 },
  { id: 8, tableNumber: 8, name: 'Table 8', section: 'main_floor', capacity: 6, status: 'EMPTY', currentOrderId: null },
  { id: 9, tableNumber: 9, name: 'VIP Lounge 9', section: 'mezzanine', capacity: 8, status: 'OCCUPIED', currentOrderId: 'ord-106', totalCentavos: 340000 },
  { id: 10, tableNumber: 10, name: 'Stage Booth 10', section: 'mezzanine', capacity: 4, status: 'EMPTY', currentOrderId: null },
  { id: 11, tableNumber: 11, name: 'Bar 1', section: 'bar_counter', capacity: 1, status: 'SERVED', currentOrderId: 'ord-107', totalCentavos: 45000 },
  { id: 12, tableNumber: 12, name: 'Bar 2', section: 'bar_counter', capacity: 1, status: 'OCCUPIED', currentOrderId: 'ord-108', totalCentavos: 48000 },
  { id: 13, tableNumber: 13, name: 'Bar 3', section: 'bar_counter', capacity: 1, status: 'EMPTY', currentOrderId: null },
  { id: 14, tableNumber: 14, name: 'Bar 4', section: 'bar_counter', capacity: 1, status: 'EMPTY', currentOrderId: null },
];

export const INITIAL_TICKETS: StationTicket[] = [
  {
    id: 'tkt-101',
    orderId: 'ord-102',
    tableNumber: 3,
    station: 'bar',
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
    elapsedMinutes: 4,
    items: [
      { id: 'item-1', name: 'Round Midnight Old Fashioned', quantity: 2, notes: 'Smoked oak, extra ice' },
      { id: 'item-2', name: 'Miles Ahead Negroni', quantity: 1 },
    ],
  },
  {
    id: 'tkt-102',
    orderId: 'ord-103',
    tableNumber: 4,
    station: 'food',
    status: 'READY',
    createdAt: new Date(Date.now() - 11 * 60000).toISOString(),
    elapsedMinutes: 11,
    items: [
      { id: 'item-3', name: "Monk's Wagyu Jazz Burger", quantity: 2, notes: 'Medium rare, no pickles' },
      { id: 'item-4', name: 'Truffle Parmesan Fries', quantity: 1 },
    ],
  },
  {
    id: 'tkt-103',
    orderId: 'ord-106',
    tableNumber: 9,
    station: 'cafe',
    status: 'NEW',
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
    elapsedMinutes: 2,
    items: [
      { id: 'item-5', name: "Monk's Double Espresso", quantity: 3, notes: 'Hot water on side' },
      { id: 'item-6', name: 'Cold Brew Rhythm', quantity: 1 },
    ],
  },
  {
    id: 'tkt-104',
    orderId: 'ord-109',
    tableNumber: 1,
    station: 'bar',
    status: 'NEW',
    createdAt: new Date(Date.now() - 1 * 60000).toISOString(),
    elapsedMinutes: 1,
    items: [
      { id: 'item-7', name: 'Blue Note Gin & Tonic', quantity: 2 },
    ],
  },
];

export interface StaffUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'waiter_cashier' | 'barista' | 'kitchen' | 'bartender';
  pin: string;
  avatarIcon?: string;
}

export const SEED_STAFF_USERS: StaffUser[] = [
  {
    id: 'user-waiter-1',
    username: 'waiter1',
    displayName: 'Server Chet',
    role: 'waiter_cashier',
    pin: '1111',
  },
  {
    id: 'user-waiter-2',
    username: 'waiter2',
    displayName: 'Server Nina',
    role: 'waiter_cashier',
    pin: '2222',
  },
  {
    id: 'user-admin',
    username: 'admin',
    displayName: 'Manager Miles',
    role: 'admin',
    pin: '9999',
  },
  {
    id: 'user-barista',
    username: 'barista',
    displayName: 'Barista Sam',
    role: 'barista',
    pin: '0002',
  },
  {
    id: 'user-kitchen',
    username: 'kitchen',
    displayName: 'Chef Leo',
    role: 'kitchen',
    pin: '0003',
  },
  {
    id: 'user-bartender',
    username: 'bartender',
    displayName: 'Bartender Max',
    role: 'bartender',
    pin: '0001',
  },
];

