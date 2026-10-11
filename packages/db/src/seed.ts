import { getDb, schema } from './client.js';
import * as crypto from 'node:crypto';

export const SEED_USERS = [
  {
    id: crypto.randomUUID(),
    username: 'admin',
    displayName: 'Manager Miles',
    role: 'admin',
    pin: '9999',
    isActive: true,
  },
  {
    id: crypto.randomUUID(),
    username: 'cashier',
    displayName: 'Cashier Ella',
    role: 'cashier',
    pin: '5678',
    isActive: true,
  },
  {
    id: crypto.randomUUID(),
    username: 'waiter1',
    displayName: 'Server Chet',
    role: 'waiter',
    pin: '1111',
    isActive: true,
  },
  {
    id: crypto.randomUUID(),
    username: 'waiter2',
    displayName: 'Server Nina',
    role: 'waiter',
    pin: '2222',
    isActive: true,
  },
  {
    id: crypto.randomUUID(),
    username: 'bar_kds',
    displayName: 'Bar Station Tablet',
    role: 'station_bar',
    pin: '0001',
    isActive: true,
  },
  {
    id: crypto.randomUUID(),
    username: 'cafe_kds',
    displayName: 'Cafe Station Tablet',
    role: 'station_cafe',
    pin: '0002',
    isActive: true,
  },
  {
    id: crypto.randomUUID(),
    username: 'food_kds',
    displayName: 'Kitchen Food Tablet',
    role: 'station_food',
    pin: '0003',
    isActive: true,
  },
];

export const SEED_TABLES = [
  // Main Floor Tables
  { id: 1, tableNumber: 1, name: 'Table 1', section: 'main_floor', capacity: 2, posX: 80, posY: 100 },
  { id: 2, tableNumber: 2, name: 'Table 2', section: 'main_floor', capacity: 4, posX: 200, posY: 100 },
  { id: 3, tableNumber: 3, name: 'Table 3', section: 'main_floor', capacity: 4, posX: 320, posY: 100 },
  { id: 4, tableNumber: 4, name: 'Table 4', section: 'main_floor', capacity: 6, posX: 440, posY: 100 },
  { id: 5, tableNumber: 5, name: 'Table 5', section: 'main_floor', capacity: 4, posX: 80, posY: 240 },
  { id: 6, tableNumber: 6, name: 'Table 6', section: 'main_floor', capacity: 4, posX: 200, posY: 240 },
  { id: 7, tableNumber: 7, name: 'Table 7', section: 'main_floor', capacity: 4, posX: 320, posY: 240 },
  { id: 8, tableNumber: 8, name: 'Table 8', section: 'main_floor', capacity: 6, posX: 440, posY: 240 },
  // Mezzanine / Lounge
  { id: 9, tableNumber: 9, name: 'Table 9 (VIP)', section: 'mezzanine', capacity: 8, posX: 80, posY: 380 },
  { id: 10, tableNumber: 10, name: 'Table 10 (Stage)', section: 'mezzanine', capacity: 4, posX: 240, posY: 380 },
  // Bar Counter Seats
  { id: 11, tableNumber: 11, name: 'Bar Seat 1', section: 'bar_counter', capacity: 1, posX: 600, posY: 80 },
  { id: 12, tableNumber: 12, name: 'Bar Seat 2', section: 'bar_counter', capacity: 1, posX: 600, posY: 140 },
  { id: 13, tableNumber: 13, name: 'Bar Seat 3', section: 'bar_counter', capacity: 1, posX: 600, posY: 200 },
  { id: 14, tableNumber: 14, name: 'Bar Seat 4', section: 'bar_counter', capacity: 1, posX: 600, posY: 260 },
  { id: 15, tableNumber: 15, name: 'Bar Seat 5', section: 'bar_counter', capacity: 1, posX: 600, posY: 320 },
  { id: 16, tableNumber: 16, name: 'Bar Seat 6', section: 'bar_counter', capacity: 1, posX: 600, posY: 380 },
];

