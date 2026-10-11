import pg from 'pg';
import * as schema from './schema.js';
export type AppDatabase = ReturnType<typeof createDb>;
export declare function getPool(connectionString?: string): pg.Pool;
export declare function createDb(connectionString?: string): import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
};
export declare function getDb(connectionString?: string): import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
};
export { schema };
