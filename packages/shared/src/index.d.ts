import { z } from 'zod';
export declare const StationEnum: z.ZodEnum<["cafe", "bar", "food"]>;
export type Station = z.infer<typeof StationEnum>;
export declare const TicketStatusEnum: z.ZodEnum<["NEW", "PREPARING", "READY", "SERVED", "CANCELLED"]>;
export type TicketStatus = z.infer<typeof TicketStatusEnum>;
export declare const TableStatusEnum: z.ZodEnum<["EMPTY", "OCCUPIED", "PREPARING", "READY", "SERVED", "BILL_REQUESTED"]>;
export type TableStatus = z.infer<typeof TableStatusEnum>;
export declare const PaymentMethodEnum: z.ZodEnum<["CASH", "CARD", "E_WALLET"]>;
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;
export declare const CorkageRate = 0.2;
export declare const CreateOrderItemSchema: z.ZodObject<{
    menuItemId: z.ZodString;
    name: z.ZodString;
    price: z.ZodNumber;
    quantity: z.ZodNumber;
    notes: z.ZodOptional<z.ZodString>;
    stations: z.ZodArray<z.ZodEnum<["cafe", "bar", "food"]>, "many">;
    isCorkageItem: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    stations: ("cafe" | "bar" | "food")[];
    isCorkageItem: boolean;
    notes?: string | undefined;
}, {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    stations: ("cafe" | "bar" | "food")[];
    notes?: string | undefined;
    isCorkageItem?: boolean | undefined;
}>;
export type CreateOrderItem = z.infer<typeof CreateOrderItemSchema>;
export declare const CreateOrderSchema: z.ZodObject<{
    tableNumber: z.ZodNumber;
    tabName: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        menuItemId: z.ZodString;
        name: z.ZodString;
        price: z.ZodNumber;
        quantity: z.ZodNumber;
        notes: z.ZodOptional<z.ZodString>;
        stations: z.ZodArray<z.ZodEnum<["cafe", "bar", "food"]>, "many">;
        isCorkageItem: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        menuItemId: string;
        name: string;
        price: number;
        quantity: number;
        stations: ("cafe" | "bar" | "food")[];
        isCorkageItem: boolean;
        notes?: string | undefined;
    }, {
        menuItemId: string;
        name: string;
        price: number;
        quantity: number;
        stations: ("cafe" | "bar" | "food")[];
        notes?: string | undefined;
        isCorkageItem?: boolean | undefined;
    }>, "many">;
    waiterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tableNumber: number;
    items: {
        menuItemId: string;
        name: string;
        price: number;
        quantity: number;
        stations: ("cafe" | "bar" | "food")[];
        isCorkageItem: boolean;
        notes?: string | undefined;
    }[];
    waiterId: string;
    tabName?: string | undefined;
}, {
    tableNumber: number;
    items: {
        menuItemId: string;
        name: string;
        price: number;
        quantity: number;
        stations: ("cafe" | "bar" | "food")[];
        notes?: string | undefined;
        isCorkageItem?: boolean | undefined;
    }[];
    waiterId: string;
    tabName?: string | undefined;
}>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export declare const UpdateTicketStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["NEW", "PREPARING", "READY", "SERVED", "CANCELLED"]>;
    updatedBy: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
    updatedBy: string;
}, {
    status: "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
    updatedBy: string;
}>;
export type UpdateTicketStatus = z.infer<typeof UpdateTicketStatusSchema>;
export declare const RecordPaymentSchema: z.ZodObject<{
    tabId: z.ZodString;
    tenderedAmount: z.ZodNumber;
    totalDue: z.ZodNumber;
    method: z.ZodEnum<["CASH", "CARD", "E_WALLET"]>;
    referenceNumber: z.ZodOptional<z.ZodString>;
    cashierId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tabId: string;
    tenderedAmount: number;
    totalDue: number;
    method: "CASH" | "CARD" | "E_WALLET";
    cashierId: string;
    referenceNumber?: string | undefined;
}, {
    tabId: string;
    tenderedAmount: number;
    totalDue: number;
    method: "CASH" | "CARD" | "E_WALLET";
    cashierId: string;
    referenceNumber?: string | undefined;
}>;
export type RecordPayment = z.infer<typeof RecordPaymentSchema>;
export declare const VoidOrderItemSchema: z.ZodObject<{
    orderItemId: z.ZodString;
    reason: z.ZodString;
    approverPin: z.ZodString;
    requesterId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderItemId: string;
    reason: string;
    approverPin: string;
    requesterId: string;
}, {
    orderItemId: string;
    reason: string;
    approverPin: string;
    requesterId: string;
}>;
export type VoidOrderItem = z.infer<typeof VoidOrderItemSchema>;
export declare const ChatMessageSchema: z.ZodObject<{
    channel: z.ZodEnum<["all", "bar", "cafe", "food", "admin"]>;
    senderId: z.ZodString;
    senderName: z.ZodString;
    senderRole: z.ZodString;
    content: z.ZodString;
    isUrgent: z.ZodDefault<z.ZodBoolean>;
    tableContext: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    channel: "cafe" | "bar" | "food" | "all" | "admin";
    senderId: string;
    senderName: string;
    senderRole: string;
    content: string;
    isUrgent: boolean;
    tableContext?: number | undefined;
}, {
    channel: "cafe" | "bar" | "food" | "all" | "admin";
    senderId: string;
    senderName: string;
    senderRole: string;
    content: string;
    isUrgent?: boolean | undefined;
    tableContext?: number | undefined;
}>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export * from './hlc.js';
