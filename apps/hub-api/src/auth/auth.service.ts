import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { schema, eq } from '@monks/db';


@Injectable()
export class AuthService {
  constructor(private readonly dbService: DatabaseService) {}

  async authenticatePin(pin: string) {
    if (this.dbService.isPostgresConnected) {
      const users = await this.dbService.db
        .select()
        .from(schema.users)
        .where(eq(schema.users.pin, pin))
        .limit(1);

      if (users.length === 0 || !users[0].isActive) {
        throw new UnauthorizedException('Invalid staff PIN or inactive account');
      }

      const user = users[0];
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      };
    } else {
      // Memory fallback
      const found = Array.from(this.dbService.memory.users.values()).find(
        (u) => u.pin === pin && u.isActive
      );

      if (!found) {
        throw new UnauthorizedException('Invalid staff PIN or inactive account');
      }

      return {
        success: true,
        user: {
          id: found.id,
          username: found.username,
          displayName: found.displayName,
          role: found.role,
        },
      };
    }
  }

  async getStaffList() {
    if (this.dbService.isPostgresConnected) {
      const users = await this.dbService.db
        .select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          role: schema.users.role,
        })
        .from(schema.users)
        .where(eq(schema.users.isActive, true));
      return users;
    } else {
      return Array.from(this.dbService.memory.users.values()).map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
      }));
    }
  }
}
