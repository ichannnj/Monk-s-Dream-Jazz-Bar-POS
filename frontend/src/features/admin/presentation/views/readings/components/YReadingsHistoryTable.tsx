import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { ArrowRightLeft, Receipt } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { YReadingRecord, ReadingData } from '../../../../data/readings.api';

interface YReadingsHistoryTableProps {
  history: YReadingRecord[];
  onViewRecord: (record: ReadingData) => void;
}

export const YReadingsHistoryTable: React.FC<YReadingsHistoryTableProps> = ({
  history,
  onViewRecord,
}) => {
  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
      <View className="px-6 py-4 border-b border-stone-200 flex-row items-center justify-between bg-stone-50/50">
        <View>
          <Text className="text-lg font-extrabold text-stone-900">Shift Handover Y-Reports</Text>
          <Text className="text-base text-stone-500 font-medium">
            Audited cashier shift handovers and rotation drawer reconciliations
          </Text>
        </View>
        <Text className="text-base font-bold text-stone-600">{history.length} Handovers</Text>
      </View>

      {history.length === 0 ? (
        <View className="p-8 items-center justify-center">
          <ArrowRightLeft size={36} color="#a8a29e" />
          <Text className="text-lg font-bold text-stone-700 mt-2">No Shift Handovers Found</Text>
          <Text className="text-base text-stone-500 mt-1 text-center">
            No shift handover records match the search or till filter.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="min-w-[800px] divide-y divide-stone-100">
            <View className="flex-row items-center px-6 py-3 bg-stone-100/70">
              <Text className="w-24 text-base font-bold text-stone-700">Y-Number</Text>
              <Text className="w-40 text-base font-bold text-stone-700">Date &amp; Time</Text>
              <Text className="w-32 text-base font-bold text-stone-700">Till</Text>
              <Text className="w-44 text-base font-bold text-stone-700">Outgoing Cashier</Text>
              <Text className="w-44 text-base font-bold text-stone-700">Incoming Cashier</Text>
              <Text className="w-32 text-base font-bold text-stone-700 text-right">Net Sales</Text>
              <Text className="w-32 text-base font-bold text-stone-700 text-center">Variance</Text>
              <Text className="w-28 text-base font-bold text-stone-700 text-right">Actions</Text>
            </View>

            {history.map((rec) => (
              <View key={rec.id} className="flex-row items-center px-6 py-3.5 hover:bg-stone-50/70">
                <View className="w-24 flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-amber-500" />
                  <Text className="text-base font-black text-stone-900">
                    Y-{String(rec.y_number).padStart(4, '0')}
                  </Text>
                </View>
                <View className="w-40">
                  <Text className="text-base font-bold text-stone-900">
                    {new Date(rec.closed_at).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text className="text-xs text-stone-500">
                    {new Date(rec.closed_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View className="w-32">
                  <Text className="text-base font-semibold text-stone-700">
                    {rec.drawer_target === 'bar'
                      ? 'Bar Till'
                      : rec.drawer_target === 'main'
                        ? 'Main Till'
                        : 'Consolidated'}
                  </Text>
                </View>
                <View className="w-44">
                  <Text className="text-base font-medium text-stone-800">
                    {rec.outgoing_staff_name}
                  </Text>
                </View>
                <View className="w-44">
                  <Text className="text-base font-medium text-stone-800">
                    {rec.incoming_staff_name}
                  </Text>
                </View>
                <View className="w-32 items-end">
                  <Text className="text-base font-black text-stone-900">
                    {formatCurrency(rec.net_sales)}
                  </Text>
                </View>
                <View className="w-32 items-center">
                  <View
                    className={`px-3 py-1 rounded-lg ${
                      rec.variance === 0
                        ? 'bg-emerald-50 border border-emerald-200'
                        : rec.variance > 0
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <Text
                      className={`text-base font-extrabold ${
                        rec.variance === 0
                          ? 'text-emerald-700'
                          : rec.variance > 0
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {rec.variance === 0
                        ? 'Balanced'
                        : `${rec.variance > 0 ? '+' : ''}${formatCurrency(rec.variance)}`}
                    </Text>
                  </View>
                </View>
                <View className="w-28 items-end">
                  <Pressable
                    onPress={() => {
                      const readingData: ReadingData = {
                        reading_type: 'Y_READING',
                        y_number: rec.y_number,
                        drawer_target: rec.drawer_target,
                        opened_at: rec.opened_at,
                        closed_at: rec.closed_at,
                        outgoing_staff_name: rec.outgoing_staff_name,
                        incoming_staff_name: rec.incoming_staff_name,
                        performed_by_name: rec.outgoing_staff_name,
                        gross_sales: rec.gross_sales,
                        discount_total: rec.discount_total,
                        net_sales: rec.net_sales,
                        vatable_sales: rec.vatable_sales,
                        vat_amount: rec.vat_amount,
                        vat_exempt_sales: 0,
                        service_charge: rec.service_charge,
                        tender_cash: rec.tender_cash,
                        tender_card: rec.tender_card,
                        tender_digital: rec.tender_digital,
                        tender_delivery: rec.tender_delivery,
                        total_tender: rec.total_tender,
                        opening_float: rec.opening_float,
                        cash_in: rec.cash_in,
                        cash_out: rec.cash_out,
                        safe_drops: rec.safe_drops,
                        expected_cash: rec.expected_cash,
                        counted_cash: rec.counted_cash,
                        variance: rec.variance,
                        transaction_count: rec.transaction_count,
                        first_receipt_no: rec.first_receipt_no || 'N/A',
                        last_receipt_no: rec.last_receipt_no || 'N/A',
                        notes: rec.notes || undefined,
                      };
                      onViewRecord(readingData);
                    }}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 min-h-[40px]"
                  >
                    <Receipt size={16} color="#44403c" />
                    <Text className="text-base font-bold text-stone-800">Reprint</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};
