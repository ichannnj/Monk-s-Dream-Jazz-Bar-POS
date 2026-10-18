import * as fs from 'node:fs/promises';
/**
 * ESC/POS Thermal Receipt Printer Driver for Linux USB character devices (/dev/usb/receipt-printer)
 */
export class UsbEscPosPrinter {
    devicePath;
    columns;
    constructor(devicePath = '/dev/usb/receipt-printer', columns = 48) {
        this.devicePath = devicePath;
        this.columns = columns;
    }
    async printReceipt(payload) {
        const escpos = this.renderReceiptBytes(payload);
        try {
            await fs.writeFile(this.devicePath, escpos);
            return true;
        }
        catch (err) {
            console.error(`[UsbEscPosPrinter] Failed to write to ${this.devicePath}:`, err);
            throw err;
        }
    }
    async kickCashDrawer() {
        // ESC p 0 25 250 (pulse pin 2 for 50ms)
        const kickCommand = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
        try {
            await fs.writeFile(this.devicePath, kickCommand);
            return true;
        }
        catch (err) {
            console.error(`[UsbEscPosPrinter] Failed to kick cash drawer:`, err);
            return false;
        }
    }
    renderReceiptBytes(payload) {
        const parts = [];
        const push = (str) => parts.push(Buffer.from(str, 'utf-8'));
        const cmd = (bytes) => parts.push(Buffer.from(bytes));
        // Initialize printer: ESC @
        cmd([0x1b, 0x40]);
        // Center alignment: ESC a 1
        cmd([0x1b, 0x61, 0x01]);
        if (payload.isReprint) {
            push('*** REPRINT / DUPLICATE ***\n\n');
        }
        // Double height & double width header: GS ! 0x11
        cmd([0x1d, 0x21, 0x11]);
        push("MONK'S DREAM\nJAZZ BAR\n");
        cmd([0x1d, 0x21, 0x00]); // Normal text
        push('Digital Operations Platform\n');
        push('------------------------------------------------\n');
        // Left alignment: ESC a 0
        cmd([0x1b, 0x61, 0x00]);
        push(`Receipt #: ${payload.receiptNumber}\n`);
        push(`Date:      ${payload.timestamp}\n`);
        push(`Table:     ${payload.tableNumber} (${payload.tabName || 'Main'})\n`);
        push(`Staff:     ${payload.waiterName}\n`);
        push('------------------------------------------------\n');
        // Items list
        for (const item of payload.items) {
            const nameCol = `${item.quantity}x ${item.name}`.slice(0, 32).padEnd(34, ' ');
            const priceCol = (item.total / 100).toFixed(2).padStart(12, ' ');
            push(`${nameCol}${priceCol}\n`);
            if (item.isCorkage) {
                push(`   [Corkage 20% Applied]\n`);
            }
        }
        push('------------------------------------------------\n');
        push(`Subtotal:    ${(payload.subtotal / 100).toFixed(2).padStart(34, ' ')}\n`);
        if (payload.corkageFee > 0) {
            push(`Corkage Fee: ${(payload.corkageFee / 100).toFixed(2).padStart(34, ' ')}\n`);
        }
        // Bold Total: ESC E 1
        cmd([0x1b, 0x45, 0x01]);
        push(`TOTAL:       PHP ${(payload.total / 100).toFixed(2).padStart(30, ' ')}\n`);
        cmd([0x1b, 0x45, 0x00]); // Normal
        push(`Tendered:    PHP ${(payload.tendered / 100).toFixed(2).padStart(30, ' ')}\n`);
        push(`Change:      PHP ${(payload.change / 100).toFixed(2).padStart(30, ' ')}\n`);
        push(`Payment:     ${payload.paymentMethod.padStart(34, ' ')}\n`);
        push('------------------------------------------------\n');
        // Center alignment: ESC a 1
        cmd([0x1b, 0x61, 0x01]);
        push('Thank you for listening!\nSee you at the next set.\n\n\n\n');
        // Cut paper: GS V 0 (full cut)
        cmd([0x1d, 0x56, 0x00]);
        return Buffer.concat(parts);
    }
}
/**
 * Mock printer for local development and testing without physical hardware
 */
export class MockPrinter {
    async printReceipt(payload) {
        console.log('[MockPrinter] PRINT RECEIPT SIMULATED:');
        console.log(JSON.stringify(payload, null, 2));
        return true;
    }
    async kickCashDrawer() {
        console.log('[MockPrinter] CASH DRAWER KICK SIMULATED');
        return true;
    }
}
