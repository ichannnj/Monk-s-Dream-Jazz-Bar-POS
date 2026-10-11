import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { DatabaseService } from '../database/database.service.js';
import { schema } from '@monks/db';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private io: Server | null = null;
  private currentSeq = 0;

  constructor(private readonly dbService: DatabaseService) {}

  setServer(io: Server) {
    this.io = io;
  }

  getCurrentSeq(): number {
    return this.currentSeq;
  }

  async broadcast(type: string, room: string, payload: any): Promise<number> {
    this.currentSeq++;
    const event = {
      seq: this.currentSeq,
      type,
      room,
      payload,
      createdAt: new Date().toISOString(),
    };

    // Store in Postgres or memory
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

    if (this.io) {
      this.io.to(room).emit(type, event);
      this.logger.debug(`Broadcasted [${type}] to room [${room}] (seq: ${this.currentSeq})`);
    }

    return this.currentSeq;
  }

  getMissedEvents(lastSeq: number, rooms: string[]) {
    if (this.dbService.isPostgresConnected) {
      // In-flight or memory buffer fallback
      return this.dbService.memory.eventLog.filter(
        (e) => e.seq > lastSeq && rooms.includes(e.room)
      );
    }
    return this.dbService.memory.eventLog.filter(
      (e) => e.seq > lastSeq && rooms.includes(e.room)
    );
  }
}
