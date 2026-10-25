import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Coins, ArrowDownCircle, ArrowUpCircle, Vault, Calculator } from 'lucide-react-native';
import { useOrderStore } from '../../orders/application/useOrderStore';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../shared/toast/useToastStore';
import { CashDrawerMetricsGrid } from './cash-drawer/CashDrawerMetricsGrid';
import { CashDrawerLedger } from './cash-drawer/CashDrawerLedger';
import { CashDrawerActionModal, CashActionType } from './cash-drawer/CashDrawerActionModal';
import { CashDrawerAuditModal } from './cash-drawer/CashDrawerAuditModal';

export const CashDrawerModalView: React.FC = () => {
  const { drawerEntries, addDrawerEntry } = useOrderStore();

  // Dialog State
  const [activeModal, setActiveModal] = useState<
    'none' | 'cash_in' | 'cash_out' | 'drop' | 'audit'
  >('none');
  const [modalAmount, setModalAmount] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [countedCash, setCountedCash] = useState('');

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

  const handlePrintZReport = (numericCounted: number, variance: number) => {
    toast.success(
      `Shift Z-Report printed: Counted ${formatCurrency(numericCounted)} (Variance: ${formatCurrency(variance)})`,
      {
        title: 'Z-Report Printed',
      }
    );
    setCountedCash('');
    setActiveModal('none');
  };

  return (
    <View className="flex-1 bg-gray-50 p-6">
      {/* Top Header Card */}
      <View className="flex-row items-center justify-between bg-white p-5 rounded-3xl border border-gray-100 mb-4 shadow-sm">
        <View className="flex-row items-center gap-3.5">
          <View className="w-12 h-12 rounded-2xl bg-wine-800 items-center justify-center shadow-sm">
            <Coins size={22} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text className="text-xl font-extrabold text-jazz-text">
              Cash Drawer Management & Audit
            </Text>
            <Text className="text-base text-gray-500 font-medium">
              Monitor opening float, paid-outs, safe drops, and shift reconciliation
            </Text>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => setActiveModal('cash_in')}
            className="flex-row items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 active:bg-emerald-700 min-h-[48px]"
          >
            <ArrowDownCircle size={18} color="#ffffff" />
            <Text className="text-base font-bold text-white">Cash In</Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveModal('cash_out')}
            className="flex-row items-center gap-2 px-4 py-3 rounded-2xl bg-amber-600 active:bg-amber-700 min-h-[48px]"
          >
            <ArrowUpCircle size={18} color="#ffffff" />
            <Text className="text-base font-bold text-white">Petty Cash Out</Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveModal('drop')}
            className="flex-row items-center gap-2 px-4 py-3 rounded-2xl bg-wine-800 active:bg-wine-900 min-h-[48px]"
          >
            <Vault size={18} color="#ffffff" />
            <Text className="text-base font-bold text-white">Safe Drop</Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveModal('audit')}
            className="flex-row items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 active:bg-slate-900 min-h-[48px]"
          >
            <Calculator size={18} color="#ffffff" />
            <Text className="text-base font-bold text-white">End Shift Audit</Text>
          </Pressable>
        </View>
      </View>

      {/* KPI Metrics Grid */}
      <CashDrawerMetricsGrid metrics={metrics} />

      {/* Ledger */}
      <CashDrawerLedger entries={drawerEntries} />

      {/* Action Modals */}
      <CashDrawerActionModal
        visible={activeModal === 'cash_in' || activeModal === 'cash_out' || activeModal === 'drop'}
        actionType={
          activeModal === 'cash_in' || activeModal === 'cash_out' || activeModal === 'drop'
            ? (activeModal as CashActionType)
            : null
        }
        amount={modalAmount}
        reason={modalReason}
        onAmountChange={setModalAmount}
        onReasonChange={setModalReason}
        onClose={() => setActiveModal('none')}
        onConfirm={handleConfirmAction}
      />

      <CashDrawerAuditModal
        visible={activeModal === 'audit'}
        expectedBalance={metrics.expectedBalance}
        countedCash={countedCash}
        onCountedCashChange={setCountedCash}
        onClose={() => setActiveModal('none')}
        onPrintZReport={handlePrintZReport}
      />
    </View>
  );
};
