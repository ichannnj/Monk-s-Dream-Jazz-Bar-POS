import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { SEED_USERS } from './seed.data.js';

export interface InMemoryState {
  users: Map<string, any>;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  public isPostgresConnected = false;

  // Resilient memory store for offline local preview before Supabase credentials are configured
  public memory: InMemoryState = {
    users: new Map(),
  };

  constructor(public readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initDatabase();
  }

  private async initDatabase() {
    try {
      // Test Supabase connection via Prisma
      await this.prisma.$queryRaw`SELECT 1 as connected`;
      this.isPostgresConnected = true;
      this.logger.log('Supabase PostgreSQL database connected successfully via Prisma.');
    } catch (err: any) {
      this.isPostgresConnected = false;
      this.logger.warn(
        `Supabase PostgreSQL not connected (${err.message}). Activating in-memory mock engine with Monk's Dream Jazz Bar staff seed data.`
      );
      this.seedInMemory();
    }
  }

  private seedInMemory() {
    for (const u of SEED_USERS) {
      this.memory.users.set(u.id, { ...u });
    }
    this.logger.log(
      `In-memory store initialized with ${this.memory.users.size} staff members.`
    );
  }
}
