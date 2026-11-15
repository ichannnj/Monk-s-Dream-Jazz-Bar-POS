import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { X, Sparkles, Receipt } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { PosDropdown, PosDropdownOption } from '@/features/shared';
import { styles } from '../BillSettlementModal.styles';

interface BillModalHeaderAndScopeProps {
  isTakeout: boolean;
  takeoutOrder?: any;
  table?: any;
  activeTab?: any;
  activeTabsCount: number;
  settlementMode: 'single_tab' | 'entire_table';
  setSettlementMode: (mode: 'single_tab' | 'entire_table') => void;
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
  setSettlementMode,
  grandTotal,
  onClose,
  isShortHeight = false,
}) => {
  const scopeOptions: PosDropdownOption<'single_tab' | 'entire_table'>[] = [
    {
      value: 'single_tab',
      label: `Individual Tab (${activeTab?.guestName || 'Selected Guest'})`,
      icon: Receipt,
    },
    {
      value: 'entire_table',
      label: `Entire Table Group (All ${activeTabsCount} Tabs)`,
      icon: Sparkles,
    },
  ];

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
                : `Table ${table?.code || 'Floor'}`}
            </Text>
          </View>
          <View>
            <Text style={styles.title}>
              {isTakeout
                ? `Takeout: ${takeoutOrder?.customerName || 'Walk-in'}`
                : settlementMode === 'entire_table'
                  ? `Table ${table?.code || ''} (${activeTabsCount} Tabs)`
                  : `Table ${table?.code || ''} · ${activeTab?.guestName || 'Guest'}`}
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

      {/* Settlement Scope Dropdown if multiple tabs on Dine-In */}
      {!isTakeout && table?.tabs && table.tabs.length > 1 ? (
        <View className="mb-3">
          <PosDropdown
            options={scopeOptions}
            value={settlementMode}
            onChange={setSettlementMode}
            prefixLabel="Scope:"
            sheetTitle="Select Scope"
            className="w-full"
          />
        </View>
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
