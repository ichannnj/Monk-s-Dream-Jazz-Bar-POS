import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Receipt, Eye, Printer, Calendar, User, ArrowRight } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { ZReadingRecord, ReadingData } from '../../../data/readings.api';

interface ZReadingsHistoryTableProps {
  history: ZReadingRecord[];
  onViewRecord: (readingData: ReadingData) => void;
}

export const ZReadingsHistoryTable: React.FC<ZReadingsHistoryTableProps> = ({
  history,
  onViewRecord,
}) => {
  if (history.length === 0) {
    return (
      <View className="rounded-2xl border border-stone-200/80 bg-white p-8 items-center justify-center my-4">
        <Receipt size={36} color="#a8a29e" />
        <Text className="text-lg font-bold text-stone-700 mt-2">No Past Z-Readings Recorded</Text>
        <Text className="text-base text-stone-500 mt-1 text-center">
          When shifts are officially closed, permanent Z-Reading records will appear here for audit
          and reprint.
        </Text>
      </View>
    );
  }

  const handleSelectRecord = (rec: ZReadingRecord) => {
    const readingData: ReadingData = {
      reading_type: 'Z_READING',
      z_number: rec.z_number,
      drawer_target: rec.drawer_target,
      opened_at: rec.opened_at,
      closed_at: rec.closed_at,
      performed_by_name: rec.performed_by_name,
      gross_sales: rec.gross_sales,
      discount_total: rec.discount_total,
      net_sales: rec.net_sales,
      vatable_sales: rec.vatable_sales,
      vat_amount: rec.vat_amount,
      vat_exempt_sales: rec.vat_exempt_sales,
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
  };

  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white overflow-hidden shadow-xs">
      <View className="px-6 py-4 border-b border-stone-200 flex-row items-center justify-between bg-stone-50/50">
        <View>
          <Text className="text-lg font-extrabold text-stone-900">Historical Shift Z-Readings</Text>
          <Text className="text-base text-stone-500 font-medium">
            Permanent archive of closed shifts, cash reconciliations, and tax summaries
          </Text>
        </View>
        <Text className="text-base font-bold text-stone-600">{history.length} Saved Records</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="min-w-[800px] divide-y divide-stone-100">
          {/* Header Row */}
          <View className="flex-row items-center px-6 py-3 bg-stone-100/70">
            <Text className="w-24 text-base font-bold text-stone-700">Z-Number</Text>
            <Text className="w-44 text-base font-bold text-stone-700">Date & Time</Text>
            <Text className="w-36 text-base font-bold text-stone-700">Till Scope</Text>
            <Text className="w-36 text-base font-bold text-stone-700">Closed By</Text>
            <Text className="w-32 text-base font-bold text-stone-700 text-right">Net Sales</Text>
            <Text className="w-32 text-base font-bold text-stone-700 text-right">Counted Cash</Text>
            <Text className="w-36 text-base font-bold text-stone-700 text-center">Variance</Text>
            <Text className="w-28 text-base font-bold text-stone-700 text-right">Actions</Text>
          </View>

          {/* Data Rows */}
          {history.map((record) => {
            const dateStr = new Date(record.closed_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = new Date(record.closed_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            const scopeLabel =
              record.drawer_target === 'bar'
                ? 'Bar Till'
                : record.drawer_target === 'main'
                  ? 'Main Floor'
                  : 'Consolidated';

            return (
              <View
                key={record.id}
                className="flex-row items-center px-6 py-3.5 hover:bg-stone-50/70"
              >
                <View className="w-24 flex-row items-center gap-1.5">
                  <View className="w-2 h-2 rounded-full bg-[#800020]" />
                  <Text className="text-base font-black text-stone-900">
                    Z-{String(record.z_number).padStart(4, '0')}
                  </Text>
                </View>

                <View className="w-44">
                  <Text className="text-base font-bold text-stone-900">{dateStr}</Text>
                  <Text className="text-sm text-stone-500">{timeStr}</Text>
                </View>

                <View className="w-36">
                  <View className="self-start px-2.5 py-1 rounded-md bg-stone-100">
                    <Text className="text-base font-semibold text-stone-700">{scopeLabel}</Text>
                  </View>
                </View>

                <View className="w-36">
                  <Text className="text-base font-medium text-stone-800">
                    {record.performed_by_name}
                  </Text>
                </View>

                <View className="w-32 items-end">
                  <Text className="text-base font-black text-stone-900">
                    {formatCurrency(record.net_sales)}
                  </Text>
                  <Text className="text-xs text-stone-400">
                    Gross: {formatCurrency(record.gross_sales)}
                  </Text>
                </View>

                <View className="w-32 items-end">
                  <Text className="text-base font-bold text-stone-900">
                    {formatCurrency(record.counted_cash)}
                  </Text>
                </View>

                <View className="w-36 items-center">
                  <View
                    className={`px-3 py-1 rounded-lg ${
                      record.variance === 0
                        ? 'bg-emerald-50 border border-emerald-200'
                        : record.variance > 0
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <Text
                      className={`text-base font-extrabold ${
                        record.variance === 0
                          ? 'text-emerald-700'
                          : record.variance > 0
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {record.variance === 0
                        ? 'Balanced'
                        : `${record.variance > 0 ? '+' : ''}${formatCurrency(record.variance)}`}
                    </Text>
                  </View>
                </View>

                <View className="w-28 items-end">
                  <Pressable
                    onPress={() => handleSelectRecord(record)}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 min-h-[40px]"
                  >
                    <Eye size={16} color="#44403c" />
                    <Text className="text-base font-bold text-stone-800">Reprint</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};
