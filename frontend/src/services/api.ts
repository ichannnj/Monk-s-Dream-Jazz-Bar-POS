/**
 * Unified POS API Client & Domain Aggregator
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 *
 * Domain APIs are modularized into dedicated files:
 * - auth.api.ts   -> Authentication, credentials, staff directory
 * - orders.api.ts -> Order placement, inventory depletion, cancellations
 * - tables.api.ts -> Table management, floor occupancy, tab transfers
 * - menu.api.ts   -> Product catalog, categories, inventory levels
 * - system.api.ts -> Health checks and latency diagnostics
 */

import { authApi, AuthApi } from './auth.api';
import { ordersApi, OrdersApi } from './orders.api';
import { tablesApi, TablesApi } from './tables.api';
import { menuApi, MenuApi } from './menu.api';
import { systemApi, SystemApi } from './system.api';

// Export individual domain API modules
export { authApi, AuthApi } from './auth.api';
export * from './auth.api';

export { ordersApi, OrdersApi } from './orders.api';
export * from './orders.api';

export { tablesApi, TablesApi } from './tables.api';
export * from './tables.api';

export { menuApi, MenuApi } from './menu.api';
export * from './menu.api';

export { systemApi, SystemApi } from './system.api';
export * from './system.api';

/**
 * Unified POS API Client providing access to all domain services
 * with backward-compatible delegates.
 */
export class PosApiClient {
  readonly auth: AuthApi = authApi;
  readonly orders: OrdersApi = ordersApi;
  readonly tables: TablesApi = tablesApi;
  readonly menu: MenuApi = menuApi;
  readonly system: SystemApi = systemApi;

  // --- Auth Delegates ---
  loginWithCredentials(username: string, pin: string) {
    return this.auth.loginWithCredentials(username, pin);
  }

  loginWithPin(pin: string) {
    return this.auth.loginWithPin(pin);
  }

  getStaffList() {
    return this.auth.getStaffList();
  }

  // --- Health Delegates ---
  checkHealth() {
    return this.system.checkHealth();
  }
}

export const posApi = new PosApiClient();
export default posApi;
