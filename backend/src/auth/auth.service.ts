import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class AuthService {
  constructor(private readonly dbService: DatabaseService) {}

  async authenticatePin(pin: string) {
    if (this.dbService.isPostgresConnected) {
      const user = await this.dbService.prisma.user.findFirst({
        where: {
          pin,
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid staff PIN or inactive account');
      }

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
      return await this.dbService.prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
        },
      });
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
