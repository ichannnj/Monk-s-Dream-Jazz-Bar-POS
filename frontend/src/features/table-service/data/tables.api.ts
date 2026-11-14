/**
 * Tables & Floor Tabs API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */

import { resolveTableUuid, clearTableUuidCache, tableUuidCache } from '../../floor/data/resolver';
import {
  openTab,
  createTab,
  settleTabAndRecordPayment,
  completeOffPremiseTab,
  transferOrderItemsToTab,
} from './tabs.api';
import { getTables, transferTableTab } from './transfer.api';
import type { TransferTabParams, TransferTabResult } from './transfer.api';

export class TablesApi {
  getTables = getTables;
  openTab = openTab;
  createTab = createTab;
  transferTableTab = transferTableTab;
  transferOrderItemsToTab = transferOrderItemsToTab;
  settleTabAndRecordPayment = settleTabAndRecordPayment;
  completeOffPremiseTab = completeOffPremiseTab;
}

export const tablesApi = new TablesApi();

export {
  resolveTableUuid,
  clearTableUuidCache,
  tableUuidCache,
  openTab,
  createTab,
  settleTabAndRecordPayment,
  completeOffPremiseTab,
  getTables,
  transferTableTab,
  transferOrderItemsToTab,
};
export type { TransferTabParams, TransferTabResult };
