import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { HardwareService } from './hardware.service.js';
import { DatabaseService } from '../database/database.service.js';
import { ReprintReceiptSchema, KickDrawerSchema } from '@monks/shared';
import { schema, eq } from '@monks/db';


@Controller('api/v1/printer')
export class HardwareController {
  constructor(
    private readonly hardwareService: HardwareService,
    private readonly dbService: DatabaseService
  ) {}

  @Post('reprint')
  async reprintReceipt(@Body() body: any) {
    const parsed = ReprintReceiptSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(parsed.error.format(), HttpStatus.BAD_REQUEST);
    }

    const { orderId, reason } = parsed.data;

    let order: any = null;
    if (this.dbService.isPostgresConnected) {
      const rows = await this.dbService.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId))
        .limit(1);
      order = rows[0];
    } else {
      order = this.dbService.memory.orders.get(orderId);
    }

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    const reprintPayload = {
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      tableNumber: order.tableNumber,
      tabName: order.tabName || 'Main Tab',
      waiterName: 'Staff',
      items: order.items || [],
      subtotal: order.subtotal || order.totalAmount,
      corkageFee: order.corkageAmount || 0,
      total: order.totalAmount,
      tendered: order.totalAmount,
      change: 0,
      paymentMethod: 'REPRINT',
      timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      isReprint: true,
    };

    const printed = await this.hardwareService.printReceipt(reprintPayload);
    return {
      status: 'reprinted',
      reason,
      printed,
      receipt: reprintPayload,
    };
  }

  @Post('kick-drawer')
  async kickDrawer(@Body() body: any) {
    const parsed = KickDrawerSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(parsed.error.format(), HttpStatus.BAD_REQUEST);
    }

    // Manager / Cashier PIN verification (e.g. 5678, 9999)
    const { pin, reason } = parsed.data;
    if (pin.length !== 4) {
      throw new HttpException('Invalid 4-digit PIN', HttpStatus.FORBIDDEN);
    }

    const success = await this.hardwareService.kickCashDrawer();
    if (!success) {
      throw new HttpException('Hardware failed to pulse cash drawer', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return {
      status: 'drawer_kicked',
      reason,
      timestamp: new Date().toISOString(),
    };
  }
}
