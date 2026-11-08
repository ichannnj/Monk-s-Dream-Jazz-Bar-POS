import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  ClipboardCheck,
  Trash2,
} from 'lucide-react-native';
import { StockMovementAdmin } from '../../../../data/admin.api';

interface InventoryMovementsAndAuditSectionProps {
  activeTab: 'ledger' | 'stocktake' | 'waste';
  filteredMovements: StockMovementAdmin[];
  ledgerTypeFilter: string;
  setLedgerTypeFilter: (val: string) => void;
  onOpenStocktake: () => void;
  onOpenWaste: () => void;
}

export const InventoryMovementsAndAuditSection: React.FC<
  InventoryMovementsAndAuditSectionProps
> = ({
  activeTab,
  filteredMovements,
  ledgerTypeFilter,
  setLedgerTypeFilter,
  onOpenStocktake,
  onOpenWaste,
}) => {
  if (activeTab === 'stocktake') {
    return (
      <View className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
          <View>
            <Text className="text-2xl font-black text-stone-900">
              Cycle Counts &amp; Physical Stocktake
            </Text>
            <Text className="text-sm font-medium text-stone-500 mt-1">
              Audit shelf inventory against expected theoretical stock to detect shrinkage and
              over-pouring
            </Text>
          </View>

          <Pressable
            onPress={onOpenStocktake}
            className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-[#800020] px-6 active:opacity-90 shadow-sm"
          >
            <ClipboardCheck size={20} color="#ffffff" />
            <Text className="ml-2 text-base font-bold text-white">Start Physical Count</Text>
          </Pressable>
        </View>

        <View className="rounded-xl bg-stone-50 p-5 border border-stone-200 space-y-2.5">
          <Text className="text-sm font-bold text-stone-900">Stocktake Operational Standard:</Text>
          <Text className="text-xs sm:text-sm text-stone-600">
            • Expected on-hand stock incorporates live recipe depletion on KDS ready tickets and
            recorded deliveries.
          </Text>
          <Text className="text-xs sm:text-sm text-stone-600">
            • Actual counts are compared instantly:{' '}
            <Text className="font-mono font-bold text-stone-800">Variance = Actual - Expected</Text>
            .
          </Text>
          <Text className="text-xs sm:text-sm text-stone-600">
            • Committing updates the ledger with immutable{' '}
            <Text className="font-mono font-bold text-stone-800">STOCKTAKE_ADJUST</Text> audit
            movements.
          </Text>
        </View>
      </View>
    );
  }

  if (activeTab === 'waste') {
    return (
      <View className="rounded-2xl border border-stone-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <View className="flex-col sm:flex-row sm:items-center justify-between gap-4">
          <View>
            <Text className="text-2xl font-black text-stone-900">
              Spillage, Spoilage &amp; Waste Loss Log
            </Text>
            <Text className="text-sm font-medium text-stone-500 mt-1">
              Account for dropped bottles, expired perishables, burned food, or tasting flights
            </Text>
          </View>

          <Pressable
            onPress={onOpenWaste}
            className="min-h-[48px] flex-row items-center justify-center rounded-xl bg-rose-700 px-6 active:opacity-90 shadow-sm"
          >
            <Trash2 size={20} color="#ffffff" />
            <Text className="ml-2 text-base font-bold text-white">Log Waste Event</Text>
          </Pressable>
        </View>

        <View className="rounded-xl bg-rose-50/60 p-5 border border-rose-200 space-y-2.5">
          <Text className="text-sm font-bold text-rose-950">Loss Accounting Guardrail:</Text>
          <Text className="text-xs sm:text-sm text-rose-800">
            Logging waste immediately deducts ingredient quantities from active stock and attributes
            the financial cost (Quantity × MAC) to operational overhead, maintaining audit
            transparency.
          </Text>
        </View>
      </View>
    );
  }

  // Active tab === 'ledger'
  return (
    <View className="space-y-4">
      <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
        <View>
          <Text className="text-xl font-bold text-stone-900">Immutable Stock Movement Ledger</Text>
          <Text className="text-xs font-medium text-stone-500 mt-0.5">
            Audit trail of deliveries, depletions on KDS ready, adjustments, and waste
          </Text>
        </View>

        {/* Ledger Movement Type Filters */}
        <View className="flex-row items-center gap-1.5 flex-wrap">
          {[
            { key: 'ALL', label: 'All Events' },
            { key: 'SALE_DEPLETION', label: 'Sale Depletions' },
            { key: 'RESTOCK_DELIVERY', label: 'Deliveries' },
            { key: 'MANUAL_ADJUST', label: 'Manual Counts' },
            { key: 'SPOILAGE_WASTE', label: 'Waste Logs' },
            { key: 'CANCEL_RESTORE', label: 'Void Restorals' },
          ].map((pill) => (
            <Pressable
              key={pill.key}
              onPress={() => setLedgerTypeFilter(pill.key)}
              className={`rounded-lg px-2.5 py-1.5 border text-xs ${
                ledgerTypeFilter === pill.key
                  ? 'bg-stone-900 border-stone-900 text-white font-bold'
                  : 'bg-white border-stone-200 text-stone-700 active:bg-stone-100'
              }`}
            >
              <Text
                className={`text-xs ${
                  ledgerTypeFilter === pill.key
                    ? 'text-white font-bold'
                    : 'text-stone-700 font-medium'
                }`}
              >
                {pill.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
        {filteredMovements.length === 0 ? (
          <View className="py-14 items-center justify-center">
            <FileText size={44} color="#a8a29e" />
            <Text className="mt-3 text-base font-bold text-stone-700">
              No stock movements match the filter.
            </Text>
          </View>
        ) : (
          <View className="divide-y divide-stone-100">
            {filteredMovements.map((mov) => {
              const isDeduction = Number(mov.change_amount || 0) < 0;
              const absAmount = Math.abs(Number(mov.change_amount || 0));

              return (
                <View
                  key={mov.id}
                  className="p-4 sm:px-6 sm:py-3.5 flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`h-9 w-9 items-center justify-center rounded-xl ${
                        isDeduction ? 'bg-rose-100' : 'bg-emerald-100'
                      }`}
                    >
                      {isDeduction ? (
                        <ArrowDownRight size={17} color="#e11d48" />
                      ) : (
                        <ArrowUpRight size={17} color="#059669" />
                      )}
                    </View>
                    <View>
                      <Text className="text-sm sm:text-base font-bold text-stone-900">
                        {mov.inventory_item?.name || 'Inventory Ingredient'}
                      </Text>
                      <Text className="text-xs text-stone-500 mt-0.5">
                        {new Date(mov.created_at).toLocaleString()} • Ref:{' '}
                        <Text className="font-mono text-stone-700">
                          {mov.reference_id ? mov.reference_id.slice(0, 8) : 'System'}
                        </Text>
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between sm:justify-end gap-3">
                    <View
                      className={`rounded-md px-2 py-0.5 border ${
                        mov.movement_type === 'RESTOCK_DELIVERY'
                          ? 'bg-emerald-50 border-emerald-300'
                          : mov.movement_type === 'SALE_DEPLETION'
                            ? 'bg-stone-100 border-stone-300'
                            : mov.movement_type === 'CANCEL_RESTORE'
                              ? 'bg-blue-50 border-blue-300'
                              : mov.movement_type === 'SPOILAGE_WASTE'
                                ? 'bg-rose-50 border-rose-300'
                                : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <Text className="text-xs font-bold text-stone-800">{mov.movement_type}</Text>
                    </View>

                    <View className="items-end">
                      <Text
                        className={`text-sm sm:text-base font-black ${
                          isDeduction ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {isDeduction ? `-${absAmount.toFixed(2)}` : `+${absAmount.toFixed(2)}`}{' '}
                        {mov.inventory_item?.unit}
                      </Text>
                      <Text className="text-[11px] text-stone-500">
                        Balance: {mov.balance_after} {mov.inventory_item?.unit}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};
