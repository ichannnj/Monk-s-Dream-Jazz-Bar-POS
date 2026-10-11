import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { Subject, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { DatabaseService } from '../database/database.service.js';
import { schema } from '@monks/db';

export interface OperationEvent {
  seq: number;
  type: string;
  room: string;
  payload: any;
  createdAt: string;
}

export interface SseMessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private io: Server | null = null;
  private currentSeq = 0;

  // SSE Stream for operational events (Orders, Tickets, Floor, 86 Items)
  private readonly operationsSubject = new Subject<OperationEvent>();

  constructor(private readonly dbService: DatabaseService) {}

  setServer(io: Server) {
    this.io = io;
  }

  getCurrentSeq(): number {
    return this.currentSeq;
  }

  /**
   * Broadcast an event.
   * - Operational events (orders, tickets, floor tables, menu 86) -> Dispatched to SSE stream.
   * - Staff messaging & chat events -> Dispatched to WebSocket (Socket.IO).
   */
  async broadcast(type: string, room: string, payload: any): Promise<number> {
    this.currentSeq++;
    const event: OperationEvent = {
      seq: this.currentSeq,
      type,
      room,
      payload,
      createdAt: new Date().toISOString(),
    };

    // Store in Postgres or in-memory audit log
    if (this.dbService.isPostgresConnected) {
      try {
        await this.dbService.db.insert(schema.eventLog).values({
          eventType: type,
          room,
          payload,
        });
      } catch (err: any) {
        this.logger.error(`Failed to persist event to event_log table: ${err.message}`);
      }
    } else {
      this.dbService.memory.eventLog.push(event);
      this.dbService.memory.currentSeq = this.currentSeq;
    }

    const isChat = type.startsWith('chat.');

    if (isChat) {
      // 1. WebSocket for Two-Way Staff Chat & Messaging
      if (this.io) {
        this.io.to(room).emit(type, event);
        this.logger.debug(`[WebSocket] Message [${type}] to room [${room}]`);
      }
    } else {
      // 2. SSE for Operations (Orders, Tickets, Floor, Tab & 86 Item updates)
      this.operationsSubject.next(event);
      this.logger.debug(`[SSE] Operation [${type}] dispatched (seq: ${this.currentSeq}, room: ${room})`);

      // Dual-dispatch to WebSocket for backwards compatibility if needed
      if (this.io) {
        this.io.to(room).emit(type, event);
      }
    }

    return this.currentSeq;
  }

  /**
   * Returns the filtered Server-Sent Events (SSE) observable stream for terminals
   */
  getOperationsStream(station?: string, room?: string): Observable<SseMessageEvent> {
    return this.operationsSubject.asObservable().pipe(
      filter((event) => {
        // If a specific room was requested
        if (room && event.room !== room && event.room !== 'floor') {
          return false;
        }

        // If a specific station was requested (e.g., barista, kitchen, bartender)
        if (station) {
          const stationRoom = `station:${station}`;
          // Include station-specific tickets, or floor-wide announcements
          if (event.room !== stationRoom && event.room !== 'floor') {
            return false;
          }
        }

        return true;
      }),
      map((event) => ({
        id: String(event.seq),
        type: event.type,
        data: event,
        retry: 3000, // Client reconnection retry interval in ms
      }))
    );
  }

  getMissedEvents(lastSeq: number, rooms: string[]) {
    return this.dbService.memory.eventLog.filter(
      (e) => e.seq > lastSeq && rooms.includes(e.room)
    );
  }
}
