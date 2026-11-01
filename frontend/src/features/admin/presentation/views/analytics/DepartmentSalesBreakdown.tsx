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
        return <Coffee size={18} color="#92400e" />;
      case 'cocktails':
        return <GlassWater size={18} color="#800020" />;
      case 'wine_beer':
        return <Wine size={18} color="#9333ea" />;
      case 'kitchen':
        return <Utensils size={18} color="#059669" />;
      default:
        return <BarChart2 size={18} color="#57534e" />;
    }
  };

  const getColors = (cat: DepartmentShare['category']) => {
    switch (cat) {
      case 'coffee':
        return { bar: 'bg-amber-700', text: 'text-amber-800', bg: 'bg-amber-50' };
      case 'cocktails':
        return { bar: 'bg-[#800020]', text: 'text-[#800020]', bg: 'bg-rose-50' };
      case 'wine_beer':
        return { bar: 'bg-purple-700', text: 'text-purple-800', bg: 'bg-purple-50' };
      case 'kitchen':
        return { bar: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-50' };
      default:
        return { bar: 'bg-stone-700', text: 'text-stone-800', bg: 'bg-stone-50' };
    }
  };

  return (
    <View className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-xs">
      <View className="flex-row items-center justify-between mb-5">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-[#800020]/10 items-center justify-center">
            <BarChart2 size={20} color="#800020" />
          </View>
          <View>
            <Text className="text-lg font-extrabold text-stone-900">
              Department & Category Revenue Mix
            </Text>
            <Text className="text-base text-stone-500 font-medium">
              Sales contribution across beverage stations and kitchen dining
            </Text>
          </View>
        </View>

        <Text className="text-base font-bold text-stone-600">
          {departments.length} Operational Departments
        </Text>
      </View>

      <View className="space-y-4">
        {departments.map((dept) => {
          const pct = calculatedTotal > 0 ? (dept.sales / calculatedTotal) * 100 : 0;
          const styling = getColors(dept.category);

          return (
            <View
              key={dept.name}
              className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/50"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View className={`w-8 h-8 rounded-lg ${styling.bg} items-center justify-center`}>
                    {getIcon(dept.category)}
                  </View>
                  <View>
                    <Text className="text-base font-bold text-stone-800">{dept.name}</Text>
                    <Text className="text-sm text-stone-500">{dept.itemCount} items sold</Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-base font-black text-stone-900">
                    {formatCurrency(dept.sales)}
                  </Text>
                  <Text className={`text-sm font-extrabold ${styling.text}`}>
                    {pct.toFixed(1)}% of revenue
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View className="h-2 w-full bg-stone-200/80 rounded-full overflow-hidden">
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
