import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  Receipt,
  Search,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Wine,
  ShoppingBag,
  Bike,
} from 'lucide-react-native';
import { useOrderStore } from '../../store/useOrderStore';
import { CheckItem } from '../../mockData';
import { toast } from '../../store/useToastStore';

export const ChecksHistoryView: React.FC = () => {
  const { checks } = useOrderStore();
  const [selectedChannel, setSelectedChannel] = useState<
    'all' | 'dine_in' | 'takeout' | 'online_delivery'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCheck, setSelectedCheck] = useState<CheckItem>(
    checks[0] || null
  );
  const [reprintSuccess, setReprintSuccess] = useState(false);

  const filteredChecks = useMemo(() => {
    return checks.filter((chk) => {
      if (selectedChannel !== 'all' && chk.orderType !== selectedChannel) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        return (
          chk.checkNumber.toLowerCase().includes(query) ||
          chk.guestName.toLowerCase().includes(query) ||
          chk.tableOrRef.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [checks, selectedChannel, searchQuery]);

  const handleReprint = () => {
    setReprintSuccess(true);
    if (selectedCheck) {
      toast.success(
        `Check ${selectedCheck.checkNumber} (${selectedCheck.guestName}) re-sent to thermal printer!`,
        { title: 'Receipt Reprinted' }
      );
    }
    setTimeout(() => setReprintSuccess(false), 2500);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Receipt size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.title}>Shift Checks & Settlement History</Text>
            <Text style={styles.subtitle}>
              Audit closed guest tabs, takeout tickets, and delivery slips
            </Text>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchBox}>
          <Search size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by check #, guest, or table..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setSelectedChannel('all')}
          style={[
            styles.filterPill,
            selectedChannel === 'all' && styles.filterPillActive,
          ]}
        >
          <Text
            style={[
              styles.filterPillText,
              selectedChannel === 'all' && styles.filterPillTextActive,
            ]}
          >
            All Checks ({checks.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelectedChannel('dine_in')}
          style={[
            styles.filterPill,
            selectedChannel === 'dine_in' && styles.filterPillActive,
          ]}
        >
          <Coffee size={13} color={selectedChannel === 'dine_in' ? '#ffffff' : '#4b5563'} />
          <Text
            style={[
              styles.filterPillText,
              selectedChannel === 'dine_in' && styles.filterPillTextActive,
            ]}
          >
            Dine-In
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelectedChannel('takeout')}
          style={[
            styles.filterPill,
            selectedChannel === 'takeout' && styles.filterPillActive,
          ]}
        >
          <ShoppingBag size={13} color={selectedChannel === 'takeout' ? '#ffffff' : '#4b5563'} />
          <Text
            style={[
              styles.filterPillText,
              selectedChannel === 'takeout' && styles.filterPillTextActive,
            ]}
          >
            Takeout
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setSelectedChannel('online_delivery')}
          style={[
            styles.filterPill,
            selectedChannel === 'online_delivery' && styles.filterPillActive,
          ]}
        >
          <Bike size={13} color={selectedChannel === 'online_delivery' ? '#ffffff' : '#4b5563'} />
          <Text
            style={[
              styles.filterPillText,
              selectedChannel === 'online_delivery' && styles.filterPillTextActive,
            ]}
          >
            Online Delivery
          </Text>
        </Pressable>
      </View>

      {/* Split Main View: Left Check List, Right Check Inspector */}
      <View style={styles.splitArea}>
        {/* Left List */}
        <ScrollView
          style={styles.checksList}
          contentContainerStyle={styles.checksListContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredChecks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No checks found matching filter</Text>
            </View>
          ) : (
            filteredChecks.map((chk) => {
              const isSelected = selectedCheck?.id === chk.id;

              return (
                <Pressable
                  key={chk.id}
                  onPress={() => setSelectedCheck(chk)}
                  style={[
                    styles.checkRowCard,
                    isSelected && styles.checkRowCardSelected,
                  ]}
                >
                  <View style={styles.checkRowLeft}>
                    <View style={styles.checkNumBadge}>
                      <Text style={styles.checkNumText}>{chk.checkNumber}</Text>
                    </View>

                    <View>
                      <Text style={styles.checkGuestName}>{chk.guestName}</Text>
                      <Text style={styles.checkRefText}>
                        {chk.tableOrRef} • {chk.timestamp}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.checkRowRight}>
                    <Text style={styles.checkTotal}>${chk.total.toFixed(2)}</Text>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>
                        {chk.paymentMethod.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {/* Right Detail Inspector */}
        {selectedCheck ? (
          <View style={styles.detailPane}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailCheckNumber}>
                  Check {selectedCheck.checkNumber}
                </Text>
                <Text style={styles.detailSub}>
                  {selectedCheck.tableOrRef} · Settled at {selectedCheck.timestamp}
                </Text>
              </View>

              <Pressable onPress={handleReprint} style={styles.reprintBtn}>
                <Printer size={15} color="#ffffff" strokeWidth={2.2} />
                <Text style={styles.reprintBtnText}>Reprint Receipt</Text>
              </Pressable>
            </View>

            {reprintSuccess ? (
              <View style={styles.reprintSuccessBanner}>
                <CheckCircle2 size={15} color="#15803d" />
                <Text style={styles.reprintSuccessText}>
                  Signal sent! ESC/POS print job dispatched to Printer Station PC.
                </Text>
              </View>
            ) : null}

            {/* Check Details Box */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Guest / Customer:</Text>
                <Text style={styles.infoValue}>{selectedCheck.guestName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cashier in Charge:</Text>
                <Text style={styles.infoValue}>{selectedCheck.cashierName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment Captured:</Text>
                <Text style={styles.infoValue}>
                  {selectedCheck.paymentMethod.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Items Summary:</Text>
                <Text style={styles.infoValue}>{selectedCheck.itemsSummary}</Text>
              </View>
            </View>

            {/* Financial Breakdown */}
            <View style={styles.financeCard}>
              <View style={styles.financeLine}>
                <Text style={styles.financeLabel}>Subtotal:</Text>
                <Text style={styles.financeValue}>
                  ${selectedCheck.subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.financeLine}>
                <Text style={styles.financeLabel}>Tax (10% VAT):</Text>
                <Text style={styles.financeValue}>
                  ${selectedCheck.tax.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.financeLine, styles.financeTotalLine]}>
                <Text style={styles.financeTotalLabel}>Grand Total Settled:</Text>
                <Text style={styles.financeTotalValue}>
                  ${selectedCheck.total.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
    flexWrap: 'wrap',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#641b2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    marginTop: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 260,
  },
  searchInput: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterPillActive: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#4b5563',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  splitArea: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  checksList: {
    flex: 1.2,
  },
  checksListContent: {
    gap: 10,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 13,
  },
  checkRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  checkRowCardSelected: {
    borderColor: '#641b2a',
    backgroundColor: '#fffdfd',
  },
  checkRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkNumBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  checkNumText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  checkGuestName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  checkRefText: {
    fontSize: 11.5,
    color: '#6b7280',
    marginTop: 2,
  },
  checkRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  checkTotal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a1e',
  },
  paidBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803d',
  },
  detailPane: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailCheckNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  detailSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  reprintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#641b2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reprintBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  reprintSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  reprintSuccessText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 12.5,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  financeCard: {
    backgroundColor: '#fceeed',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  financeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financeLabel: {
    fontSize: 12.5,
    color: '#832238',
    fontWeight: '500',
  },
  financeValue: {
    fontSize: 13,
    color: '#832238',
    fontWeight: '700',
  },
  financeTotalLine: {
    borderTopWidth: 1,
    borderTopColor: '#fad4db',
    paddingTop: 8,
    marginTop: 4,
  },
  financeTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#641b2a',
  },
  financeTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#641b2a',
  },
});
