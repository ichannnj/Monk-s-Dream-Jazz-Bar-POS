import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
const { Pool } = pg;
let poolInstance = null;
let dbInstance = null;
export function getPool(connectionString) {
    if (!poolInstance) {
        const connStr = connectionString ||
            process.env.DATABASE_URL ||
            'postgres://pos_owner:pos_secret_dev@localhost:5432/pos';
        poolInstance = new Pool({
            connectionString: connStr,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        poolInstance.on('error', (err) => {
            console.error('[DB Pool] Unexpected error on idle client:', err);
        });
    }
    return poolInstance;
}
export function createDb(connectionString) {
    const pool = getPool(connectionString);
    return drizzle(pool, { schema });
}
export function getDb(connectionString) {
    if (!dbInstance) {
        dbInstance = createDb(connectionString);
    }
    return dbInstance;
}
export { schema };
