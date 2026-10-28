import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Coins, ArrowDownCircle, ArrowUpCircle, Vault, Calculator } from 'lucide-react-native';
import { useOrderStore } from '../../orders/application/useOrderStore';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../shared/toast/useToastStore';
import { CashDrawerMetricsGrid } from './cash-drawer/CashDrawerMetricsGrid';
import { CashDrawerLedger } from './cash-drawer/CashDrawerLedger';
import { CashDrawerActionModal, CashActionType } from './cash-drawer/CashDrawerActionModal';
import { CashDrawerAuditModal } from './cash-drawer/CashDrawerAuditModal';

export interface CashDrawerModalViewProps {
  initialDrawer?: 'main' | 'bar';
}

export const CashDrawerModalView: React.FC<CashDrawerModalViewProps> = ({
  initialDrawer = 'main',
}) => {
  const { drawerEntries, addDrawerEntry } = useOrderStore();
  const { currentUser } = useAuthStore();

  const [activeDrawer, setActiveDrawer] = useState<'main' | 'bar'>(initialDrawer);

  // Dialog State
  const [activeModal, setActiveModal] = useState<
    'none' | 'cash_in' | 'cash_out' | 'drop' | 'audit'
  >('none');
  const [modalAmount, setModalAmount] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [countedCash, setCountedCash] = useState('');

  const staffDisplayName =
    currentUser?.displayName ||
    (activeDrawer === 'bar' ? 'Thelonious (Bartender)' : 'Coltrane (Cashier)');

  // Filter ledger entries by selected drawer till
  const activeEntries = useMemo(() => {
    return drawerEntries.filter((entry) => {
      const target = entry.drawerTarget || 'main';
      return target === activeDrawer;
    });
  }, [drawerEntries, activeDrawer]);

  // Compute live drawer balance for the active drawer
  const metrics = useMemo(() => {
    let startingFloat = activeDrawer === 'bar' ? 150.0 : 200.0;
    let cashSales = 0;
    let cashIn = 0;
    let cashOut = 0;
    let cashDrops = 0;

    activeEntries.forEach((entry) => {
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
  }, [activeEntries, activeDrawer]);

  const drawerLabel = activeDrawer === 'bar' ? 'Bar Station Till' : 'Main Floor Till';

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
      addDrawerEntry('cash_in', amt, reason, staffDisplayName, activeDrawer);
      toast.success(`Cash In: ${formatCurrency(amt)} added to ${drawerLabel} (${reason})`, {
        title: 'Cash In Recorded',
      });
    } else if (activeModal === 'cash_out') {
      const reason = modalReason.trim() || 'Petty cash expense';
      addDrawerEntry('cash_out', -amt, reason, staffDisplayName, activeDrawer);
      toast.warning(
        `Petty Cash Out: ${formatCurrency(amt)} recorded from ${drawerLabel} (${reason})`,
        { title: 'Paid Out Recorded' }
      );
    } else if (activeModal === 'drop') {
      const reason = modalReason.trim() || 'Mid-shift safe cash drop';
      addDrawerEntry('drop', -amt, reason, staffDisplayName, activeDrawer);
      toast.info(
        `Safe Drop: ${formatCurrency(amt)} transferred from ${drawerLabel} to floor safe`,
        { title: 'Safe Drop Confirmed' }
      );
    }

    setModalAmount('');
    setModalReason('');
    setActiveModal('none');
  };

  const handlePrintZReport = (numericCounted: number, variance: number) => {
    toast.success(
      `${drawerLabel} Shift Z-Report printed: Counted ${formatCurrency(numericCounted)} (Variance: ${formatCurrency(variance)})`,
      { title: 'Z-Report Printed' }
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

      {/* Drawer Scope Selector */}
      <View className="flex-row items-center gap-3 mb-4">
        <Pressable
          onPress={() => setActiveDrawer('main')}
          className={`flex-1 flex-row items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border min-h-[48px] ${
            activeDrawer === 'main'
              ? 'bg-wine-800 border-wine-900 shadow-sm'
              : 'bg-white border-gray-200 active:bg-gray-50'
          }`}
        >
          <Vault size={18} color={activeDrawer === 'main' ? '#ffffff' : '#6b7280'} />
          <Text
            className={`text-base font-bold ${
              activeDrawer === 'main' ? 'text-white' : 'text-gray-700'
            }`}
          >
            Main Floor Till (Waiter & Cashier)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveDrawer('bar')}
          className={`flex-1 flex-row items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl border min-h-[48px] ${
            activeDrawer === 'bar'
              ? 'bg-wine-800 border-wine-900 shadow-sm'
              : 'bg-white border-gray-200 active:bg-gray-50'
          }`}
        >
          <Coins size={18} color={activeDrawer === 'bar' ? '#ffffff' : '#6b7280'} />
          <Text
            className={`text-base font-bold ${
              activeDrawer === 'bar' ? 'text-white' : 'text-gray-700'
            }`}
          >
            Bar Station Till (Barista & Bartender)
          </Text>
        </Pressable>
      </View>

      {/* KPI Metrics Grid */}
      <CashDrawerMetricsGrid metrics={metrics} />

      {/* Ledger for the active drawer */}
      <CashDrawerLedger entries={activeEntries} />

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
