import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { BarChart3, Receipt, FileText } from 'lucide-react-native';
import { ChecksHistoryView } from '@/features/check-history/presentation/ChecksHistoryView';
import { AdminReadingsView } from './readings/AdminReadingsView';
import type { SalesAnalyticsOverview } from '../../data/admin.api';

interface AdminTransactionsViewProps {
  analytics: SalesAnalyticsOverview | null;
  onRefresh: () => void;
}

export const AdminTransactionsView: React.FC<AdminTransactionsViewProps> = ({ analytics }) => {
  const [subTab, setSubTab] = useState<'analytics' | 'checks' | 'readings'>('analytics');

  return (
    <View className="flex-1 bg-[#fcf9f9]">
      {/* Sub-navigation bar */}
      <View className="flex-row items-center border-b border-stone-200 bg-white px-8 py-3.5">
        <Pressable
          onPress={() => setSubTab('analytics')}
          className={`mr-4 min-h-[48px] flex-row items-center rounded-xl px-5 ${
            subTab === 'analytics' ? 'bg-[#800020]' : 'bg-stone-100 active:bg-stone-200'
          }`}
        >
          <BarChart3 size={20} color={subTab === 'analytics' ? '#ffffff' : '#44403c'} />
          <Text
            className={`ml-2 text-base font-bold ${
              subTab === 'analytics' ? 'text-white' : 'text-stone-700'
            }`}
          >
            Multi-Channel Financial Overview
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSubTab('checks')}
          className={`mr-4 min-h-[48px] flex-row items-center rounded-xl px-5 ${
            subTab === 'checks' ? 'bg-[#800020]' : 'bg-stone-100 active:bg-stone-200'
          }`}
        >
          <Receipt size={20} color={subTab === 'checks' ? '#ffffff' : '#44403c'} />
          <Text
            className={`ml-2 text-base font-bold ${
              subTab === 'checks' ? 'text-white' : 'text-stone-700'
            }`}
          >
            Customer Checks & Thermal Reprint
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSubTab('readings')}
          className={`min-h-[48px] flex-row items-center rounded-xl px-5 ${
            subTab === 'readings' ? 'bg-[#800020]' : 'bg-stone-100 active:bg-stone-200'
          }`}
        >
          <FileText size={20} color={subTab === 'readings' ? '#ffffff' : '#44403c'} />
          <Text
            className={`ml-2 text-base font-bold ${
              subTab === 'readings' ? 'text-white' : 'text-stone-700'
            }`}
          >
            X & Z Shift Readings
          </Text>
        </Pressable>
      </View>

      {subTab === 'readings' ? (
        <View className="flex-1">
          <AdminReadingsView />
        </View>
      ) : subTab === 'checks' ? (
        <View className="flex-1">
          <ChecksHistoryView />
        </View>
      ) : (
        <ScrollView className="flex-1 p-8" showsVerticalScrollIndicator={false}>
          {/* Channel Breakdown Card */}
          <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs mb-6">
            <Text className="text-xl font-bold text-stone-900 mb-4">
              Sales by Channel & Fulfilment Route
            </Text>

            <View className="space-y-3">
              {Object.entries(analytics?.channelBreakdown || {}).map(([channel, data]) => (
                <View
                  key={channel}
                  className="flex-row items-center justify-between border-b border-stone-100 py-3.5"
                >
                  <View>
                    <Text className="text-base font-bold text-stone-800">
                      {channel.replace('_', ' ')}
                    </Text>
                    <Text className="text-base text-stone-500">{data.count} fulfilled orders</Text>
                  </View>

                  <Text className="text-lg font-black text-stone-900">
                    ₱{Number(data.sales || 0).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Financial Summary */}
          <View className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
              <Text className="text-base font-semibold text-stone-500">Gross Sales</Text>
              <Text className="text-2xl font-black text-stone-900 mt-1">
                ₱{Number(analytics?.grossSales || 0).toFixed(2)}
              </Text>
              <Text className="text-base font-medium text-emerald-600 mt-1">
                {analytics?.orderCount || 0} Settled Orders
              </Text>
            </View>

            <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
              <Text className="text-base font-semibold text-stone-500">Est. COGS (28%)</Text>
              <Text className="text-2xl font-black text-stone-900 mt-1">
                ₱{Number(analytics?.totalCogs || 0).toFixed(2)}
              </Text>
              <Text className="text-base text-stone-400 mt-1">Ingredients cost baseline</Text>
            </View>

            <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
              <Text className="text-base font-semibold text-stone-500">Net Estimated Profit</Text>
              <Text className="text-2xl font-black text-[#800020] mt-1">
                ₱{Number(analytics?.estimatedNetProfit || 0).toFixed(2)}
              </Text>
              <Text className="text-base text-stone-400 mt-1">After labor & overhead</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};
