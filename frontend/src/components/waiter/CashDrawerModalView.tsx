import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import {
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  Vault,
  Calculator,
  CheckCircle2,
  Clock,
  Plus,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useOrderStore } from '../../store/useOrderStore';
import { DrawerEntry } from '../../mockData';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../store/useToastStore';

export const CashDrawerModalView: React.FC = () => {
  const { drawerEntries, addDrawerEntry } = useOrderStore();

  // Dialog State
  const [activeModal, setActiveModal] = useState<
    'none' | 'cash_in' | 'cash_out' | 'drop' | 'audit'
  >('none');
  const [modalAmount, setModalAmount] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [auditDone, setAuditDone] = useState(false);

  // Compute live drawer balance
  const metrics = useMemo(() => {
    let startingFloat = 200.0;
    let cashSales = 0;
    let cashIn = 0;
    let cashOut = 0;
    let cashDrops = 0;

    drawerEntries.forEach((entry) => {
      if (entry.type === 'float') startingFloat = entry.amount;
      else if (entry.type === 'sale') cashSales += entry.amount;
      else if (entry.type === 'cash_in') cashIn += entry.amount;
      else if (entry.type === 'cash_out') cashOut += Math.abs(entry.amount);
      else if (entry.type === 'drop') cashDrops += Math.abs(entry.amount);
    });

    const expectedBalance = startingFloat + cashSales + cashIn - cashOut - cashDrops;

    return {
      startingFloat,
      cashSales,
      cashIn,
      cashOut,
      cashDrops,
      expectedBalance,
    };
  }, [drawerEntries]);

  const handleConfirmAction = () => {
    const amt = parseFloat(modalAmount) || 0;
    if (amt <= 0) {
      toast.warning(`Please enter a valid cash amount greater than ${formatCurrency(0)}`, {
        title: 'Invalid Amount',
      });
      return;
    }

    if (activeModal === 'cash_in') {
      const reason = modalReason.trim() || 'Change restock';
      addDrawerEntry('cash_in', amt, reason, 'Coltrane (Cashier)');
      toast.success(`Cash In: ${formatCurrency(amt)} added to drawer (${reason})`, {
        title: 'Cash In Recorded',
      });
    } else if (activeModal === 'cash_out') {
      const reason = modalReason.trim() || 'Petty cash expense';
      addDrawerEntry('cash_out', -amt, reason, 'Coltrane (Cashier)');
      toast.warning(`Petty Cash Out: ${formatCurrency(amt)} recorded (${reason})`, {
        title: 'Paid Out Recorded',
      });
    } else if (activeModal === 'drop') {
      const reason = modalReason.trim() || 'Mid-shift safe cash drop';
      addDrawerEntry('drop', -amt, reason, 'Coltrane (Cashier)');
      toast.info(`Safe Drop: ${formatCurrency(amt)} transferred to floor safe`, {
        title: 'Safe Drop Confirmed',
      });
    }

    setModalAmount('');
    setModalReason('');
    setActiveModal('none');
  };

  const numericCounted = parseFloat(countedCash) || 0;
  const variance = numericCounted - metrics.expectedBalance;

  return (
    <View style={styles.container}>
      {/* Top Header Card */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Coins size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.title}>Cash Drawer Management & Audit</Text>
            <Text style={styles.subtitle}>
              Monitor opening float, paid-outs, safe drops, and shift reconciliation
            </Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionBtnsGroup}>
          <Pressable
            onPress={() => setActiveModal('cash_in')}
            style={[styles.quickBtn, styles.btnGreen]}
          >
            <ArrowDownCircle size={15} color="#ffffff" />
            <Text style={styles.quickBtnText}>Cash In</Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveModal('cash_out')}
            style={[styles.quickBtn, styles.btnOrange]}
          >
            <ArrowUpCircle size={15} color="#ffffff" />
            <Text style={styles.quickBtnText}>Petty Cash Out</Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveModal('drop')}
            style={[styles.quickBtn, styles.btnWine]}
          >
            <Vault size={15} color="#ffffff" />
            <Text style={styles.quickBtnText}>Safe Drop</Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveModal('audit')}
            style={[styles.quickBtn, styles.btnSlate]}
          >
            <Calculator size={15} color="#ffffff" />
            <Text style={styles.quickBtnText}>End Shift Audit</Text>
          </Pressable>
        </View>
      </View>

      {/* KPI Cards Row */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, styles.kpiHighlight]}>
          <Text style={styles.kpiLabelHighlight}>Expected in Drawer</Text>
          <Text style={styles.kpiAmountHighlight}>{formatCurrency(metrics.expectedBalance)}</Text>
          <Text style={styles.kpiSubHighlight}>Calculated physical cash balance</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Starting Float</Text>
          <Text style={styles.kpiAmount}>{formatCurrency(metrics.startingFloat)}</Text>
          <Text style={styles.kpiSub}>Opening bank</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Cash Sales</Text>
          <Text style={[styles.kpiAmount, { color: '#15803d' }]}>
            +{formatCurrency(metrics.cashSales)}
          </Text>
          <Text style={styles.kpiSub}>Total cash collected</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Cash Out / Drops</Text>
          <Text style={[styles.kpiAmount, { color: '#dc2626' }]}>
            -{formatCurrency(metrics.cashOut + metrics.cashDrops)}
          </Text>
          <Text style={styles.kpiSub}>Petty expenses + Safe</Text>
        </View>
      </View>

      {/* Transaction Ledger Card */}
      <View style={styles.ledgerCard}>
        <Text style={styles.ledgerTitle}>Shift Cash Ledger & Movement Log</Text>

        <ScrollView
          style={styles.ledgerScroll}
          contentContainerStyle={styles.ledgerScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {drawerEntries.map((entry) => {
            const isPositive = entry.amount >= 0;

            return (
              <View key={entry.id} style={styles.ledgerRow}>
                <View style={styles.ledgerRowLeft}>
                  <View
                    style={[
                      styles.typeBadge,
                      entry.type === 'sale'
                        ? styles.badgeSale
                        : entry.type === 'float'
                          ? styles.badgeFloat
                          : entry.type === 'cash_in'
                            ? styles.badgeIn
                            : styles.badgeOut,
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {entry.type.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>

                  <View>
                    <Text style={styles.reasonText}>{entry.reason}</Text>
                    <Text style={styles.metaText}>
                      {entry.performedBy} • {entry.timestamp}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.amountText,
                    isPositive ? styles.amountPositive : styles.amountNegative,
                  ]}
                >
                  {isPositive ? '+' : '-'}
                  {formatCurrency(Math.abs(entry.amount))}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <Modal
        visible={activeModal === 'cash_in' || activeModal === 'cash_out' || activeModal === 'drop'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setActiveModal('none')}
            accessibilityLabel="Close modal"
          />
          <View style={styles.actionModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'cash_in'
                  ? 'Add Cash In (Restock Change)'
                  : activeModal === 'cash_out'
                    ? 'Log Petty Cash Out (Paid-Out)'
                    : 'Log Safe Cash Drop'}
              </Text>
              <Pressable onPress={() => setActiveModal('none')} style={styles.closeBtn}>
                <X size={18} color="#6b7280" />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Amount (₱):</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={modalAmount}
                onChangeText={setModalAmount}
                autoFocus
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Reason / Expense Description:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ice bag from convenience store, ₱100 change restock..."
                placeholderTextColor="#9ca3af"
                value={modalReason}
                onChangeText={setModalReason}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setActiveModal('none')} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleConfirmAction} style={styles.modalSubmitBtn}>
                <Text style={styles.modalSubmitBtnText}>Record Transaction</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === 'audit'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setActiveModal('none');
          setAuditDone(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setActiveModal('none');
              setAuditDone(false);
            }}
            accessibilityLabel="Close modal"
          />
          <View style={styles.actionModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>End-of-Shift Cash Audit</Text>
              <Pressable
                onPress={() => {
                  setActiveModal('none');
                  setAuditDone(false);
                }}
                style={styles.closeBtn}
              >
                <X size={18} color="#6b7280" />
              </Pressable>
            </View>

            <View style={styles.auditSummaryBox}>
              <Text style={styles.auditSummaryLabel}>Calculated System Cash Expected:</Text>
              <Text style={styles.auditSummaryAmount}>
                {formatCurrency(metrics.expectedBalance)}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Actual Physical Cash Counted in Drawer (₱):</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="Count physical bills & coins..."
                placeholderTextColor="#9ca3af"
                value={countedCash}
                onChangeText={(val) => {
                  setCountedCash(val);
                  setAuditDone(true);
                }}
                autoFocus
              />
            </View>

            {auditDone && countedCash.length > 0 ? (
              <View
                style={[
                  styles.varianceBox,
                  variance === 0
                    ? styles.variancePerfect
                    : variance > 0
                      ? styles.varianceOver
                      : styles.varianceShort,
                ]}
              >
                <Text style={styles.varianceLabel}>
                  {variance === 0
                    ? '✓ PERFECT BALANCE'
                    : variance > 0
                      ? '▲ OVER (SURPLUS)'
                      : '▼ SHORT (DISCREPANCY)'}
                </Text>
                <Text style={styles.varianceAmount}>
                  {variance > 0 ? '+' : ''}
                  {formatCurrency(variance)}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => {
                  setActiveModal('none');
                  setAuditDone(false);
                }}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelBtnText}>Close</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const varianceStr =
                    variance === 0
                      ? `Reconciled (${formatCurrency(0)})`
                      : `${variance > 0 ? '+' : ''}${formatCurrency(variance)} (${variance > 0 ? 'Over' : 'Short'})`;
                  toast.success(
                    `Shift Z-Report printed to thermal station • Counted: ${formatCurrency(numericCounted)} • Variance: ${varianceStr}`,
                    { title: 'Z-Report Dispatched' }
                  );
                  setActiveModal('none');
                  setAuditDone(false);
                }}
                style={styles.modalSubmitBtn}
              >
                <Text style={styles.modalSubmitBtnText}>Print Shift Z-Report</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#d97706',
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
  actionBtnsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnGreen: {
    backgroundColor: '#15803d',
  },
  btnOrange: {
    backgroundColor: '#d97706',
  },
  btnWine: {
    backgroundColor: '#641b2a',
  },
  btnSlate: {
    backgroundColor: '#374151',
  },
  quickBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kpiHighlight: {
    backgroundColor: '#641b2a',
    borderColor: '#641b2a',
  },
  kpiLabelHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fceeed',
    textTransform: 'uppercase',
  },
  kpiAmountHighlight: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 4,
  },
  kpiSubHighlight: {
    fontSize: 11,
    color: '#fad4db',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  kpiAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1e',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#9ca3af',
  },
  ledgerCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ledgerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1e',
    marginBottom: 14,
  },
  ledgerScroll: {
    flex: 1,
  },
  ledgerScrollContent: {
    gap: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  ledgerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeSale: {
    backgroundColor: '#f0fdf4',
  },
  badgeFloat: {
    backgroundColor: '#f3f4f6',
  },
  badgeIn: {
    backgroundColor: '#ecfdf5',
  },
  badgeOut: {
    backgroundColor: '#fef2f2',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },
  reasonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1a1a1e',
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '900',
  },
  amountPositive: {
    color: '#15803d',
  },
  amountNegative: {
    color: '#dc2626',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 30, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  actionModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    width: '100%',
    maxWidth: 480,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#4b5563',
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#641b2a',
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  auditSummaryBox: {
    backgroundColor: '#f9fafb',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  auditSummaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  auditSummaryAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a1e',
    marginTop: 4,
  },
  varianceBox: {
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  variancePerfect: {
    backgroundColor: '#f0fdf4',
  },
  varianceOver: {
    backgroundColor: '#eff6ff',
  },
  varianceShort: {
    backgroundColor: '#fef2f2',
  },
  varianceLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#374151',
  },
  varianceAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
});
