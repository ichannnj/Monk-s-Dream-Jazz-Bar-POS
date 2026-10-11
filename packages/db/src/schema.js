import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, bigserial } from 'drizzle-orm/pg-core';
// Menu Items
export const menuItems = pgTable('menu_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').notNull(), // Centavos
    category: text('category').notNull(), // Beverage, Cocktails, Food, Coffee
    stations: jsonb('stations').notNull().$type(), // ['bar', 'cafe', 'food']
    isAvailable: boolean('is_available').notNull().default(true),
    isCorkage: boolean('is_corkage').notNull().default(false),
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// Orders
export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    commandId: uuid('command_id').notNull().unique(), // Idempotency key
    tableNumber: integer('table_number').notNull(),
    tabName: text('tab_name').default('Main Tab'),
    status: text('status').notNull().default('OPEN'), // OPEN, CLOSED, VOIDED
    waiterId: uuid('waiter_id').notNull(),
    totalAmount: integer('total_amount').notNull().default(0),
    corkageAmount: integer('corkage_amount').notNull().default(0),
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// Order Items
export const orderItems = pgTable('order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    menuItemId: uuid('menu_item_id').notNull(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    quantity: integer('quantity').notNull().default(1),
    isCorkage: boolean('is_corkage').notNull().default(false),
    notes: text('notes'),
    status: text('status').notNull().default('NEW'), // NEW, PREPARING, READY, SERVED, VOIDED
    voidReason: text('void_reason'),
    voidApprovedBy: uuid('void_approved_by'),
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// Station Tickets (KDS Routing)
export const stationTickets = pgTable('station_tickets', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    station: text('station').notNull(), // 'cafe' | 'bar' | 'food'
    status: text('status').notNull().default('NEW'), // NEW | PREPARING | READY | SERVED
    tableNumber: integer('table_number').notNull(),
    items: jsonb('items').notNull(), // Snapshot of items routed to this station
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// Real-time Event Log (for client resumption & seq replay)
export const eventLog = pgTable('event_log', {
    seq: bigserial('seq', { mode: 'number' }).primaryKey(),
    eventType: text('event_type').notNull(), // 'ticket.created', 'table.updated', etc.
    room: text('room').notNull(), // 'station:bar', 'floor', etc.
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// Print Jobs (Transactional Durable Queue for USB receipt printer)
export const printJobs = pgTable('print_jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(), // 'receipt' | 'bill' | 'z_report'
    payload: jsonb('payload').notNull(),
    status: text('status').notNull().default('PENDING'), // PENDING, PRINTING, DONE, FAILED
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    printedAt: timestamp('printed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// Transactional Outbox (for Cloud Sync to Supabase)
export const syncOutbox = pgTable('sync_outbox', {
    seq: bigserial('seq', { mode: 'number' }).primaryKey(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id').notNull(),
    op: text('op').notNull(), // 'upsert' | 'delete'
    rowData: jsonb('row_data').notNull(),
    hlc: text('hlc').notNull(),
    ackedAt: timestamp('acked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
