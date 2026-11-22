import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Trash2,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type {
  StockMovementAdmin,
  StocktakeSessionAdmin,
  WasteLogAdmin,
} from '../../../../data/admin.api';

interface InventoryMovementsAndAuditSectionProps {
  filteredMovements: StockMovementAdmin[];
  stocktakeSessions: StocktakeSessionAdmin[];
  wasteLogs: WasteLogAdmin[];
  ledgerTypeFilter: string;
  setLedgerTypeFilter: (val: string) => void;
  onOpenStocktake: () => void;
  onOpenWaste: () => void;
}

type ActivitySubTab = 'movements' | 'stocktakes' | 'waste';

export const InventoryMovementsAndAuditSection: React.FC<
  InventoryMovementsAndAuditSectionProps
> = ({
  filteredMovements,
  stocktakeSessions,
  wasteLogs,
  ledgerTypeFilter,
  setLedgerTypeFilter,
  onOpenStocktake,
  onOpenWaste,
}) => {
  const [subTab, setSubTab] = useState<ActivitySubTab>('movements');

  const movementFilters = [
    { key: 'ALL', label: 'All' },
    { key: 'SALE_DEPLETION', label: 'Sales' },
    { key: 'RESTOCK_DELIVERY', label: 'Deliveries' },
    { key: 'MANUAL_ADJUST', label: 'Counts' },
    { key: 'STOCKTAKE_ADJUST', label: 'Audits' },
    { key: 'SPOILAGE_WASTE', label: 'Waste' },
    { key: 'CANCEL_RESTORE', label: 'Voids' },
  ];

  return (
    <View className="gap-4">
      {/* Sub-tab bar + Quick Action */}
      <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row items-center gap-2">
            {(
              [
                { id: 'movements', label: 'Movements', count: filteredMovements.length },
                { id: 'stocktakes', label: 'Stocktakes', count: stocktakeSessions.length },
                { id: 'waste', label: 'Waste Logs', count: wasteLogs.length },
              ] as Array<{ id: ActivitySubTab; label: string; count: number }>
            ).map((tab) => {
              const isActive = subTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setSubTab(tab.id)}
                  className={`min-h-[48px] px-4 rounded-xl border flex-row items-center justify-center ${
                    isActive
                      ? 'bg-[#810021] border-[#810021]'
                      : 'bg-white border-[#E7E5E4] active:opacity-80'
                  }`}
                >
                  <Text
                    className={`text-base font-bold tabular-nums ${
                      isActive ? 'text-white' : 'text-[#1C1917]'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {subTab === 'stocktakes' && (
          <Pressable
            onPress={onOpenStocktake}
            className="min-h-[48px] px-4 rounded-xl bg-[#810021] flex-row items-center justify-center active:opacity-85"
          >
            <ClipboardCheck size={18} color="#FFFFFF" />
            <Text className="ml-2 text-base font-bold text-white">Start Stocktake</Text>
          </Pressable>
        )}

        {subTab === 'waste' && (
          <Pressable
            onPress={onOpenWaste}
            className="min-h-[48px] px-4 rounded-xl bg-[#810021] flex-row items-center justify-center active:opacity-85"
          >
            <Trash2 size={18} color="#FFFFFF" />
            <Text className="ml-2 text-base font-bold text-white">Log Waste</Text>
          </Pressable>
        )}
      </View>

      {/* MOVEMENTS */}
      {subTab === 'movements' && (
        <View className="gap-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row items-center gap-2">
              {movementFilters.map((pill) => {
                const isActive = ledgerTypeFilter === pill.key;
                return (
                  <Pressable
                    key={pill.key}
                    onPress={() => setLedgerTypeFilter(pill.key)}
                    className={`min-h-[48px] px-3.5 rounded-xl border items-center justify-center ${
                      isActive
                        ? 'bg-[#1C1917] border-[#1C1917]'
                        : 'bg-white border-[#E7E5E4] active:opacity-80'
                    }`}
                  >
                    <Text
                      className={`text-base font-semibold ${
                        isActive ? 'text-white' : 'text-[#1C1917]'
                      }`}
                    >
                      {pill.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden">
            {filteredMovements.length === 0 ? (
              <View className="py-12 items-center justify-center px-4">
                <FileText size={36} color="#78716C" />
                <Text className="mt-3 text-base font-bold text-[#1C1917]">
                  No stock movements match this filter.
                </Text>
              </View>
            ) : (
              <View className="divide-y divide-[#E7E5E4]">
                {filteredMovements.map((mov) => {
                  const isDeduction = Number(mov.change_amount || 0) < 0;
                  const absAmount = Math.abs(Number(mov.change_amount || 0));

                  return (
                    <View
                      key={mov.id}
                      className="p-4 flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <View className="flex-row items-center gap-3 flex-1 min-w-0">
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-xl border ${
                            isDeduction
                              ? 'bg-rose-50 border-rose-200'
                              : 'bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {isDeduction ? (
                            <ArrowDownRight size={18} color="#b32638" />
                          ) : (
                            <ArrowUpRight size={18} color="#10b981" />
                          )}
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-base font-bold text-[#1C1917]" numberOfLines={1}>
                            {mov.inventory_item?.name || 'Inventory Ingredient'}
                          </Text>
                          <Text className="text-base text-[#78716C]" numberOfLines={1}>
                            {new Date(mov.created_at).toLocaleString()} • {mov.movement_type}
                          </Text>
                        </View>
                      </View>

                      <View className="items-start sm:items-end">
                        <Text
                          className={`text-base font-extrabold tabular-nums ${
                            isDeduction ? 'text-[#b32638]' : 'text-[#10b981]'
                          }`}
                        >
                          {isDeduction ? `-${absAmount.toFixed(2)}` : `+${absAmount.toFixed(2)}`}{' '}
                          {mov.inventory_item?.unit}
                        </Text>
                        <Text className="text-base text-[#78716C] tabular-nums">
                          Balance: {Number(mov.balance_after || 0).toFixed(2)}{' '}
                          {mov.inventory_item?.unit}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      {/* STOCKTAKE SESSIONS */}
      {subTab === 'stocktakes' && (
        <View className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden">
          {stocktakeSessions.length === 0 ? (
            <View className="py-12 items-center justify-center px-4">
              <ClipboardCheck size={36} color="#78716C" />
              <Text className="mt-3 text-base font-bold text-[#1C1917] text-center">
                No stocktake audits recorded yet.
              </Text>
            </View>
          ) : (
            <View className="divide-y divide-[#E7E5E4]">
              {stocktakeSessions.map((session) => {
                const variance = Number(session.total_variance_cost || 0);
                return (
                  <View
                    key={session.id}
                    className="p-4 flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <View className="flex-1 min-w-0">
                      <Text className="text-base font-bold text-[#1C1917]">
                        {session.notes || 'Physical Stocktake Count'}
                      </Text>
                      <Text className="text-base text-[#78716C]">
                        {new Date(session.created_at).toLocaleString()}
                      </Text>
                    </View>
                    <Text
                      className={`text-base font-extrabold tabular-nums ${
                        variance < 0
                          ? 'text-[#b32638]'
                          : variance > 0
                            ? 'text-[#10b981]'
                            : 'text-[#1C1917]'
                      }`}
                    >
                      {variance < 0 ? '-' : '+'}
                      {formatCurrency(Math.abs(variance))}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* WASTE LOGS */}
      {subTab === 'waste' && (
        <View className="rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden">
          {wasteLogs.length === 0 ? (
            <View className="py-12 items-center justify-center px-4">
              <Trash2 size={36} color="#78716C" />
              <Text className="mt-3 text-base font-bold text-[#1C1917] text-center">
                No spillage or waste events logged.
              </Text>
            </View>
          ) : (
            <View className="divide-y divide-[#E7E5E4]">
              {wasteLogs.map((log) => (
                <View
                  key={log.id}
                  className="p-4 flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <View className="flex-1 min-w-0">
                    <Text className="text-base font-bold text-[#1C1917]">
                      {log.inventory_item?.name || 'Inventory Item'}
                    </Text>
                    <Text className="text-base text-[#78716C]">
                      {log.reason.replace(/_/g, ' ')} • {new Date(log.created_at).toLocaleString()}
                    </Text>
                  </View>
                  <View className="items-start sm:items-end">
                    <Text className="text-base font-extrabold text-[#b32638] tabular-nums">
                      -{Number(log.quantity || 0).toFixed(2)} {log.inventory_item?.unit}
                    </Text>
                    <Text className="text-base text-[#78716C] tabular-nums">
                      Loss: {formatCurrency(log.cost_lost)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
