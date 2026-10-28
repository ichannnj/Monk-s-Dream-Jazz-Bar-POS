import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { BarChart3, Receipt } from 'lucide-react-native';
import { ChecksHistoryView } from '@/features/check-history/presentation/ChecksHistoryView';
import type { SalesAnalyticsOverview } from '../../data/admin.api';

interface AdminTransactionsViewProps {
  analytics: SalesAnalyticsOverview | null;
  onRefresh: () => void;
}

export const AdminTransactionsView: React.FC<AdminTransactionsViewProps> = ({ analytics }) => {
  const [subTab, setSubTab] = useState<'analytics' | 'checks'>('analytics');

  return (
    <View className="flex-1 bg-[#fcf9f9]">
      {/* Sub-navigation bar */}
      <View className="flex-row items-center border-b border-stone-200 bg-white px-8 py-3">
        <Pressable
          onPress={() => setSubTab('analytics')}
          className={`mr-6 flex-row items-center rounded-xl px-4 py-2 ${
            subTab === 'analytics' ? 'bg-[#800020] text-white' : 'bg-stone-100'
          }`}
        >
          <BarChart3 size={16} color={subTab === 'analytics' ? '#ffffff' : '#44403c'} />
          <Text
            className={`ml-2 text-sm font-bold ${
              subTab === 'analytics' ? 'text-white' : 'text-stone-700'
            }`}
          >
            Multi-Channel Financial Overview
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSubTab('checks')}
          className={`flex-row items-center rounded-xl px-4 py-2 ${
            subTab === 'checks' ? 'bg-[#800020] text-white' : 'bg-stone-100'
          }`}
        >
          <Receipt size={16} color={subTab === 'checks' ? '#ffffff' : '#44403c'} />
          <Text
            className={`ml-2 text-sm font-bold ${
              subTab === 'checks' ? 'text-white' : 'text-stone-700'
            }`}
          >
            Customer Checks & Thermal Reprint
          </Text>
        </Pressable>
      </View>

      {subTab === 'checks' ? (
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
                    <Text className="text-xs text-stone-400">{data.count} fulfilled orders</Text>
                  </View>

                  <Text className="text-lg font-black text-stone-900">
                    ₱{data.sales.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Financial Summary */}
          <View className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
              <Text className="text-xs font-semibold text-stone-400">Gross Sales</Text>
              <Text className="text-2xl font-black text-stone-900 mt-1">
                ₱{(analytics?.grossSales || 0).toFixed(2)}
              </Text>
              <Text className="text-xs text-emerald-600 mt-1">
                {analytics?.orderCount || 0} Settled Orders
              </Text>
            </View>

            <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
              <Text className="text-xs font-semibold text-stone-400">Est. COGS (28%)</Text>
              <Text className="text-2xl font-black text-stone-900 mt-1">
                ₱{(analytics?.totalCogs || 0).toFixed(2)}
              </Text>
              <Text className="text-xs text-stone-400 mt-1">Ingredients cost baseline</Text>
            </View>

            <View className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-xs">
              <Text className="text-xs font-semibold text-stone-400">Net Estimated Profit</Text>
              <Text className="text-2xl font-black text-[#800020] mt-1">
                ₱{(analytics?.estimatedNetProfit || 0).toFixed(2)}
              </Text>
              <Text className="text-xs text-stone-400 mt-1">After labor & overhead</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};
