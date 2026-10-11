import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { TablesService } from '../tables/tables.service.js';
import { HLC_INSTANCE } from '../common/constants.js';
import {
  CreateOrder,
  CorkageRate,
  HybridLogicalClock,
  VoidOrderItem,
} from '@monks/shared';
import { schema, eq } from '@monks/db';

import * as crypto from 'node:crypto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly realtimeService: RealtimeService,
    private readonly tablesService: TablesService,
    @Inject(HLC_INSTANCE) private readonly hlc: HybridLogicalClock
  ) {}

  async createOrder(commandId: string, orderData: CreateOrder) {
    // 1. Check idempotency
    if (this.dbService.memory.orderDedupe.has(commandId)) {
      return { status: 'duplicate_ignored', commandId };
    }

    const orderId = crypto.randomUUID();
    const timestampHlc = this.hlc.now();

    let subtotal = 0;
    let corkageAmount = 0;

    const stationItemsMap: Record<string, any[]> = { cafe: [], bar: [], food: [] };

    // 2. Compute items, corkage, and station routing
    const processedItems = orderData.items.map((item) => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;

      let itemCorkage = 0;
      if (item.isCorkageItem) {
        itemCorkage = Math.round(itemTotal * CorkageRate);
        corkageAmount += itemCorkage;
      }

      const orderItem = {
        id: crypto.randomUUID(),
        orderId,
        menuItemId: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        isCorkage: item.isCorkageItem,
        notes: item.notes || null,
        status: 'NEW',
        total: itemTotal,
        corkage: itemCorkage,
        hlc: timestampHlc,
      };

      for (const st of item.stations) {
        if (stationItemsMap[st]) {
          stationItemsMap[st].push(orderItem);
        }
      }

      return orderItem;
    });

    const totalAmount = subtotal + corkageAmount;

    const orderRecord = {
      id: orderId,
      commandId,
      tableNumber: orderData.tableNumber,
      tabName: orderData.tabName || `Table ${orderData.tableNumber} Tab`,
      status: 'OPEN',
      waiterId: orderData.waiterId,
      subtotal,
      corkageAmount,
      totalAmount,
      hlc: timestampHlc,
      items: processedItems,
      createdAt: new Date().toISOString(),
    };

    // 3. Persist order & tickets
    if (this.dbService.isPostgresConnected) {
      await this.dbService.db.insert(schema.orders).values({
        id: orderId,
        commandId,
        tableNumber: orderData.tableNumber,
        tabName: orderRecord.tabName,
        status: 'OPEN',
        waiterId: orderData.waiterId,
        subtotal,
        corkageAmount,
        totalAmount,
        hlc: timestampHlc,
      });

      for (const item of processedItems) {
        await this.dbService.db.insert(schema.orderItems).values({
          id: item.id,
          orderId,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          isCorkage: item.isCorkage,
          notes: item.notes,
          status: 'NEW',
          hlc: timestampHlc,
        });
      }
    }

    // Keep in memory index as well
    this.dbService.memory.orders.set(orderId, orderRecord);
    this.dbService.memory.orderDedupe.add(commandId);

    // 4. Create station tickets for KDS
    const createdTickets = [];
    for (const [st, items] of Object.entries(stationItemsMap)) {
      if (items.length === 0) continue;

      const ticketId = crypto.randomUUID();
      const ticket = {
        id: ticketId,
        orderId,
        station: st,
        tableNumber: orderData.tableNumber,
        items,
        status: 'NEW',
        hlc: timestampHlc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (this.dbService.isPostgresConnected) {
        await this.dbService.db.insert(schema.stationTickets).values({
          id: ticketId,
          orderId,
          station: st,
          tableNumber: orderData.tableNumber,
          items,
          status: 'NEW',
          hlc: timestampHlc,
        });
      }

      this.dbService.memory.stationTickets.set(ticketId, ticket);
      createdTickets.push(ticket);

      // Broadcast to KDS station
      await this.realtimeService.broadcast('ticket.created', `station:${st}`, ticket);
    }

    // 5. Update floor table status
    await this.tablesService.updateTableStatus(
      orderData.tableNumber,
      'PREPARING',
      orderId
    );

    return {
      orderId,
      tableNumber: orderData.tableNumber,
      tabName: orderRecord.tabName,
      subtotal,
      corkageAmount,
      totalAmount,
      tickets: createdTickets,
      hlc: timestampHlc,
    };
  }

  async getOrder(id: string) {
    if (this.dbService.isPostgresConnected) {
      const rows = await this.dbService.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, id))
        .limit(1);
      if (rows.length === 0) return null;

      const items = await this.dbService.db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, id));

      return {
        ...rows[0],
        items,
      };
    }

    return this.dbService.memory.orders.get(id) || null;
  }

  async getActiveOrders() {
    if (this.dbService.isPostgresConnected) {
      return await this.dbService.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.status, 'OPEN'));
    }
    return Array.from(this.dbService.memory.orders.values()).filter(
      (o) => o.status === 'OPEN'
    );
  }

  async voidOrderItem(orderId: string, voidData: VoidOrderItem) {
    // PIN verification (manager override)
    if (voidData.approverPin.length !== 4) {
      throw new HttpException('Invalid manager PIN', HttpStatus.FORBIDDEN);
    }

    const order = await this.getOrder(orderId);
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    const item = order.items?.find((i: any) => i.id === voidData.orderItemId);
    if (!item) {
      throw new HttpException('Order item not found', HttpStatus.NOT_FOUND);
    }

    item.status = 'VOIDED';
    item.voidReason = voidData.reason;

    if (this.dbService.isPostgresConnected) {
      await this.dbService.db
        .update(schema.orderItems)
        .set({
          status: 'VOIDED',
          voidReason: voidData.reason,
        })
        .where(eq(schema.orderItems.id, voidData.orderItemId));
    }

    await this.realtimeService.broadcast('order.item_voided', 'floor', {
      orderId,
      orderItemId: voidData.orderItemId,
      reason: voidData.reason,
    });

    return { status: 'item_voided', orderId, orderItemId: voidData.orderItemId };
  }
}
