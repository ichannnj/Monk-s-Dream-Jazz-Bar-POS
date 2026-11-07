import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Coins, ArrowDownCircle, ArrowUpCircle, Vault, Calculator, Zap } from 'lucide-react-native';
import { printerApi } from '@/features/printer';
import { useOrderStore } from '../../orders/application/useOrderStore';
import { useAuthStore } from '../../auth/application/useAuthStore';
import { formatCurrency } from '@monks/shared';
import { toast } from '../../shared/toast/useToastStore';
import { PosDropdown, PosDropdownOption } from '../../shared/ui/PosDropdown';
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

    // Auto-kick physical cash drawer on cash operations
    printerApi.kickCashDrawer(activeDrawer).catch((err) => {
      console.warn('[CashDrawer] Auto-kick drawer signal error:', err);
    });

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

  const drawerOptions: PosDropdownOption<'main' | 'bar'>[] = [
    {
      value: 'main',
      label: 'Main Floor Till',
      description: 'Waiter & Cashier counter till',
      icon: Vault,
    },
    {
      value: 'bar',
      label: 'Bar Station Till',
      description: 'Barista & Bartender station till',
      icon: Coins,
    },
  ];

  const drawerActions: PosDropdownOption<'cash_in' | 'cash_out' | 'drop' | 'audit' | 'kick'>[] = [
    {
      value: 'kick',
      label: 'Open Cash Drawer',
      description: 'Send 24V solenoid pulse to pop cash drawer open',
      icon: Zap,
      variant: 'warning',
    },
    {
      value: 'cash_in',
      label: 'Cash In (Add Change Float)',
      description: 'Record additional bills or coin change added to drawer',
      icon: ArrowDownCircle,
      variant: 'success',
    },
    {
      value: 'cash_out',
      label: 'Petty Cash Paid-Out',
      description: 'Record petty cash expense or supplier payout',
      icon: ArrowUpCircle,
      variant: 'warning',
    },
    {
      value: 'drop',
      label: 'Safe Drop Transfer',
      description: 'Transfer excess cash from register to floor safe',
      icon: Vault,
    },
    {
      value: 'audit',
      label: 'End Shift Cash Audit',
      description: 'Reconcile physical cash count against expected balance',
      icon: Calculator,
    },
  ];

  return (
    <View className="flex-1 bg-gray-50 p-3 sm:p-6">
      {/* Unified Responsive Top Header Card */}
      <View className="flex-col lg:flex-row lg:items-center justify-between bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 mb-4 shadow-sm gap-3">
        <View className="flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-2xl bg-wine-800 items-center justify-center shadow-sm">
            <Coins size={20} color="#ffffff" strokeWidth={2.4} />
          </View>
          <Text className="text-xl font-extrabold text-jazz-text">
            Cash Drawer &amp; Till Audit
          </Text>
        </View>

        {/* Till Scope Selector + Cash Action Dropdown */}
        <View className="flex-row flex-wrap items-center gap-2.5">
          <PosDropdown
            options={drawerOptions}
            value={activeDrawer}
            onChange={setActiveDrawer}
            prefixLabel="Till:"
            sheetTitle="Select Cash Drawer Till"
            className="flex-1 sm:flex-initial min-w-[180px]"
          />

          <PosDropdown
            mode="action"
            options={drawerActions}
            onChange={(act) => {
              if (act === 'kick') {
                printerApi.kickCashDrawer(activeDrawer);
                toast.success('Cash drawer pulse signal sent', { title: 'Drawer Solenoid' });
              } else {
                setActiveModal(act);
              }
            }}
            triggerLabel="Drawer Actions"
            triggerIcon={Calculator}
            variant="wine"
            sheetTitle="Cash Drawer Operations"
            className="flex-1 sm:flex-initial min-w-[170px]"
          />
        </View>
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
