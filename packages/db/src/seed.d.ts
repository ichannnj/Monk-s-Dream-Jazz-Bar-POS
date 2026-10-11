import { schema } from './client.js';
export declare const SEED_USERS: {
    id: `${string}-${string}-${string}-${string}-${string}`;
    username: string;
    displayName: string;
    role: string;
    pin: string;
    isActive: boolean;
}[];
export declare const SEED_TABLES: {
    id: number;
    tableNumber: number;
    name: string;
    section: string;
    capacity: number;
    posX: number;
    posY: number;
}[];
export declare const SEED_MENU_ITEMS: {
    id: `${string}-${string}-${string}-${string}-${string}`;
    name: string;
    description: string;
    price: number;
    category: string;
    stations: string[];
    isAvailable: boolean;
    isCorkage: boolean;
    hlc: string;
}[];
export declare function runSeed(dbInstance?: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
}): Promise<void>;
