import { useState, useEffect, useMemo } from 'react';
import { TableItem, CustomerTab, TakeoutOrder } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { useAuthStore } from '@/features/auth';
import { toast } from '@/features/shared/toast/useToastStore';
import { useVenueStore } from '@/features/shared';
import {
  calculateTabBilling,
  type PricingLineItem,
  type DiscountType,
} from '../../../utils/taxAndDiscountCalculator';
import { qrPaymentChannelsApi, type QrPaymentChannel } from '../../../data/qrPaymentChannels.api';
import { extractRawOrderItems, computePricingLineItems } from './settlementItemExtractors';
import { printerApi } from '@/features/printer';
import type { PaymentTender } from '../../../domain/splitTender.types';
import {
  calculateTenderBalance,
  validateSplitTenders,
} from '../../../domain/splitTenderCalculator';

interface UseBillSettlementParams {
  visible: boolean;
  table?: TableItem | null;
  activeTab?: CustomerTab | null;
  takeoutOrder?: TakeoutOrder | null;
  onClose: () => void;
  onConfirmPayment: (
    mode: 'single_tab' | 'entire_table' | 'takeout',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp' | 'split',
    tenderedAmount?: number,
    paymentChannel?: string,
    referenceNumber?: string,
    billingDetails?: any
  ) => void;
}

