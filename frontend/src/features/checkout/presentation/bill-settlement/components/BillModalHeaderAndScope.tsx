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
          <View style={[styles.badge, isTakeout && { backgroundColor: '#15803d' }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
              {isTakeout
                ? `Takeout #${takeoutOrder?.ticketNumber || 'T-001'}`
                : `Table ${table?.code || 'Floor'}`}
            </Text>
          </View>
          <View>
            <Text style={styles.title}>
              {isTakeout
                ? `Takeout Check: ${takeoutOrder?.customerName || 'Walk-in Guest'}`
                : settlementMode === 'entire_table'
                  ? `Table ${table?.code || ''} Entire Bill (${activeTabsCount} Tabs)`
                  : `Guest Tab: ${activeTab?.guestName || 'Table Guest'}`}
            </Text>
            <Text style={styles.subtitle}>
              Review line items, apply privileges &amp; settle tender
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close billing modal"
        >
          <X size={20} color="#4b5563" />
        </Pressable>
      </View>

      {/* Settlement Scope Dropdown if multiple tabs on Dine-In */}
      {!isTakeout && table?.tabs && table.tabs.length > 1 ? (
        <View className="mb-4">
          <PosDropdown
            options={scopeOptions}
            value={settlementMode}
            onChange={setSettlementMode}
            prefixLabel="Settlement Scope:"
            sheetTitle="Select Settlement Scope"
            className="w-full"
          />
        </View>
      ) : null}

      {/* Total Display Card */}
      <View style={[styles.totalDisplayCard, isTakeout && { borderColor: '#16a34a' }]}>
        <View>
          <Text style={styles.totalCardLabel}>TOTAL AMOUNT DUE</Text>
          <Text style={[styles.totalCardAmount, isTakeout && { color: '#15803d' }]}>
            {formatCurrency(grandTotal)}
          </Text>
        </View>
        <Text style={styles.totalCardSub}>
          {isTakeout
            ? 'Takeout Bill • 0% Service Charge'
            : 'VAT-Inclusive • Service Charge applied'}
        </Text>
      </View>
    </>
  );
};
