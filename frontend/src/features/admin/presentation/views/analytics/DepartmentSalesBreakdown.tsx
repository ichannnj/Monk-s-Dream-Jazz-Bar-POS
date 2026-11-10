import React from 'react';
import { View, Text } from 'react-native';
import { Coffee, Wine, Utensils, GlassWater, BarChart2 } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';

export interface DepartmentShare {
  name: string;
  category: 'coffee' | 'cocktails' | 'wine_beer' | 'kitchen';
  sales: number;
  itemCount: number;
}

interface DepartmentSalesBreakdownProps {
  departments: DepartmentShare[];
  totalSales?: number;
}

export const DepartmentSalesBreakdown: React.FC<DepartmentSalesBreakdownProps> = ({
  departments,
  totalSales,
}) => {
  const calculatedTotal = totalSales || departments.reduce((acc, d) => acc + d.sales, 0);

  const getIcon = (cat: DepartmentShare['category']) => {
    switch (cat) {
      case 'coffee':
        return <Coffee size={16} color="#1c1917" />;
      case 'cocktails':
        return <GlassWater size={16} color="#800020" />;
      case 'wine_beer':
        return <Wine size={16} color="#800020" />;
      case 'kitchen':
        return <Utensils size={16} color="#78716c" />;
      default:
        return <BarChart2 size={16} color="#78716c" />;
    }
  };

  const getColors = (cat: DepartmentShare['category']) => {
    switch (cat) {
      case 'cocktails':
      case 'wine_beer':
        return { bar: 'bg-[#800020]', text: 'text-[#800020]', bg: 'bg-[#FAF8F5]' };
      default:
        return { bar: 'bg-stone-800', text: 'text-stone-700', bg: 'bg-[#FAF8F5]' };
    }
  };

  return (
    <View className="flex-1 min-w-0 rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-6 shadow-xs overflow-hidden">
      {/* Header (Minimal, No Subtitles) */}
      <View className="flex-row items-center justify-between mb-4 flex-wrap gap-3">
        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-stone-200 items-center justify-center shrink-0">
            <BarChart2 size={16} color="#800020" />
          </View>
          <Text className="text-lg font-bold text-stone-900">Department Mix</Text>
        </View>

        <View className="rounded-xl bg-[#FAF8F5] border border-stone-200 px-3 py-1 shrink-0">
          <Text className="text-xs text-stone-500 font-medium">Active</Text>
          <Text className="text-sm font-black text-stone-900">{departments.length}</Text>
        </View>
      </View>

      <View className="space-y-3">
        {departments.map((dept) => {
          const pct = calculatedTotal > 0 ? (dept.sales / calculatedTotal) * 100 : 0;
          const styling = getColors(dept.category);

          return (
            <View
              key={dept.name}
              className="p-3 rounded-xl border border-stone-200/80 bg-[#FAF8F5]"
            >
              <View className="flex-row items-center justify-between mb-2 flex-wrap gap-2">
                <View className="flex-row items-center gap-2 flex-1 min-w-[120px]">
                  <View
                    className={`w-7 h-7 rounded-md ${styling.bg} border border-stone-200 items-center justify-center shrink-0`}
                  >
                    {getIcon(dept.category)}
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-bold text-stone-900">{dept.name}</Text>
                    <Text className="text-xs text-stone-500">
                      {dept.itemCount} item{dept.itemCount === 1 ? '' : 's'}
                    </Text>
                  </View>
                </View>

                <View className="items-end shrink-0">
                  <Text className="text-sm font-black text-stone-900">
                    {formatCurrency(dept.sales)}
                  </Text>
                  <Text className={`text-xs font-bold ${styling.text}`}>{pct.toFixed(1)}%</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="h-1.5 w-full bg-stone-200/80 rounded-full overflow-hidden">
                <View
                  style={{ width: `${pct}%` }}
                  className={`h-full ${styling.bar} rounded-full`}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};
