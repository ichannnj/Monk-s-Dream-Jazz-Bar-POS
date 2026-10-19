import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CustomerTab } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';

interface TableActionTabSelectorProps {
  tabs: CustomerTab[];
  selectedTabIndex: number;
  onSelectTab: (tabIndex: number) => void;
}

export const TableActionTabSelector: React.FC<TableActionTabSelectorProps> = ({
  tabs,
  selectedTabIndex,
  onSelectTab,
}) => {
  if (!tabs || tabs.length === 0) return null;

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = selectedTabIndex === tab.tabIndex;

          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelectTab(tab.tabIndex)}
              className={`min-h-[48px] py-3 px-5 rounded-2xl border flex-row items-center justify-center active:opacity-90 ${
                isActive ? 'bg-wine-800 border-wine-800 shadow-sm' : 'bg-gray-100 border-gray-200'
              }`}
            >
              <Text className={`text-base font-bold ${isActive ? 'text-white' : 'text-gray-800'}`}>
                Tab #{tab.tabIndex}: {tab.guestName} ({formatCurrency(tab.totalAmount)})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
    gap: 10,
  },
});
