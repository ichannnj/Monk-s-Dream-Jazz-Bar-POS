import React from 'react';
import { View } from 'react-native';
import { Receipt } from 'lucide-react-native';
import { CustomerTab } from '../../../../types/floor';
import { formatCurrency } from '@monks/shared';
import { PosDropdown, PosDropdownOption } from '@/features/shared';

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

  const tabOptions: PosDropdownOption<string>[] = tabs.map((tab) => ({
    value: String(tab.tabIndex),
    label: `Tab #${tab.tabIndex}: ${tab.guestName}`,
    badge: formatCurrency(tab.totalAmount),
    icon: Receipt,
  }));

  return (
    <View className="mb-3">
      <PosDropdown
        options={tabOptions}
        value={String(selectedTabIndex)}
        onChange={(val) => onSelectTab(Number(val))}
        sheetTitle="Select Guest Tab"
        className="w-full"
      />
    </View>
  );
};
