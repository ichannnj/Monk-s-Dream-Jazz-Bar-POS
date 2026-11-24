import React from 'react';
import { View, Text } from 'react-native';
import { Coffee, Wine, ShoppingBag, Bike, Layers } from 'lucide-react-native';
import { HourlySalesVelocityChart } from '../analytics/HourlySalesVelocityChart';
import { PaymentTenderMixBar } from '../analytics/PaymentTenderMixBar';
import type { SalesAnalyticsOverview } from '../../../data/admin.api';

interface FinancialOverviewChartsAndBreakdownProps {
  effectiveAnalytics: SalesAnalyticsOverview | null;
  channelEntries: [string, any][];
  grossSales: number;
  orderCount: number;
  totalCogs: number;
  cogsMargin: number;
  estimatedNetProfit: number;
  profitMargin: number;
}

export const FinancialOverviewChartsAndBreakdown: React.FC<
  FinancialOverviewChartsAndBreakdownProps
> = ({
  effectiveAnalytics,
  channelEntries,
  grossSales,
  orderCount,
  totalCogs,
  cogsMargin,
  estimatedNetProfit,
  profitMargin,
}) => {
  const getChannelMeta = (channelKey: string) => {
    const normalized = channelKey.toLowerCase();
    if (normalized.includes('cafe')) {
      return {
        label: 'CAFE AREA',
        subtext: 'Espresso & Handcrafted Beverages',
        icon: <Coffee size={18} color="#1A1617" />,
        progressBg: 'bg-stone-800',
      };
    }
    if (normalized.includes('bar')) {
      return {
        label: 'MUSIC LOUNGE',
        subtext: 'Cocktails, Wine & Spirits',
        icon: <Wine size={18} color="#810021" />,
        progressBg: 'bg-[#810021]',
      };
    }
    if (normalized.includes('grab')) {
      return {
        label: 'GrabFood Delivery',
        subtext: 'Online Delivery Dispatch',
        icon: <Bike size={18} color="#1A1617" />,
        progressBg: 'bg-stone-600',
      };
    }
    return {
      label: channelKey.replace(/_/g, ' '),
      subtext: 'Direct Counter Pickups',
      icon: <ShoppingBag size={18} color="#1A1617" />,
      progressBg: 'bg-stone-700',
    };
  };

  return (
    <>
      {/* Visual Analytics Suite: Hourly Pacing & Payment Tender Mix */}
      <View className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5 print-hidden">
        <HourlySalesVelocityChart
          data={effectiveAnalytics?.hourlySales || []}
          peakHourLabel={effectiveAnalytics?.peakHourLabel}
          totalSales={grossSales}
        />

        <PaymentTenderMixBar
          data={
            effectiveAnalytics?.tenderBreakdown || {
              cash: 0,
              card: 0,
              digital: 0,
              delivery: 0,
              total: grossSales,
            }
          }
        />
      </View>

      {/* Channel Breakdown Card */}
      <View className="rounded-xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs mb-5 print-avoid-break">
        <View className="flex-row items-center justify-between pb-3.5 mb-3.5 border-b border-stone-100 flex-wrap gap-2">
          <View>
            <View className="flex-row items-center gap-2">
              <Layers size={18} color="#810021" />
              <Text className="text-base sm:text-lg font-bold text-stone-900">
                Sales by Channel &amp; Route
              </Text>
            </View>
            <Text className="text-xs text-stone-500 mt-0.5">
              Volume and revenue yield across operational channels
            </Text>
          </View>

          <View className="bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-lg">
            <Text className="text-xs font-semibold text-stone-700">
              {channelEntries.length} Channels
            </Text>
          </View>
        </View>

        {/* Channel List */}
        <View className="report-grid-2col space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
          {channelEntries.map(([channel, data]) => {
            const meta = getChannelMeta(channel);
            const salesValue = Number(data.sales || 0);
            const percentOfTotal = grossSales > 0 ? Math.round((salesValue / grossSales) * 100) : 0;

            return (
              <View
                key={channel}
                className="p-3 sm:p-3.5 rounded-xl border border-stone-200/80 bg-[#EFECE6] justify-between"
              >
                <View className="flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Left: Icon, Name, and Meta */}
                  <View className="flex-row items-center gap-2.5">
                    <View className="w-9 h-9 rounded-lg items-center justify-center border border-stone-200 bg-white">
                      {meta.icon}
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm sm:text-base font-bold text-stone-900">
                          {meta.label}
                        </Text>
                        <View className="bg-white border border-stone-200 px-1.5 py-0.2 rounded">
                          <Text className="text-xs font-semibold text-stone-700">
                            {data.count} {data.count === 1 ? 'order' : 'orders'}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-stone-500 mt-0.5">{meta.subtext}</Text>
                    </View>
                  </View>

                  {/* Right: Sales and Percentage */}
                  <View className="flex-row items-baseline sm:flex-col sm:items-end justify-between sm:justify-center">
                    <Text className="text-sm sm:text-base font-black text-stone-900 tracking-tight">
                      ₱
                      {salesValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text className="text-xs font-bold text-stone-500">
                      {percentOfTotal}% of sales
                    </Text>
                  </View>
                </View>

                {/* Progress Bar Container */}
                <View className="mt-2.5 w-full bg-stone-200/80 h-1.5 rounded-full overflow-hidden">
                  <View
                    className={`h-full rounded-full ${meta.progressBg}`}
                    style={{ width: `${Math.min(100, Math.max(percentOfTotal, 0))}%` }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Financial Breakdown & Margin Cards */}
      <View className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 print-avoid-break">
        <View className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <Text className="text-xs font-bold text-stone-500">Gross Sales Revenue</Text>
          <Text className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
            ₱
            {grossSales.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="mt-2.5 pt-2 border-t border-stone-100 flex-row items-center justify-between">
            <Text className="text-xs text-stone-500">Settled Transactions</Text>
            <Text className="text-xs font-bold text-stone-800">{orderCount} tabs</Text>
          </View>
        </View>

        <View className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <Text className="text-xs font-bold text-stone-500">Cost of Goods Sold (COGS)</Text>
          <Text className="text-xl sm:text-2xl font-black text-stone-900 mt-1">
            ₱
            {totalCogs.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="mt-2.5 pt-2 border-t border-stone-100 flex-row items-center justify-between">
            <Text className="text-xs text-stone-500">Ingredients baseline</Text>
            <Text className="text-xs font-bold text-stone-700">{cogsMargin}% of sales</Text>
          </View>
        </View>

        <View className="rounded-xl border border-stone-200/90 bg-white p-4 shadow-xs">
          <Text className="text-xs font-bold text-stone-500">Net Estimated Profit</Text>
          <Text className="text-xl sm:text-2xl font-black text-[#810021] mt-1">
            ₱
            {estimatedNetProfit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="mt-2.5 pt-2 border-t border-stone-100 flex-row items-center justify-between">
            <Text className="text-xs text-stone-500">Estimated Net Margin</Text>
            <Text className="text-xs font-bold text-[#810021]">{profitMargin}% net</Text>
          </View>
        </View>
      </View>

      {/* Print Sign-off Trailer */}
      <View className="mt-8 pt-6 border-t border-stone-300 print-only print-avoid-break">
        <View className="report-grid-2col grid grid-cols-2 gap-8">
          <View className="border-t border-stone-400 pt-2">
            <Text className="text-xs font-bold">Manager On Duty Signature</Text>
            <Text className="text-xs text-stone-500 mt-0.5">Monk's Dream Jazz Bar Back-Office</Text>
          </View>
          <View className="border-t border-stone-400 pt-2">
            <Text className="text-xs font-bold">Accounting &amp; Audit Acknowledgment</Text>
            <Text className="text-xs text-stone-500 mt-0.5">Fiscal Ledger Synchronization</Text>
          </View>
        </View>
      </View>
    </>
  );
};