export function useBillSettlementController({
  visible,
  table,
  activeTab,
  takeoutOrder,
  onClose,
  onConfirmPayment,
}: UseBillSettlementParams) {
  const { currentUser } = useAuthStore();
  const { operatingMode, cafeFoodServiceChargeRate, eventServiceChargeRate, serviceChargeEnabled } =
    useVenueStore();
  const [settlementMode, setSettlementMode] = useState<'single_tab' | 'entire_table'>('single_tab');
  const [tenderTabMode, setTenderTabMode] = useState<'single' | 'split'>('single');
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'digital_wallet' | 'comp'>(
    'cash'
  );
  const [splitTenders, setSplitTenders] = useState<PaymentTender[]>([]);
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrintingBill, setIsPrintingBill] = useState(false);

  // Discount & Privilege State
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [seniorPwdId, setSeniorPwdId] = useState<string>('');
  const [seniorPwdName, setSeniorPwdName] = useState<string>('');
  const [seniorItemSelectionMode, setSeniorItemSelectionMode] = useState<'all' | 'select'>('all');
  const [selectedSeniorItemIds, setSelectedSeniorItemIds] = useState<Set<string>>(new Set());
  const [customDiscountValue, setCustomDiscountValue] = useState<string>('');
  const [customDiscountMode, setCustomDiscountMode] = useState<'percent' | 'fixed'>('percent');

  // Digital Wallet QR & Reference Number Tracking State
  const [qrChannels, setQrChannels] = useState<QrPaymentChannel[]>([]);
  const [selectedQrChannel, setSelectedQrChannel] = useState<QrPaymentChannel | null>(null);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [isFullscreenQrOpen, setIsFullscreenQrOpen] = useState(false);
  const [isLoadingQrChannels, setIsLoadingQrChannels] = useState(false);

  useEffect(() => {
    if (visible) {
      setDiscountType('NONE');
      setSeniorPwdId('');
      setSeniorPwdName('');
      setSeniorItemSelectionMode('all');
      setSelectedSeniorItemIds(new Set());
      setCustomDiscountValue('');
      setCustomDiscountMode('percent');
      setTenderedCash('');
      setReferenceNumber('');
      setSettlementMode('single_tab');
      setTenderTabMode('single');
      setSelectedMethod('cash');
      setSplitTenders([]);
      setShouldPrintReceipt(true);
      setIsSubmitting(false);

      let isMounted = true;
      setIsLoadingQrChannels(true);
      qrPaymentChannelsApi
        .fetchActiveQrPaymentChannels()
        .then((channels: QrPaymentChannel[]) => {
          if (!isMounted) return;
          setQrChannels(channels);
          if (channels.length > 0 && !selectedQrChannel) {
            setSelectedQrChannel(channels[0]);
          }
          setIsLoadingQrChannels(false);
        })
        .catch((err: unknown) => {
          console.warn('[BillSettlementModal] Failed to load QR channels:', err);
          if (isMounted) setIsLoadingQrChannels(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [visible, activeTab?.id, takeoutOrder?.id]);

  const isTakeout = Boolean(takeoutOrder);

  const effectiveOperatingMode =
    (isTakeout ? takeoutOrder?.operatingMode : activeTab?.operatingMode) || operatingMode || 'CAFE';

  const rawItems = useMemo(() => {
    return extractRawOrderItems(isTakeout, takeoutOrder, settlementMode, activeTab, table);
  }, [isTakeout, takeoutOrder, settlementMode, activeTab, table]);

  const isSeniorOrPwd = discountType === 'SENIOR_CITIZEN' || discountType === 'PWD';
  const pricingItems: PricingLineItem[] = useMemo(() => {
    return computePricingLineItems(
      rawItems,
      isSeniorOrPwd,
      seniorItemSelectionMode,
      selectedSeniorItemIds
    );
  }, [rawItems, isSeniorOrPwd, seniorItemSelectionMode, selectedSeniorItemIds]);

  const parsedCustomDiscount = parseFloat(customDiscountValue) || 0;
  const isComp = selectedMethod === 'comp';
  const tableGroupCorkage = useMemo(() => {
    if (settlementMode === 'entire_table' && table?.tabs) {
      return table.tabs.reduce((sum, t) => sum + (t.corkageAmount || 0), 0);
    }
    return activeTab?.corkageAmount || 0;
  }, [settlementMode, table?.tabs, activeTab?.corkageAmount]);

  const billing = useMemo(() => {
    const calculated = calculateTabBilling(pricingItems, {
      operatingMode: effectiveOperatingMode,
      orderType: isTakeout ? 'TAKEOUT' : 'DINE_IN',
      serviceChargeEnabled: isComp ? false : serviceChargeEnabled,
      cafeFoodServiceChargeRate,
      eventServiceChargeRate,
      discountType: isComp ? 'NONE' : discountType,
      customDiscountAmount: isComp ? 0 : customDiscountMode === 'fixed' ? parsedCustomDiscount : 0,
      customDiscountPercent: isComp
        ? 0
        : customDiscountMode === 'percent'
          ? parsedCustomDiscount
          : 0,
      corkageAmount: isComp ? 0 : tableGroupCorkage,
      seniorPwdId,
      seniorPwdName,
    });

    if (isComp) {
      return {
        ...calculated,
        totalAmountDue: 0,
        totalDiscountAmount: calculated.grossSubtotal,
        customDiscountAmount: calculated.grossSubtotal,
        serviceCharge: 0,
      };
    }
    return calculated;
  }, [
    pricingItems,
    effectiveOperatingMode,
    isTakeout,
    isComp,
    serviceChargeEnabled,
    cafeFoodServiceChargeRate,
    eventServiceChargeRate,
    discountType,
    customDiscountMode,
    parsedCustomDiscount,
    tableGroupCorkage,
    seniorPwdId,
    seniorPwdName,
  ]);

  const grandTotal = billing.totalAmountDue;
  const subtotal = billing.grossSubtotal;
  const vatableSales = billing.vatableSales;
  const vatAmount = billing.vatAmount;
  const vatExemptSales = billing.vatExemptSales;
  const serviceCharge = billing.serviceCharge;

  const splitBalance = useMemo(() => {
    return calculateTenderBalance(splitTenders, grandTotal);
  }, [splitTenders, grandTotal]);

  const splitValidation = useMemo(() => {
    return validateSplitTenders(splitTenders, grandTotal);
  }, [splitTenders, grandTotal]);

  const numericTendered = parseFloat(tenderedCash) || 0;
  const changeDue =
    tenderTabMode === 'split'
      ? splitBalance.totalCashChange
      : Math.max(0, numericTendered - grandTotal);

  const isRefNumberValid = /^\d{4}$/.test(referenceNumber.trim());
  const isPaymentValid =
    tenderTabMode === 'split'
      ? splitValidation.isValid
      : selectedMethod === 'cash'
        ? grandTotal === 0 || numericTendered >= grandTotal
        : selectedMethod === 'digital_wallet'
          ? selectedQrChannel !== null && isRefNumberValid
          : true;

  const handleAddTender = (tender: PaymentTender) => {
    setSplitTenders((prev) => [...prev, tender]);
  };

  const handleUpdateTender = (id: string, updated: Partial<PaymentTender>) => {
    setSplitTenders((prev) =>
      prev.map((t) => (t.id === id ? ({ ...t, ...updated } as PaymentTender) : t))
    );
  };

  const handleRemoveTender = (id: string) => {
    setSplitTenders((prev) => prev.filter((t) => t.id !== id));
  };

  const handleFillRemaining = (id: string) => {
    setSplitTenders((prev) => {
      const current = prev.find((t) => t.id === id);
      if (!current) return prev;
      const otherAllocated = prev
        .filter((t) => t.id !== id)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      const remainingForThis = Math.max(0, grandTotal - otherAllocated);
      return prev.map((t) => (t.id === id ? { ...t, amount: remainingForThis } : t));
    });
  };

  const handleOpenConfirm = () => {
    if (isSeniorOrPwd) {
      if (!seniorPwdId.trim()) {
        toast.warning(
          `Please enter the ${discountType === 'SENIOR_CITIZEN' ? 'OSCA' : 'PWD'} ID Number (Mandatory under BIR RR 7-2010).`,
          { title: 'Beneficiary ID Required' }
        );
        return;
      }
      if (!seniorPwdName.trim()) {
        toast.warning('Please enter the Cardholder Full Name.', {
          title: 'Cardholder Name Required',
        });
        return;
      }
      if (seniorItemSelectionMode === 'select' && selectedSeniorItemIds.size === 0) {
        toast.warning('Please check off at least one item belonging to the Senior / PWD.', {
          title: 'No Items Selected',
        });
        return;
      }
    }

    if (!isPaymentValid) {
      if (tenderTabMode === 'split') {
        const errorMsg =
          splitValidation.errors[0] ||
          `Split tenders must allocate exactly ${formatCurrency(grandTotal)}`;
        toast.warning(errorMsg, { title: 'Split Tender Incomplete' });
      } else if (selectedMethod === 'cash') {
        toast.warning(
          numericTendered === 0
            ? `Please enter cash tendered (min. ${formatCurrency(grandTotal)})`
            : `Tendered amount (${formatCurrency(numericTendered)}) is less than total due (${formatCurrency(grandTotal)})`,
          { title: 'Invalid Cash Input' }
        );
      } else if (selectedMethod === 'digital_wallet') {
        toast.warning(
          selectedQrChannel === null
            ? 'No active QR payment method selected.'
            : referenceNumber.trim().length === 0
              ? 'Please enter the last 4 digits of the payment reference number.'
              : `Reference number must be exactly 4 numeric digits (currently ${referenceNumber.trim().length}/4).`,
          { title: 'Reference Number Required' }
        );
      }
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleFinalizePayment = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const isSplit = tenderTabMode === 'split';
      const cashPortion = isSplit
        ? splitTenders
            .filter((t): t is PaymentTender & { method: 'cash' } => t.method === 'cash')
            .reduce((sum, t) => sum + (t.amount || 0), 0)
        : numericTendered;

      await onConfirmPayment(
        isTakeout ? 'takeout' : settlementMode,
        activeTab?.tabIndex || 1,
        isSplit ? 'split' : selectedMethod,
        isSplit ? cashPortion : selectedMethod === 'cash' ? numericTendered : undefined,
        !isSplit && selectedMethod === 'digital_wallet'
          ? selectedQrChannel?.name || 'Digital Wallet'
          : undefined,
        !isSplit && selectedMethod === 'digital_wallet' ? referenceNumber.trim() : undefined,
        {
          ...billing,
          discountType: isComp ? 'COMP' : discountType,
          seniorPwdId: seniorPwdId.trim(),
          seniorPwdName: seniorPwdName.trim(),
          shouldPrintReceipt,
          tenderedAmount: isSplit
            ? cashPortion
            : selectedMethod === 'cash'
              ? numericTendered
              : grandTotal,
          corkageAmount: tableGroupCorkage,
          tenders: isSplit ? splitTenders : undefined,
        }
      );
      setTenderedCash('');
      setReferenceNumber('');
      setSplitTenders([]);
      setIsConfirmModalOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(
        err?.message || 'Payment processing failed. Please check cash drawer or printer.',
        {
          title: 'Payment Error',
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBillStatement = async () => {
    if (isPrintingBill) return;
    try {
      setIsPrintingBill(true);
      const billData = {
        isBillStatement: true,
        receiptNumber: `BILL-${(activeTab?.id || takeoutOrder?.id || '001').slice(0, 8).toUpperCase()}`,
        tabId: activeTab?.id || takeoutOrder?.id,
        operatingMode: effectiveOperatingMode,
        timestamp: new Date().toISOString(),
        tableNumber: table?.code,
        tableLabel: table?.code
          ? table.code.toLowerCase().startsWith('table')
            ? table.code
            : `Table ${table.code}`
          : undefined,
        tabName: isTakeout
          ? takeoutOrder?.customerName || 'Takeout / Counter'
          : activeTab?.guestName || 'Table Guest',
        customerName: isTakeout
          ? takeoutOrder?.customerName || 'Takeout / Counter'
          : activeTab?.guestName || 'Table Guest',
        serverName: currentUser?.displayName || 'Cashier',
        waiterName: currentUser?.displayName || 'Cashier',
        items: rawItems,
        subtotal,
        corkageFee: tableGroupCorkage,
        corkageAmount: tableGroupCorkage,
        discountAmount: billing.totalDiscountAmount,
        discountType: isComp ? 'COMP' : discountType,
        serviceCharge,
        total: grandTotal,
        amount: grandTotal,
        vatableSales: billing.vatableSales,
        vatAmount: billing.vatAmount,
        vatExemptSales: billing.vatExemptSales,
        seniorPwdId: seniorPwdId.trim(),
        seniorPwdName: seniorPwdName.trim(),
      };

      await printerApi.enqueueBillStatement(billData);
      toast.success('Bill statement sent to printer', { title: 'Bill Printed' });
    } catch (err: any) {
      console.error('[useBillSettlementController] Failed to print bill statement:', err);
      toast.error(err?.message || 'Failed to print bill statement. Please check printer.', {
        title: 'Print Error',
      });
    } finally {
      setIsPrintingBill(false);
    }
  };

  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 100) * 100,
    Math.ceil(grandTotal / 500) * 500,
    Math.ceil(grandTotal / 1000) * 1000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= grandTotal);

  return {
    settlementMode,
    setSettlementMode,
    tenderTabMode,
    setTenderTabMode,
    selectedMethod,
    setSelectedMethod,
    splitTenders,
    splitBalance,
    splitValidation,
    handleAddTender,
    handleUpdateTender,
    handleRemoveTender,
    handleFillRemaining,
    tenderedCash,
    setTenderedCash,
    shouldPrintReceipt,
    setShouldPrintReceipt,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    discountType,
    setDiscountType,
    seniorPwdId,
    setSeniorPwdId,
    seniorPwdName,
    setSeniorPwdName,
    seniorItemSelectionMode,
    setSeniorItemSelectionMode,
    selectedSeniorItemIds,
    setSelectedSeniorItemIds,
    customDiscountValue,
    setCustomDiscountValue,
    customDiscountMode,
    setCustomDiscountMode,
    qrChannels,
    selectedQrChannel,
    setSelectedQrChannel,
    referenceNumber,
    setReferenceNumber,
    isFullscreenQrOpen,
    setIsFullscreenQrOpen,
    isLoadingQrChannels,
    isTakeout,
    rawItems,
    isSeniorOrPwd,
    pricingItems,
    billing,
    grandTotal,
    subtotal,
    vatableSales,
    vatAmount,
    vatExemptSales,
    serviceCharge,
    numericTendered,
    changeDue,
    isRefNumberValid,
    isPaymentValid,
    isSubmitting,
    isPrintingBill,
    handleOpenConfirm,
    handleFinalizePayment,
    handlePrintBillStatement,
    quickCashOptions,
    currentUser,
    effectiveOperatingMode,
  };
}
