import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { schema, eq } from '@monks/db';


@Injectable()
export class TablesService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly realtimeService: RealtimeService
  ) {}

  async getAllTables() {
    if (this.dbService.isPostgresConnected) {
      return await this.dbService.db
        .select()
        .from(schema.tables)
        .orderBy(schema.tables.tableNumber);
    }
    return Array.from(this.dbService.memory.tables.values()).sort(
      (a, b) => a.tableNumber - b.tableNumber
    );
  }

  async getTable(tableNumber: number) {
    if (this.dbService.isPostgresConnected) {
      const rows = await this.dbService.db
        .select()
        .from(schema.tables)
        .where(eq(schema.tables.tableNumber, tableNumber))
        .limit(1);
      return rows[0] || null;
    }
    return this.dbService.memory.tables.get(tableNumber) || null;
  }

  async updateTableStatus(
    tableNumber: number,
    status: string,
    currentOrderId?: string | null
  ) {
    if (this.dbService.isPostgresConnected) {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };
      if (currentOrderId !== undefined) {
        updateData.currentOrderId = currentOrderId;
      }

      await this.dbService.db
        .update(schema.tables)
        .set(updateData)
        .where(eq(schema.tables.tableNumber, tableNumber));
    } else {
      const table = this.dbService.memory.tables.get(tableNumber);
      if (table) {
        table.status = status;
        if (currentOrderId !== undefined) {
          table.currentOrderId = currentOrderId;
        }
        table.updatedAt = new Date().toISOString();
      }
    }

    // Broadcast table status change to floor room
    await this.realtimeService.broadcast('floor.table_updated', 'floor', {
      tableNumber,
      status,
      currentOrderId,
    });

    return { tableNumber, status, currentOrderId };
  }
}
