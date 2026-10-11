import { Injectable, Logger } from '@nestjs/common';
import {
  MockPrinter,
  UsbEscPosPrinter,
  type IPrinterService,
  type PrinterReceiptPayload,
} from '@monks/printing';

@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);
  private printer: IPrinterService;

  constructor() {
    this.printer = process.env.PRINTER_DEVICE
      ? new UsbEscPosPrinter(process.env.PRINTER_DEVICE)
      : new MockPrinter();

    this.logger.log(
      `Hardware printer initialized: ${
        process.env.PRINTER_DEVICE
          ? `UsbEscPosPrinter(${process.env.PRINTER_DEVICE})`
          : 'MockPrinter (dev mode)'
      }`
    );
  }

  async printReceipt(data: PrinterReceiptPayload): Promise<boolean> {
    try {
      return await this.printer.printReceipt(data);
    } catch (err: any) {
      this.logger.error(`Receipt print failed: ${err.message}`);
      return false;
    }
  }

  async kickCashDrawer(): Promise<boolean> {
    try {
      return await this.printer.kickCashDrawer();
    } catch (err: any) {
      this.logger.error(`Kick drawer failed: ${err.message}`);
      return false;
    }
  }
}
