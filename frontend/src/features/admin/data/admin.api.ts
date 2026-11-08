/**
 * Admin API Facade
 * Composes domain sub-APIs and re-exports types and date utilities
 * with zero breaking changes to existing callers.
 */

import {
  venueSettingsApi,
  getLatest6AmCutoff,
  getManilaBusinessDateString,
  getMsUntilNext6Am,
} from './api/venueSettings.api';
import { catalogProductsApi } from './api/catalogProducts.api';
import { catalogModifiersApi } from './api/catalogModifiers.api';
import { inventoryStockApi } from './api/inventoryStock.api';
import { attendancePayrollApi } from './api/attendancePayroll.api';
import { staffRosterApi } from './api/staffRoster.api';
import { salesAndTablesApi } from './api/salesAndTables.api';

// Re-export all admin types and constants
export * from './admin.types';

// Re-export date helpers
export { getLatest6AmCutoff, getManilaBusinessDateString, getMsUntilNext6Am };

// Composed adminApi singleton
export const adminApi = {
  ...venueSettingsApi,
  ...catalogProductsApi,
  ...catalogModifiersApi,
  ...inventoryStockApi,
  ...attendancePayrollApi,
  ...staffRosterApi,
  ...salesAndTablesApi,
};
