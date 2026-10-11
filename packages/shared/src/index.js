import { z } from 'zod';
export const RoleEnum = z.enum(['admin', 'cashier', 'waiter', 'station_bar', 'station_cafe', 'station_food']);
export const StationEnum = z.enum(['cafe', 'bar', 'food']);
export const TicketStatusEnum = z.enum(['NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']);
export const TableStatusEnum = z.enum(['EMPTY', 'OCCUPIED', 'PREPARING', 'READY', 'SERVED', 'BILL_REQUESTED']);
export const PaymentMethodEnum = z.enum(['CASH', 'CARD', 'E_WALLET']);
export const CorkageRate = 0.20; // 20% flat corkage fee
// Order item payload
export const CreateOrderItemSchema = z.object({
    menuItemId: z.string().uuid(),
    name: z.string().min(1),
    price: z.number().int().nonnegative(), // in centavos/cents (integer)
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
    stations: z.array(StationEnum),
    isCorkageItem: z.boolean().default(false),
});
// Order creation command
export const CreateOrderSchema = z.object({
    tableNumber: z.number().int().positive(),
    tabName: z.string().optional(),
    items: z.array(CreateOrderItemSchema).min(1),
    waiterId: z.string().uuid(),
});
// Ticket Status Update
export const UpdateTicketStatusSchema = z.object({
    status: TicketStatusEnum,
    updatedBy: z.string().uuid(),
});
// Payment Record
export const RecordPaymentSchema = z.object({
    tabId: z.string().uuid(),
    tenderedAmount: z.number().int().positive(),
    totalDue: z.number().int().positive(),
    method: PaymentMethodEnum,
    referenceNumber: z.string().optional(),
    cashierId: z.string().uuid(),
});
// Reprint Receipt (PC Counter Station)
export const ReprintReceiptSchema = z.object({
    orderId: z.string().uuid(),
    reason: z.string().min(3),
    requestedBy: z.string().uuid(),
    approverPin: z.string().length(4).optional(),
});
// Cash Drawer Pulse (PC Counter Station)
export const KickDrawerSchema = z.object({
    pin: z.string().length(4), // Manager/Cashier PIN required to pop drawer manually
    userId: z.string().uuid(),
    reason: z.string().default('Manual Open / Change'),
});
// Void Order Item
export const VoidOrderItemSchema = z.object({
    orderItemId: z.string().uuid(),
    reason: z.string().min(3),
    approverPin: z.string().length(4), // 4-digit manager PIN
    requesterId: z.string().uuid(),
});
// Chat Message
export const ChatMessageSchema = z.object({
    channel: z.enum(['all', 'bar', 'cafe', 'food', 'admin']),
    senderId: z.string().uuid(),
    senderName: z.string(),
    senderRole: z.string(),
    content: z.string().min(1),
    isUrgent: z.boolean().default(false),
    tableContext: z.number().int().optional(),
});
export * from './hlc.js';
