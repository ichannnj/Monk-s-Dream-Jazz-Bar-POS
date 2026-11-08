import React from 'react';
import { View, Text } from 'react-native';
import { Coffee, Wine, ShoppingBag, Bike, Sparkles, PieChart, Percent } from 'lucide-react-native';
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
        label: 'Cafe Area',
        subtext: 'Espresso & Handcrafted Beverages',
        icon: <Coffee size={20} color="#b45309" />,
        badgeBg: 'bg-amber-100/80',
        badgeBorder: 'border-amber-200',
        progressBg: 'bg-amber-600',
        textColor: 'text-amber-900',
      };
    }
    if (normalized.includes('bar')) {
      return {
        label: 'Bar Area',
        subtext: 'Cocktails, Craft Beer & Fine Spirits',
        icon: <Wine size={20} color="#800020" />,
        badgeBg: 'bg-rose-100/80',
        badgeBorder: 'border-rose-200',
        progressBg: 'bg-[#800020]',
        textColor: 'text-rose-950',
      };
    }
    if (normalized.includes('grab')) {
      return {
        label: 'GrabFood Delivery',
        subtext: 'Online Marketplace Dispatch',
        icon: <Bike size={20} color="#047857" />,
        badgeBg: 'bg-emerald-100/80',
        badgeBorder: 'border-emerald-200',
        progressBg: 'bg-emerald-600',
        textColor: 'text-emerald-950',
      };
    }
    return {
      label: channelKey.replace(/_/g, ' '),
      subtext: 'Direct Counter & Quick Pickups',
      icon: <ShoppingBag size={20} color="#4338ca" />,
      badgeBg: 'bg-indigo-100/80',
      badgeBorder: 'border-indigo-200',
      progressBg: 'bg-indigo-600',
      textColor: 'text-indigo-950',
    };
  };

  return (
    <>
      {/* Visual Analytics Suite: Hourly Pacing & Payment Tender Mix (Screen only, omitted from 1-page executive print) */}
      <View className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print-hidden">
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
      <View className="rounded-2xl border border-stone-200/90 bg-white p-5 sm:p-7 shadow-xs mb-6 print-avoid-break">
        <View className="flex-row items-center justify-between pb-4 mb-4 border-b border-stone-100 flex-wrap gap-2">
          <View>
            <View className="flex-row items-center gap-2">
              <PieChart size={20} color="#800020" />
              <Text className="text-xl font-bold text-stone-900">
                Sales by Channel &amp; Fulfilment Route
              </Text>
            </View>
            <Text className="text-base text-stone-500 mt-1">
              Distribution of volume and monetary yield across operational venues
            </Text>
          </View>

          <View className="bg-stone-100 px-3 py-1.5 rounded-xl">
            <Text className="text-base font-semibold text-stone-700">
              {channelEntries.length} Active Channels
            </Text>
          </View>
        </View>

        {/* Channel List - 2 columns in print, 1 column on mobile/tablet */}
        <View className="report-grid-2col space-y-4 md:space-y-0">
          {channelEntries.map(([channel, data]) => {
            const meta = getChannelMeta(channel);
            const salesValue = Number(data.sales || 0);
            const percentOfTotal = grossSales > 0 ? Math.round((salesValue / grossSales) * 100) : 0;

            return (
              <View
                key={channel}
                className="p-3 sm:p-4 rounded-xl border border-stone-100 bg-[#fbfaf8] hover:border-stone-200 transition-colors justify-between"
              >
                <View className="flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {/* Left: Icon, Name, and Meta */}
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl items-center justify-center border ${meta.badgeBg} ${meta.badgeBorder}`}
                    >
                      {meta.icon}
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-base sm:text-lg font-bold text-stone-900">
                          {meta.label}
                        </Text>
                        <View className="bg-stone-200/80 px-1.5 py-0.5 rounded-md">
                          <Text className="text-xs sm:text-base font-semibold text-stone-700">
                            {data.count} {data.count === 1 ? 'order' : 'orders'}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs sm:text-base text-stone-500">{meta.subtext}</Text>
                    </View>
                  </View>

                  {/* Right: Sales and Percentage */}
                  <View className="flex-row items-baseline sm:flex-col sm:items-end justify-between sm:justify-center">
                    <Text className="text-base sm:text-xl font-black text-stone-900 tracking-tight">
                      ₱
                      {salesValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                    <Text className="text-xs sm:text-base font-bold text-stone-500">
                      {percentOfTotal}% of sales
                    </Text>
                  </View>
                </View>

                {/* Progress Bar Container */}
                <View className="mt-2.5 w-full bg-stone-200/70 h-2 rounded-full overflow-hidden">
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
      <View className="grid grid-cols-1 md:grid-cols-3 gap-5 print-avoid-break">
        <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <Text className="text-base font-semibold text-stone-500">Gross Sales Revenue</Text>
          <Text className="text-2xl font-black text-stone-900 mt-1">
            ₱
            {grossSales.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
            <Text className="text-base text-stone-500">Settled Transactions</Text>
            <Text className="text-base font-bold text-emerald-600">{orderCount} tabs</Text>
          </View>
        </View>

        <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <Text className="text-base font-semibold text-stone-500">Cost of Goods Sold (COGS)</Text>
          <Text className="text-2xl font-black text-stone-900 mt-1">
            ₱
            {totalCogs.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
            <Text className="text-base text-stone-500">Ingredients baseline</Text>
            <Text className="text-base font-bold text-stone-700">{cogsMargin}% of sales</Text>
          </View>
        </View>

        <View className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs">
          <Text className="text-base font-semibold text-stone-500">Net Estimated Profit</Text>
          <Text className="text-2xl font-black text-[#800020] mt-1">
            ₱
            {estimatedNetProfit.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className="mt-3 pt-3 border-t border-stone-100 flex-row items-center justify-between">
            <Text className="text-base text-stone-500">Estimated Net Margin</Text>
            <Text className="text-base font-bold text-[#800020]">{profitMargin}% net</Text>
          </View>
        </View>
      </View>

      {/* Print Sign-off Trailer */}
      <View className="mt-8 pt-6 border-t-2 border-stone-300 print-only print-avoid-break">
        <View className="report-grid-2col grid grid-cols-2 gap-8">
          <View className="border-t border-stone-400 pt-2">
            <Text className="text-sm font-bold">Manager On Duty Signature</Text>
            <Text className="text-xs text-stone-500 mt-1">Monk's Dream Jazz Bar Back-Office</Text>
          </View>
          <View className="border-t border-stone-400 pt-2">
            <Text className="text-sm font-bold">Accounting &amp; Audit Acknowledgment</Text>
            <Text className="text-xs text-stone-500 mt-1">Fiscal Ledger Synchronization</Text>
          </View>
        </View>
      </View>
    </>
  );
};
