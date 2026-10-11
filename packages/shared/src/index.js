import { z } from 'zod';
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
