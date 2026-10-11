import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { HardwareService } from '../hardware/hardware.service.js';
import { TablesService } from '../tables/tables.service.js';
import { HLC_INSTANCE } from '../common/constants.js';
import { RecordPayment, HybridLogicalClock } from '@monks/shared';
import { schema, eq } from '@monks/db';

import * as crypto from 'node:crypto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly realtimeService: RealtimeService,
    private readonly hardwareService: HardwareService,
    private readonly tablesService: TablesService,
    @Inject(HLC_INSTANCE) private readonly hlc: HybridLogicalClock
  ) {}

  async getBillPreview(orderId: string) {
    let order: any = null;
    let items: any[] = [];

    if (this.dbService.isPostgresConnected) {
      const rows = await this.dbService.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId))
        .limit(1);

      if (rows.length === 0) {
        throw new HttpException('Order/Tab not found', HttpStatus.NOT_FOUND);
      }
      order = rows[0];
      items = await this.dbService.db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));
    } else {
      order = this.dbService.memory.orders.get(orderId);
      if (!order) {
        throw new HttpException('Order/Tab not found', HttpStatus.NOT_FOUND);
      }
      items = order.items || [];
    }

    return {
      orderId: order.id,
      tableNumber: order.tableNumber,
      tabName: order.tabName,
      status: order.status,
      items: items.filter((i) => i.status !== 'VOIDED'),
      subtotal: order.subtotal,
      corkageAmount: order.corkageAmount,
      totalAmount: order.totalAmount,
    };
  }

  async processPayment(orderId: string, paymentData: RecordPayment) {
    const bill = await this.getBillPreview(orderId);

    if (bill.status === 'CLOSED') {
      throw new HttpException('Tab is already settled and closed', HttpStatus.BAD_REQUEST);
    }

    if (paymentData.tenderedAmount < bill.totalAmount) {
      throw new HttpException(
        `Tendered amount (${paymentData.tenderedAmount}) is less than total due (${bill.totalAmount})`,
        HttpStatus.BAD_REQUEST
      );
    }

    const changeAmount = paymentData.tenderedAmount - bill.totalAmount;
    const paymentId = crypto.randomUUID();
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const timestampHlc = this.hlc.now();

    // 1. Persist payment
    if (this.dbService.isPostgresConnected) {
      await this.dbService.db.insert(schema.payments).values({
        id: paymentId,
        orderId,
        receiptNumber,
        totalDue: bill.totalAmount,
        tenderedAmount: paymentData.tenderedAmount,
        changeAmount,
        method: paymentData.method,
        referenceNumber: paymentData.referenceNumber || null,
        cashierId: paymentData.cashierId,
        hlc: timestampHlc,
      });

      await this.dbService.db
        .update(schema.orders)
        .set({ status: 'CLOSED', updatedAt: new Date() })
        .where(eq(schema.orders.id, orderId));
    } else {
      const order = this.dbService.memory.orders.get(orderId);
      if (order) {
        order.status = 'CLOSED';
        order.updatedAt = new Date().toISOString();
      }
      this.dbService.memory.payments.set(paymentId, {
        id: paymentId,
        orderId,
        receiptNumber,
        totalDue: bill.totalAmount,
        tenderedAmount: paymentData.tenderedAmount,
        changeAmount,
        method: paymentData.method,
        cashierId: paymentData.cashierId,
        hlc: timestampHlc,
      });
    }

    // 2. Clear table on floor
    await this.tablesService.updateTableStatus(bill.tableNumber, 'EMPTY', null);

    // 3. Dispatch receipt print job
    const receiptPayload = {
      receiptNumber,
      tableNumber: bill.tableNumber,
      tabName: bill.tabName,
      waiterName: 'Cashier',
      items: bill.items,
      subtotal: bill.subtotal,
      corkageFee: bill.corkageAmount,
      total: bill.totalAmount,
      tendered: paymentData.tenderedAmount,
      change: changeAmount,
      paymentMethod: paymentData.method,
      timestamp: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
    };

    const printed = await this.hardwareService.printReceipt(receiptPayload);

    // 4. Broadcast payment event
    await this.realtimeService.broadcast('tab.paid', 'floor', {
      orderId,
      tableNumber: bill.tableNumber,
      receiptNumber,
      totalAmount: bill.totalAmount,
    });

    return {
      status: 'PAID',
      paymentId,
      receiptNumber,
      tenderedAmount: paymentData.tenderedAmount,
      changeAmount,
      printed,
      receipt: receiptPayload,
    };
  }
}
