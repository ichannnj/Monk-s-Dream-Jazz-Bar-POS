import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { getDb, getPool, schema, runSeed, SEED_MENU_ITEMS, SEED_TABLES, SEED_USERS } from '@monks/db';

export interface InMemoryState {
  users: Map<string, any>;
  tables: Map<number, any>;
  menuItems: Map<string, any>;
  orders: Map<string, any>;
  orderItems: Map<string, any>;
  orderDedupe: Set<string>;
  stationTickets: Map<string, any>;
  payments: Map<string, any>;
  eventLog: Array<{ seq: number; type: string; room: string; payload: any; createdAt: string }>;
  currentSeq: number;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  public isPostgresConnected = false;
  public db: ReturnType<typeof getDb> = getDb();

  // Resilient memory store
  public memory: InMemoryState = {
    users: new Map(),
    tables: new Map(),
    menuItems: new Map(),
    orders: new Map(),
    orderItems: new Map(),
    orderDedupe: new Set(),
    stationTickets: new Map(),
    payments: new Map(),
    eventLog: [],
    currentSeq: 0,
  };

  async onModuleInit() {
    await this.initDatabase();
  }

  private async initDatabase() {
    try {
      const pool = getPool();
      const res = await pool.query('SELECT 1 as connected');
      if (res.rows?.[0]?.connected === 1) {
        this.isPostgresConnected = true;
        this.logger.log('PostgreSQL database connected successfully.');

        // Check if tables are seeded
        try {
          const userCount = await this.db.select().from(schema.users).limit(1);
          if (userCount.length === 0) {
            this.logger.log('Database empty, seeding default Jazz Bar data...');
            await runSeed(this.db);
          }
        } catch (seedErr: any) {
          this.logger.warn(`Could not verify table schema or auto-seed: ${seedErr.message}`);
        }
      }
    } catch (err: any) {
      this.isPostgresConnected = false;
      this.logger.warn(
        `PostgreSQL not connected (${err.message}). Activating in-memory mock engine with Monk's Dream Jazz Bar seed data.`
      );
      this.seedInMemory();
    }
  }

  private seedInMemory() {
    for (const u of SEED_USERS) {
      this.memory.users.set(u.id, { ...u });
    }
    for (const t of SEED_TABLES) {
      this.memory.tables.set(t.tableNumber, {
        ...t,
        status: 'EMPTY',
        currentOrderId: null,
      });
    }
    for (const m of SEED_MENU_ITEMS) {
      this.memory.menuItems.set(m.id, { ...m });
    }
    this.logger.log(
      `In-memory store initialized with ${this.memory.menuItems.size} menu items, ${this.memory.tables.size} tables, and ${this.memory.users.size} staff members.`
    );
  }
}
