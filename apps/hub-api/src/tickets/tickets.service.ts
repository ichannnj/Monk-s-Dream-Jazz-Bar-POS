import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { schema, eq, and } from '@monks/db';


@Injectable()
export class TicketsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly realtimeService: RealtimeService
  ) {}

  async getTickets(station?: string, status?: string) {
    if (this.dbService.isPostgresConnected) {
      const conditions = [];
      if (station) conditions.push(eq(schema.stationTickets.station, station));
      if (status) conditions.push(eq(schema.stationTickets.status, status));

      let query = this.dbService.db.select().from(schema.stationTickets);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      return await query.orderBy(schema.stationTickets.createdAt);
    }

    let tickets = Array.from(this.dbService.memory.stationTickets.values());
    if (station) {
      tickets = tickets.filter((t) => t.station === station);
    }
    if (status) {
      tickets = tickets.filter((t) => t.status === status);
    }
    return tickets;
  }

  async updateTicketStatus(ticketId: string, newStatus: string, updatedBy: string) {
    let ticket: any = null;

    if (this.dbService.isPostgresConnected) {
      const rows = await this.dbService.db
        .select()
        .from(schema.stationTickets)
        .where(eq(schema.stationTickets.id, ticketId))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundException('Station ticket not found');
      }

      await this.dbService.db
        .update(schema.stationTickets)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(schema.stationTickets.id, ticketId));

      ticket = { ...rows[0], status: newStatus };
    } else {
      ticket = this.dbService.memory.stationTickets.get(ticketId);
      if (!ticket) {
        throw new NotFoundException('Station ticket not found');
      }
      ticket.status = newStatus;
      ticket.updatedAt = new Date().toISOString();
    }

    // Broadcast status change to KDS room
    await this.realtimeService.broadcast(
      'ticket.updated',
      `station:${ticket.station}`,
      ticket
    );

    // If ticket reaches READY, alert floor table and waitstaff
    if (newStatus === 'READY') {
      await this.realtimeService.broadcast('floor.table_updated', 'floor', {
        tableNumber: ticket.tableNumber,
        status: 'READY',
        ticketId: ticket.id,
        station: ticket.station,
      });
    }

    return {
      ticketId,
      status: newStatus,
      updatedBy,
    };
  }
}
