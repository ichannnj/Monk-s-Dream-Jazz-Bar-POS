/**
 * Authoritative Venue State Snapshot Manager
 * Monk's Dream Jazz Bar POS
 *
 * Persists the latest authoritative venue snapshot (tables, takeout orders,
 * online orders, cash drawer, and metadata) to client storage, enabling cold-boot
 * initialization when internet connection is down without falling back to mock seed data.
 */

import { safeStorage } from '../../shared/infrastructure/storage/safeStorage';
import type {
  TableItem,
  TakeoutOrder,
  OnlineDeliveryOrder,
  DrawerEntry,
} from '../../../types/floor';
import { SEED_TABLES } from '../../floor/data/tables.mock';
import { SEED_TAKEOUT_ORDERS, SEED_ONLINE_ORDERS } from './orders.mock';

export const STORAGE_KEY_VENUE_SNAPSHOT = 'monks_pos_authoritative_snapshot';
export const CURRENT_SNAPSHOT_VERSION = 1;

export interface AuthoritativeVenueSnapshot {
  version: number;
  timestamp: number;
  tables: TableItem[];
  takeoutOrders: TakeoutOrder[];
  onlineOrders: OnlineDeliveryOrder[];
  drawerEntries?: DrawerEntry[];
}

/**
 * Validates whether a recovered object qualifies as a sound AuthoritativeVenueSnapshot.
 */
export function isValidVenueSnapshot(obj: any): obj is AuthoritativeVenueSnapshot {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.version !== CURRENT_SNAPSHOT_VERSION) return false;
  if (typeof obj.timestamp !== 'number') return false;
  if (!Array.isArray(obj.tables) || obj.tables.length === 0) return false;
  if (!Array.isArray(obj.takeoutOrders)) return false;
  if (!Array.isArray(obj.onlineOrders)) return false;
  return true;
}

/**
 * Saves the authoritative venue snapshot to durable client storage.
 */
export function saveAuthoritativeSnapshot(
  snapshot: Omit<AuthoritativeVenueSnapshot, 'version' | 'timestamp'> & {
    version?: number;
    timestamp?: number;
  }
): void {
  const completeSnapshot: AuthoritativeVenueSnapshot = {
    version: CURRENT_SNAPSHOT_VERSION,
    timestamp: snapshot.timestamp || Date.now(),
    tables: snapshot.tables,
    takeoutOrders: snapshot.takeoutOrders,
    onlineOrders: snapshot.onlineOrders,
    drawerEntries: snapshot.drawerEntries || [],
  };
  safeStorage.setItem(STORAGE_KEY_VENUE_SNAPSHOT, completeSnapshot);
}

/**
 * Loads the authoritative venue snapshot from client storage.
 * Returns null if missing or schema/version is invalid.
 */
export function loadAuthoritativeSnapshot(): AuthoritativeVenueSnapshot | null {
  const raw = safeStorage.getItem<AuthoritativeVenueSnapshot | null>(
    STORAGE_KEY_VENUE_SNAPSHOT,
    null
  );
  if (isValidVenueSnapshot(raw)) {
    return raw;
  }
  return null;
}

/**
 * Clears the authoritative venue snapshot from storage.
 */
export function clearAuthoritativeSnapshot(): void {
  safeStorage.removeItem(STORAGE_KEY_VENUE_SNAPSHOT);
}

/**
 * Returns initial store state for tables and orders.
 * If an authoritative snapshot exists in durable storage, uses that snapshot.
 * Otherwise, falls back to the static mock seeds.
 */
export function getInitialVenueState(): {
  tables: TableItem[];
  takeoutOrders: TakeoutOrder[];
  onlineOrders: OnlineDeliveryOrder[];
  drawerEntries: DrawerEntry[];
  hasAuthoritativeSnapshot: boolean;
} {
  const snapshot = loadAuthoritativeSnapshot();
  if (snapshot) {
    return {
      tables: snapshot.tables,
      takeoutOrders: snapshot.takeoutOrders,
      onlineOrders: snapshot.onlineOrders,
      drawerEntries: snapshot.drawerEntries || [],
      hasAuthoritativeSnapshot: true,
    };
  }

  return {
    tables: SEED_TABLES,
    takeoutOrders: SEED_TAKEOUT_ORDERS,
    onlineOrders: SEED_ONLINE_ORDERS,
    drawerEntries: [],
    hasAuthoritativeSnapshot: false,
  };
}
