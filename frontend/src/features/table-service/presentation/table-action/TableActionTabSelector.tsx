import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Plus } from 'lucide-react-native';
import { CustomerTab } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { deriveTabStatus, TAB_STATUS_DOT_COLORS } from '@/features/floor/domain/tableTabHelpers';

interface TableActionTabSelectorProps {
  tabs: CustomerTab[];
  selectedTabIndex: number;
  onSelectTab: (tabIndex: number) => void;
  onAddSplitTab?: () => void;
}

export const TableActionTabSelector: React.FC<TableActionTabSelectorProps> = ({
  tabs,
  selectedTabIndex,
  onSelectTab,
  onAddSplitTab,
}) => {
  if (!tabs || tabs.length === 0) return null;

  return (
    <View className="mb-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {tabs.map((tab) => {
          const isSelected = tab.tabIndex === selectedTabIndex;
          const tabStatus = deriveTabStatus(tab);
          const dotColor = TAB_STATUS_DOT_COLORS[tabStatus];

          return (
            <Pressable
              key={tab.id || tab.tabIndex}
              onPress={() => onSelectTab(tab.tabIndex)}
              className={`flex-row items-center gap-2 px-3.5 py-2.5 rounded-2xl border min-h-[48px] ${
                isSelected
                  ? 'bg-[#810021] border-[#810021]'
                  : 'bg-[#FAF8F5] border-stone-200 active:bg-stone-100'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`Tab ${tab.tabIndex}: ${tab.guestName}, ${formatCurrency(tab.totalAmount)}`}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isSelected ? '#F5F5F5' : dotColor,
                }}
              />
              <Text
                className={`text-sm font-extrabold ${isSelected ? 'text-white' : 'text-stone-900'}`}
                numberOfLines={1}
              >
                {tab.guestName}
              </Text>
              <Text
                className={`text-xs font-bold ${isSelected ? 'text-white/85' : 'text-stone-500'}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatCurrency(tab.totalAmount)}
              </Text>
            </Pressable>
          );
        })}

        {onAddSplitTab ? (
          <Pressable
            onPress={onAddSplitTab}
            className="flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-dashed border-stone-300 bg-white active:bg-stone-50 min-h-[48px]"
            accessibilityRole="button"
            accessibilityLabel="Add new split tab"
          >
            <Plus size={15} color="#810021" strokeWidth={2.5} />
            <Text className="text-sm font-extrabold text-[#810021]">Split</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
};
