export interface PrinterReceiptPayload {
    receiptNumber: string;
    tableNumber: number;
    tabName?: string;
    waiterName: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
        isCorkage?: boolean;
    }>;
    subtotal: number;
    corkageFee: number;
    total: number;
    tendered: number;
    change: number;
    paymentMethod: string;
    timestamp: string;
    isReprint?: boolean;
}
export interface IPrinterService {
    printReceipt(payload: PrinterReceiptPayload): Promise<boolean>;
    kickCashDrawer(): Promise<boolean>;
}
/**
 * ESC/POS Thermal Receipt Printer Driver for Linux USB character devices (/dev/usb/receipt-printer)
 */
export declare class UsbEscPosPrinter implements IPrinterService {
    private readonly devicePath;
    private readonly columns;
    constructor(devicePath?: string, columns?: number);
    printReceipt(payload: PrinterReceiptPayload): Promise<boolean>;
    kickCashDrawer(): Promise<boolean>;
    private renderReceiptBytes;
}
/**
 * Mock printer for local development and testing without physical hardware
 */
export declare class MockPrinter implements IPrinterService {
    printReceipt(payload: PrinterReceiptPayload): Promise<boolean>;
    kickCashDrawer(): Promise<boolean>;
}
