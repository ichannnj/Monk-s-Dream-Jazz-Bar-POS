/**
 * Tables & Floor Tabs API
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */

import { resolveTableUuid, clearTableUuidCache, tableUuidCache } from '../../floor/data/resolver';
import { openTab, createTab, settleTabAndRecordPayment } from './tabs.api';
import { getTables, transferTableTab, TransferTabParams, TransferTabResult } from './transfer.api';

export class TablesApi {
  getTables = getTables;
  openTab = openTab;
  createTab = createTab;
  transferTableTab = transferTableTab;
  settleTabAndRecordPayment = settleTabAndRecordPayment;
}

export const tablesApi = new TablesApi();

export {
  resolveTableUuid,
  clearTableUuidCache,
  tableUuidCache,
  openTab,
  createTab,
  settleTabAndRecordPayment,
  getTables,
  transferTableTab,
};
export type { TransferTabParams, TransferTabResult };
