import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Platform, ActivityIndicator } from 'react-native';
import {
  TrendingUp,
  Crown,
  Calendar,
  Flame,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Coffee,
  Wine,
  Layers,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { toast } from '@/features/shared/toast/useToastStore';
import { printHtmlElement } from '@/features/shared/utils/printHelpers';
import { trendsApi } from '../../../data/trends.api';
import type { SalesTrendsReport } from '../../../domain/trends.types';
import { exportTrendsReportToExcel } from '../../../utils/readingExcelExport';
import { DayOfWeekTrendChart } from './DayOfWeekTrendChart';
import { MultiGranularitySalesChart } from './MultiGranularitySalesChart';
import { BestSellersRankingTable } from './BestSellersRankingTable';

interface AdminTrendsReportViewProps {
  startDate?: string;
  endDate?: string;
  station?: string;
  mode?: 'ALL' | 'CAFE' | 'EVENT';
  timeframeLabel?: string;
  onRefreshParent?: () => void;
}

export const AdminTrendsReportView: React.FC<AdminTrendsReportViewProps> = ({
  startDate,
  endDate,
  station = 'ALL',
  mode = 'ALL',
  timeframeLabel = 'Selected Period',
  onRefreshParent,
}) => {
  const [trends, setTrends] = useState<SalesTrendsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTrends = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const report = await trendsApi.getSalesTrendsReport({
          startDate,
          endDate,
          station,
          filterMode: mode,
        });
        setTrends(report);
      } catch (err) {
        console.error('[AdminTrendsReportView] Error loading trends report:', err);
        toast.error('Failed to load sales trends report', { title: 'Analytics Error' });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [startDate, endDate, station, mode]
  );

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const handleManualRefresh = () => {
    fetchTrends(true);
    onRefreshParent?.();
  };

  const handlePrintReport = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const title = `Sales & Product Trends Report (${timeframeLabel}) - Monk's Dream POS`;
      printHtmlElement('monks-trends-report-printable', {
        title,
        pageSize: 'A4',
      });
    } else {
      toast.info('Printing is supported on desktop web browser.');
    }
  };

  const handleExportExcel = () => {
    if (!trends) return;
    try {
      const scopeLabel = `${timeframeLabel} · ${
        station === 'ALL' ? 'All Stations' : station
      } · ${mode === 'ALL' ? 'Consolidated' : mode === 'CAFE' ? 'Cafe Mode' : 'Event Mode'}`;
      exportTrendsReportToExcel(trends, scopeLabel);
      toast.success('Sales & Product Trends exported to Excel (.xls)', {
        title: 'Excel Ready',
      });
    } catch (err) {
      console.error('[AdminTrendsReportView] Excel export error:', err);
      toast.error('Failed to export trends report', { title: 'Export Error' });
    }
  };

  if (isLoading && !trends) {
    return (
      <View className="flex-1 items-center justify-center p-12">
        <ActivityIndicator size="large" color="#800020" />
        <Text className="mt-4 text-base font-bold text-stone-700">
          Analyzing sales trends &amp; product demand...
        </Text>
        <Text className="text-sm text-stone-400 mt-1">
          Aggregating day-of-week velocity and best seller rankings
        </Text>
      </View>
    );
  }

  const effectiveTrends: SalesTrendsReport = trends || {
    timeframeLabel,
    totalGrossSales: 0,
    totalOrders: 0,
    averageTicket: 0,
    bestDayOfWeek: null,
    bestDate: null,
    bestWeek: null,
    bestMonth: null,
    topSellingProduct: null,
    dayOfWeekTrends: [],
    dailyTimeline: [],
    weeklyTimeline: [],
    monthlyTimeline: [],
    bestSellers: [],
    availableCategories: ['All Categories'],
  };

  return (
    <ScrollView className="flex-1 p-4 sm:p-6 lg:p-8" showsVerticalScrollIndicator={false}>
      {/* Printable Container */}
      <View {...({ id: 'monks-trends-report-printable' } as any)} className="flex-1">
        {/* Header Toolbar (print-hidden) */}
        <View className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs mb-6 print-hidden">
          <View className="flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Title & Subtitle */}
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-2.5">
                <View className="w-9 h-9 rounded-xl bg-[#800020]/10 border border-[#800020]/20 items-center justify-center">
                  <TrendingUp size={18} color="#800020" />
                </View>
                <Text className="text-xl font-black text-stone-900 tracking-tight">
                  Sales &amp; Product Trends Analytics
                </Text>
              </View>
              <Text className="text-sm text-stone-500 font-medium mt-1">
                Day-of-week velocity, daily/weekly revenue peaks, and menu best sellers (
                {timeframeLabel})
              </Text>
            </View>

            {/* Right: Refresh, Export, Print Action Buttons */}
            <View className="flex-row items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100 flex-wrap">
              <Pressable
                onPress={handleManualRefresh}
                className="w-11 h-11 rounded-xl bg-white border border-stone-300 items-center justify-center active:bg-stone-100 shadow-xs cursor-pointer"
                accessibilityLabel="Refresh trends data"
              >
                <RefreshCw
                  size={18}
                  color="#57534e"
                  className={isRefreshing ? 'animate-spin' : ''}
                />
              </Pressable>

              <Pressable
                onPress={handleExportExcel}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-300 active:bg-emerald-100 flex-row items-center gap-2 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet size={17} color="#047857" />
                <Text className="text-sm font-bold text-emerald-800">Export Excel</Text>
              </Pressable>

              <Pressable
                onPress={handlePrintReport}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-stone-900 active:bg-stone-800 flex-row items-center justify-center shadow-xs cursor-pointer"
              >
                <Printer size={17} color="#ffffff" />
                <Text className="ml-2 text-sm font-bold text-white">Print Report</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Print-Only Executive Header */}
        <View className="mb-4 pb-3 border-b-2 border-stone-900 print-only">
          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-xs font-bold tracking-widest text-[#800020] uppercase">
                Monk's Dream Jazz Bar &amp; Bistro
              </Text>
              <Text className="text-2xl font-black text-stone-900 mt-0.5">
                Sales &amp; Product Demand Trends Report
              </Text>
              <Text className="text-xs font-medium text-stone-600 mt-1">
                Scope: {station === 'ALL' ? 'All Operational Stations' : station} · Timeframe:{' '}
                {timeframeLabel} · Filter:{' '}
                {mode === 'ALL' ? 'Consolidated' : mode === 'CAFE' ? 'Cafe Mode' : 'Event Mode'}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-xs text-stone-500">
                Generated: {new Date().toLocaleDateString()}{' '}
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text className="text-xs font-bold text-stone-800 mt-0.5">
                Total Revenue: {formatCurrency(effectiveTrends.totalGrossSales)} (
                {effectiveTrends.totalOrders} checks)
              </Text>
            </View>
          </View>
        </View>

        {/* Executive KPI Trend Highlights Grid */}
        <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Best Day of the Week */}
          <View className="rounded-2xl border border-amber-200/90 bg-amber-50/40 p-4 sm:p-5 shadow-xs justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                  Best Day of Week
                </Text>
                <View className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 items-center justify-center">
                  <Crown size={16} color="#b45309" />
                </View>
              </View>
              <Text className="text-2xl font-black text-amber-950">
                {effectiveTrends.bestDayOfWeek ? effectiveTrends.bestDayOfWeek.dayName : 'N/A'}
              </Text>
              <Text className="text-lg font-black text-[#800020] mt-1">
                {effectiveTrends.bestDayOfWeek
                  ? formatCurrency(effectiveTrends.bestDayOfWeek.totalSales)
                  : '₱0.00'}
              </Text>
            </View>
            <View className="mt-3 pt-2.5 border-t border-amber-200/80 flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-amber-800">
                {effectiveTrends.bestDayOfWeek
                  ? `${effectiveTrends.bestDayOfWeek.percentage}% of weekly sales`
                  : 'No sales'}
              </Text>
              <Text className="text-xs text-amber-700">
                {effectiveTrends.bestDayOfWeek?.orderCount || 0} checks
              </Text>
            </View>
          </View>

          {/* Card 2: Best Selling Date (Peak Day) */}
          <View className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold tracking-wider text-stone-500 uppercase">
                  Best-Selling Date
                </Text>
                <View className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 items-center justify-center">
                  <Calendar size={16} color="#7c3aed" />
                </View>
              </View>
              <Text className="text-xl font-black text-stone-900" numberOfLines={1}>
                {effectiveTrends.bestDate ? effectiveTrends.bestDate.formattedDate : 'N/A'}
              </Text>
              <Text className="text-lg font-black text-stone-900 mt-1">
                {effectiveTrends.bestDate
                  ? formatCurrency(effectiveTrends.bestDate.sales)
                  : '₱0.00'}
              </Text>
            </View>
            <View className="mt-3 pt-2.5 border-t border-stone-100 flex-row items-center justify-between">
              <Text className="text-xs text-stone-500">Highest daily revenue</Text>
              <Text className="text-xs font-bold text-stone-700">
                {effectiveTrends.bestDate?.orderCount || 0} orders
              </Text>
            </View>
          </View>

          {/* Card 3: Best Selling Week */}
          <View className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold tracking-wider text-stone-500 uppercase">
                  Best-Selling Week
                </Text>
                <View className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 items-center justify-center">
                  <TrendingUp size={16} color="#2563eb" />
                </View>
              </View>
              <Text className="text-lg font-black text-stone-900" numberOfLines={1}>
                {effectiveTrends.bestWeek ? effectiveTrends.bestWeek.weekLabel : 'N/A'}
              </Text>
              <Text className="text-lg font-black text-stone-900 mt-1">
                {effectiveTrends.bestWeek
                  ? formatCurrency(effectiveTrends.bestWeek.sales)
                  : '₱0.00'}
              </Text>
            </View>
            <View className="mt-3 pt-2.5 border-t border-stone-100 flex-row items-center justify-between">
              <Text className="text-xs text-stone-500">Highest earning week</Text>
              <Text className="text-xs font-bold text-stone-700">
                {effectiveTrends.bestWeek?.orderCount || 0} checks
              </Text>
            </View>
          </View>

          {/* Card 4: Top Earning Menu Item */}
          <View className="rounded-2xl border border-rose-200/90 bg-rose-50/30 p-4 sm:p-5 shadow-xs justify-between">
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold tracking-wider text-rose-900 uppercase">
                  #1 Best Seller Item
                </Text>
                <View className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-300 items-center justify-center">
                  <Flame size={16} color="#e11d48" />
                </View>
              </View>
              <Text className="text-lg font-black text-stone-900" numberOfLines={1}>
                {effectiveTrends.topSellingProduct ? effectiveTrends.topSellingProduct.name : 'N/A'}
              </Text>
              <Text className="text-lg font-black text-[#800020] mt-1">
                {effectiveTrends.topSellingProduct
                  ? formatCurrency(effectiveTrends.topSellingProduct.salesAmount)
                  : '₱0.00'}
              </Text>
            </View>
            <View className="mt-3 pt-2.5 border-t border-rose-200/80 flex-row items-center justify-between">
              <Text className="text-xs font-semibold text-rose-800">
                {effectiveTrends.topSellingProduct
                  ? `${effectiveTrends.topSellingProduct.soldCount} units sold`
                  : '0 units'}
              </Text>
              <Text className="text-xs font-bold text-rose-900">
                {effectiveTrends.topSellingProduct
                  ? `${effectiveTrends.topSellingProduct.revenueSharePercent}% share`
                  : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Visual Charts Grid: Day-of-Week + Timeline Analytics */}
        <View className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print-avoid-break">
          {/* 1. Day of Week Chart */}
          <DayOfWeekTrendChart
            data={effectiveTrends.dayOfWeekTrends}
            bestDayName={effectiveTrends.bestDayOfWeek?.dayName}
            totalSales={effectiveTrends.totalGrossSales}
          />

          {/* 2. Multi-Granularity Timeline Chart */}
          <MultiGranularitySalesChart
            dailyData={effectiveTrends.dailyTimeline}
            weeklyData={effectiveTrends.weeklyTimeline}
            monthlyData={effectiveTrends.monthlyTimeline}
            bestDate={effectiveTrends.bestDate}
            bestWeek={effectiveTrends.bestWeek}
            bestMonth={effectiveTrends.bestMonth}
          />
        </View>

        {/* Best Sellers Ranked Register Table */}
        <View className="mb-6 print-avoid-break">
          <BestSellersRankingTable
            items={effectiveTrends.bestSellers}
            availableCategories={effectiveTrends.availableCategories}
            totalGrossSales={effectiveTrends.totalGrossSales}
          />
        </View>

        {/* Print-Only Signature & Management Audit Block */}
        <View className="mt-8 pt-4 border-t-2 border-stone-900 print-only">
          <Text className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-6">
            Executive Verification &amp; Auditor Sign-Off
          </Text>
          <View className="flex-row justify-between items-end gap-8">
            <View className="flex-1 border-t border-stone-400 pt-2">
              <Text className="text-xs font-bold text-stone-900">
                Prepared By (Duty Cashier / Staff):
              </Text>
              <Text className="text-[11px] text-stone-500 mt-0.5">
                Signature &amp; Printed Name
              </Text>
            </View>
            <View className="flex-1 border-t border-stone-400 pt-2">
              <Text className="text-xs font-bold text-stone-900">Reviewed By (Duty Manager):</Text>
              <Text className="text-[11px] text-stone-500 mt-0.5">
                Manager Signature &amp; Date
              </Text>
            </View>
            <View className="flex-1 border-t border-stone-400 pt-2">
              <Text className="text-xs font-bold text-stone-900">
                Approved By (General Manager / Owner):
              </Text>
              <Text className="text-[11px] text-stone-500 mt-0.5">
                Executive Signature &amp; Stamp
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
