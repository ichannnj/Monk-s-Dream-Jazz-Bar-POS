import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, bigserial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// ==========================================
// 1. Staff & Authentication
// ==========================================
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull().unique(),
    displayName: text('display_name').notNull(),
    role: text('role').notNull(), // 'admin' | 'cashier' | 'waiter' | 'station_bar' | 'station_cafe' | 'station_food'
    pin: text('pin').notNull(), // 4-digit PIN for tablet speed-login & manager overrides
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 2. Floor Layout & Tables
// ==========================================
export const tables = pgTable('tables', {
    id: integer('id').primaryKey(),
    tableNumber: integer('table_number').notNull().unique(),
    name: text('name').notNull(),
    section: text('section').notNull().default('main_floor'), // 'main_floor' | 'bar_counter' | 'mezzanine'
    capacity: integer('capacity').notNull().default(4),
    status: text('status').notNull().default('EMPTY'), // 'EMPTY' | 'OCCUPIED' | 'PREPARING' | 'READY' | 'SERVED' | 'BILL_REQUESTED'
    currentOrderId: uuid('current_order_id'),
    posX: integer('pos_x').default(0),
    posY: integer('pos_y').default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 3. Menu Items
// ==========================================
export const menuItems = pgTable('menu_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    price: integer('price').notNull(), // Centavos / Cents
    category: text('category').notNull(), // 'Cocktails', 'Beverage', 'Coffee', 'Food', 'Corkage'
    stations: jsonb('stations').notNull().$type(), // ['bar', 'cafe', 'food']
    isAvailable: boolean('is_available').notNull().default(true),
    isCorkage: boolean('is_corkage').notNull().default(false),
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 4. Orders & Tabs
// ==========================================
export const orders = pgTable('orders', {
    id: uuid('id').primaryKey().defaultRandom(),
    commandId: uuid('command_id').notNull().unique(), // Idempotency key
    tableNumber: integer('table_number').notNull(),
    tabName: text('tab_name').default('Main Tab'),
    status: text('status').notNull().default('OPEN'), // 'OPEN' | 'CLOSED' | 'VOIDED'
    waiterId: uuid('waiter_id').notNull(),
    subtotal: integer('subtotal').notNull().default(0),
    corkageAmount: integer('corkage_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull().default(0),
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 5. Order Items
// ==========================================
export const orderItems = pgTable('order_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
    menuItemId: uuid('menu_item_id').notNull(),
    name: text('name').notNull(),
    price: integer('price').notNull(),
    quantity: integer('quantity').notNull().default(1),
    isCorkage: boolean('is_corkage').notNull().default(false),
    notes: text('notes'),
    status: text('status').notNull().default('NEW'), // 'NEW' | 'PREPARING' | 'READY' | 'SERVED' | 'VOIDED'
    voidReason: text('void_reason'),
    voidApprovedBy: uuid('void_approved_by'),
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 6. Station Tickets (KDS Routing)
// ==========================================
export const stationTickets = pgTable('station_tickets', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
    station: text('station').notNull(), // 'cafe' | 'bar' | 'food'
    status: text('status').notNull().default('NEW'), // 'NEW' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED'
    tableNumber: integer('table_number').notNull(),
    items: jsonb('items').notNull(), // Snapshot of routed items
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 7. Payments & Billing
// ==========================================
export const payments = pgTable('payments', {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').references(() => orders.id).notNull(),
    receiptNumber: text('receipt_number').notNull().unique(),
    totalDue: integer('total_due').notNull(),
    tenderedAmount: integer('tendered_amount').notNull(),
    changeAmount: integer('change_amount').notNull(),
    method: text('method').notNull(), // 'CASH' | 'CARD' | 'E_WALLET'
    referenceNumber: text('reference_number'),
    cashierId: uuid('cashier_id').notNull(),
    hlc: text('hlc').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 8. Real-time Event Log (Client resumption & seq replay)
// ==========================================
export const eventLog = pgTable('event_log', {
    seq: bigserial('seq', { mode: 'number' }).primaryKey(),
    eventType: text('event_type').notNull(), // 'ticket.created', 'ticket.updated', 'floor.table_updated', 'chat.message'
    room: text('room').notNull(), // 'station:bar', 'floor', 'chat:all', etc.
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 9. Print Jobs (Durable Queue for Thermal Printer)
// ==========================================
export const printJobs = pgTable('print_jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(), // 'receipt' | 'bill' | 'z_report'
    payload: jsonb('payload').notNull(),
    status: text('status').notNull().default('PENDING'), // 'PENDING' | 'PRINTING' | 'DONE' | 'FAILED'
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    printedAt: timestamp('printed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
// ==========================================
// 10. Transactional Outbox (Cloud Sync to Supabase)
// ==========================================
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
// ==========================================
// Relations
// ==========================================
export const ordersRelations = relations(orders, ({ many }) => ({
    items: many(orderItems),
    tickets: many(stationTickets),
    payments: many(payments),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
    order: one(orders, {
        fields: [orderItems.orderId],
        references: [orders.id],
    }),
}));
export const stationTicketsRelations = relations(stationTickets, ({ one }) => ({
    order: one(orders, {
        fields: [stationTickets.orderId],
        references: [orders.id],
    }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
    order: one(orders, {
        fields: [payments.orderId],
        references: [orders.id],
    }),
}));
