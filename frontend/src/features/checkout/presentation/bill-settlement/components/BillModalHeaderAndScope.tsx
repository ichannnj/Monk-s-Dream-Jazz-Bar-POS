import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X, Layers } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { CustomerTab, TableItem } from '@/types/floor';
import { formatTableDisplayName } from '@/features/floor/domain/tableTabHelpers';
import { styles } from '../BillSettlementModal.styles';

interface BillModalHeaderAndScopeProps {
  isTakeout: boolean;
  takeoutOrder?: any;
  table?: TableItem | null;
  activeTab?: CustomerTab | null;
  activeTabsCount: number;
  settlementMode: 'single_tab' | 'entire_table';
  onSelectTabScope: (mode: 'single_tab' | 'entire_table', tabIndex?: number) => void;
  grandTotal: number;
  onClose: () => void;
  isShortHeight?: boolean;
}

export const BillModalHeaderAndScope: React.FC<BillModalHeaderAndScopeProps> = ({
  isTakeout,
  takeoutOrder,
  table,
  activeTab,
  activeTabsCount,
  settlementMode,
  onSelectTabScope,
  grandTotal,
  onClose,
  isShortHeight = false,
}) => {
  const openTabs = (table?.tabs || [])
    .filter((t) => t.status === 'open')
    .sort((a, b) => a.tabIndex - b.tabIndex);
  const tableGroupTotal = openTabs.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.badge,
              { width: 'auto', paddingHorizontal: 12, height: 38, borderRadius: 12 },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
              {isTakeout
                ? `Takeout #${takeoutOrder?.ticketNumber || 'T-001'}`
                : table
                  ? formatTableDisplayName(table.code, table.area)
                  : 'Floor'}
            </Text>
          </View>
          <View>
            <Text style={styles.title}>
              {isTakeout
                ? takeoutOrder?.customerName || 'Walk-in'
                : settlementMode === 'entire_table'
                  ? `All ${activeTabsCount} Tabs`
                  : activeTab?.guestName || 'Guest'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close billing modal"
        >
          <X size={20} color="#1c1917" />
        </Pressable>
      </View>

      {/* 1-Tap Tab & Scope Pills if multiple open tabs on Dine-In */}
      {!isTakeout && openTabs.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3 flex-grow-0"
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
        >
          {openTabs.map((tab) => {
            const isSelected =
              settlementMode === 'single_tab' && activeTab?.tabIndex === tab.tabIndex;
            return (
              <Pressable
                key={tab.id || tab.tabIndex}
                onPress={() => onSelectTabScope('single_tab', tab.tabIndex)}
                className={`flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl border min-h-[44px] ${
                  isSelected
                    ? 'bg-[#810021] border-[#810021]'
                    : 'bg-[#FAF8F5] border-stone-200 active:bg-stone-100'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Settle ${tab.guestName} tab for ${formatCurrency(tab.totalAmount)}`}
              >
                <Text
                  className={`text-sm font-extrabold ${
                    isSelected ? 'text-white' : 'text-stone-900'
                  }`}
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

          <Pressable
            onPress={() => onSelectTabScope('entire_table')}
            className={`flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl border min-h-[44px] ${
              settlementMode === 'entire_table'
                ? 'bg-[#810021] border-[#810021]'
                : 'bg-[#FAF8F5] border-stone-200 active:bg-stone-100'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected: settlementMode === 'entire_table' }}
            accessibilityLabel={`Settle all ${openTabs.length} tabs for ${formatCurrency(tableGroupTotal)}`}
          >
            <Layers
              size={14}
              color={settlementMode === 'entire_table' ? '#ffffff' : '#810021'}
              strokeWidth={2.4}
            />
            <Text
              className={`text-sm font-extrabold ${
                settlementMode === 'entire_table' ? 'text-white' : 'text-[#810021]'
              }`}
            >
              All Tabs ({openTabs.length})
            </Text>
            <Text
              className={`text-xs font-bold ${
                settlementMode === 'entire_table' ? 'text-white/85' : 'text-stone-500'
              }`}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCurrency(tableGroupTotal)}
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {/* Total Display Card */}
      {isShortHeight ? (
        <View style={styles.totalDisplayCardCompact}>
          <Text style={styles.totalCardLabelCompact}>Total Due</Text>
          <Text style={styles.totalCardAmountCompact}>{formatCurrency(grandTotal)}</Text>
        </View>
      ) : (
        <View style={styles.totalDisplayCard}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.totalCardLabel}>Total Due</Text>
            <Text style={styles.totalCardAmount}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>
      )}
    </>
  );
};
