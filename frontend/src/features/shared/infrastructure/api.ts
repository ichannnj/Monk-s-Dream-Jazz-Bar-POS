/**
 * Unified POS API Client & Domain Aggregator
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */

import { authApi, AuthApi } from '../../auth/data/auth.api';
import { ordersApi, OrdersApi } from '../../orders/data/orders.api';
import { tablesApi, TablesApi } from '../../table-service/data/tables.api';
import { menuApi, MenuApi } from '../../menu/data/menu.api';
import { systemApi, SystemApi } from './system.api';

// Export individual domain API modules
export { authApi, AuthApi } from '../../auth/data/auth.api';
export { ordersApi, OrdersApi } from '../../orders/data/orders.api';
export { tablesApi, TablesApi } from '../../table-service/data/tables.api';
export { menuApi, MenuApi } from '../../menu/data/menu.api';
export { systemApi, SystemApi } from './system.api';

export class PosApiClient {
  readonly auth: AuthApi;
  readonly orders: OrdersApi;
  readonly tables: TablesApi;
  readonly menu: MenuApi;
  readonly system: SystemApi;

  constructor() {
    this.auth = authApi;
    this.orders = ordersApi;
    this.tables = tablesApi;
    this.menu = menuApi;
    this.system = systemApi;
  }

  // --- Auth Delegates ---
  loginWithCredentials(username: string, pin: string) {
    return this.auth.loginWithCredentials(username, pin);
  }

  loginWithPin(pin: string) {
    return this.auth.loginWithPin(pin);
  }

  loginAdminWithPassword(identifier: string, password: string) {
    return this.auth.loginAdminWithPassword(identifier, password);
  }

  verifyManagerPin(pin: string) {
    return this.auth.verifyManagerPin(pin);
  }

  updateAdminProfile(payload: {
    userId: string;
    displayName: string;
    username: string;
    jobTitle?: string;
    email?: string;
    phone?: string;
  }) {
    return this.auth.updateAdminProfile(payload);
  }

  changeAdminPassword(userId: string, currentPassword: string, newPassword: string) {
    return this.auth.changeAdminPassword(userId, currentPassword, newPassword);
  }

  changeAdminOverridePin(userId: string, currentPassword: string, newPin: string) {
    return this.auth.changeAdminOverridePin(userId, currentPassword, newPin);
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
