import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { schema, eq } from '@monks/db';


@Injectable()
export class MenuService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly realtimeService: RealtimeService
  ) {}

  async getMenuItems() {
    if (this.dbService.isPostgresConnected) {
      return await this.dbService.db
        .select()
        .from(schema.menuItems)
        .orderBy(schema.menuItems.category, schema.menuItems.name);
    }
    return Array.from(this.dbService.memory.menuItems.values());
  }

  async setItemAvailability(id: string, isAvailable: boolean) {
    if (this.dbService.isPostgresConnected) {
      await this.dbService.db
        .update(schema.menuItems)
        .set({ isAvailable, updatedAt: new Date() })
        .where(eq(schema.menuItems.id, id));
    } else {
      const item = this.dbService.memory.menuItems.get(id);
      if (item) {
        item.isAvailable = isAvailable;
        item.updatedAt = new Date().toISOString();
      }
    }

    // Broadcast 86 / item stock availability change
    await this.realtimeService.broadcast('menu.item_availability', 'floor', {
      itemId: id,
      isAvailable,
    });

    return { id, isAvailable };
  }
}