export const SEED_MENU_ITEMS = [
  // Signature Cocktails -> Bar Station
  {
    id: crypto.randomUUID(),
    name: "Round Midnight Old Fashioned",
    description: "Bourbon, angostura bitters, smoked orange peel, demarara sugar",
    price: 45000, // 450.00 PHP (in centavos)
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-001",
  },
  {
    id: crypto.randomUUID(),
    name: "Blue Note Gin & Tonic",
    description: "Empress 1908 gin, premium tonic, rosemary sprig, dehydrated grapefruit",
    price: 42000,
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-002",
  },
  {
    id: crypto.randomUUID(),
    name: "Miles Ahead Negroni",
    description: "Tanqueray gin, Campari, Antica Formula sweet vermouth",
    price: 48000,
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-003",
  },
  {
    id: crypto.randomUUID(),
    name: "Birdland Whiskey Sour",
    description: "Rye whiskey, fresh lemon juice, simple syrup, egg white foam",
    price: 44000,
    category: "Cocktails",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-004",
  },
  // Cafe & Specialty Beverages -> Cafe Station
  {
    id: crypto.randomUUID(),
    name: "Monk's Double Espresso",
    description: "Single-origin Ethiopian Yirgacheffe espresso extraction",
    price: 18000,
    category: "Coffee",
    stations: ["cafe"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-005",
  },
  {
    id: crypto.randomUUID(),
    name: "Vanguard Pour-Over",
    description: "Hand-crafted pour over filter coffee with fruity notes",
    price: 24000,
    category: "Coffee",
    stations: ["cafe"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-006",
  },
  {
    id: crypto.randomUUID(),
    name: "Cold Brew Rhythm",
    description: "18-hour cold steeped Arabica with tonic and citrus twist",
    price: 22000,
    category: "Coffee",
    stations: ["cafe"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-007",
  },
  // Kitchen Food -> Food Station
  {
    id: crypto.randomUUID(),
    name: "Truffle Parmesan Fries",
    description: "Hand-cut Idaho potatoes, white truffle oil, grated aged parmesan, roasted garlic aioli",
    price: 32000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-008",
  },
  {
    id: crypto.randomUUID(),
    name: "Monk's Wagyu Jazz Burger",
    description: "Brioche bun, Wagyu beef patty, gruyere cheese, caramelized onions, bacon jam",
    price: 58000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-009",
  },
  {
    id: crypto.randomUUID(),
    name: "Crispy Salt & Pepper Calamari",
    description: "Lightly battered squid, spiced sea salt, spicy marinara dip",
    price: 38000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-010",
  },
  {
    id: crypto.randomUUID(),
    name: "Artisan Charcuterie & Cheese Platter",
    description: "Prosciutto di Parma, salami, aged cheddar, brie, figs, water crackers",
    price: 75000,
    category: "Food",
    stations: ["food"],
    isAvailable: true,
    isCorkage: false,
    hlc: "seed-hlc-011",
  },
  // Corkage Items (Flat 20% corkage fee applies)
  {
    id: crypto.randomUUID(),
    name: "Outside Wine Bottle Corkage",
    description: "Guest outside bottle opened and served by waiter (20% corkage rate)",
    price: 150000, // 1500.00 declared value
    category: "Corkage",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: true,
    hlc: "seed-hlc-012",
  },
  {
    id: crypto.randomUUID(),
    name: "Outside Hard Liquor Bottle Corkage",
    description: "Guest outside whiskey/spirits bottle (20% corkage rate)",
    price: 250000, // 2500.00 declared value
    category: "Corkage",
    stations: ["bar"],
    isAvailable: true,
    isCorkage: true,
    hlc: "seed-hlc-013",
  },
];

export async function runSeed(dbInstance = getDb()) {
  console.log('[Seed] Seeding database with initial data...');

  // Seed Users
  for (const user of SEED_USERS) {
    await dbInstance
      .insert(schema.users)
      .values(user)
      .onConflictDoNothing({ target: schema.users.username });
  }
  console.log(`[Seed] Seeded ${SEED_USERS.length} staff users`);

  // Seed Tables
  for (const table of SEED_TABLES) {
    await dbInstance
      .insert(schema.tables)
      .values(table)
      .onConflictDoNothing({ target: schema.tables.tableNumber });
  }
  console.log(`[Seed] Seeded ${SEED_TABLES.length} tables`);

  // Seed Menu Items
  for (const item of SEED_MENU_ITEMS) {
    await dbInstance
      .insert(schema.menuItems)
      .values(item)
      .onConflictDoNothing({ target: schema.menuItems.id });
  }
  console.log(`[Seed] Seeded ${SEED_MENU_ITEMS.length} menu items`);

  console.log('[Seed] Seeding completed successfully!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}
