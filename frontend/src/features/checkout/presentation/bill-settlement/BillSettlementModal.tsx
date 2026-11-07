import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Gift,
  Printer,
  CheckCircle2,
  Receipt,
  Sparkles,
  ShoppingBag,
  Maximize2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { TableItem, CustomerTab, TakeoutOrder } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { useAuthStore } from '@/features/auth';
import { toast } from '@/features/shared/toast/useToastStore';
import {
  ConfirmationModal,
  PosDropdown,
  PosDropdownOption,
  useResponsive,
  useVenueStore,
} from '@/features/shared';
import {
  calculateTabBilling,
  type PricingLineItem,
  type DiscountType,
} from '../../utils/taxAndDiscountCalculator';
import { qrPaymentChannelsApi, type QrPaymentChannel } from '../../data/qrPaymentChannels.api';
import { FullscreenQrModal } from '../components/FullscreenQrModal';
import { styles } from './BillSettlementModal.styles';

const MONKS_DREAM_LOGO = require('../../../../../assets/Monks Dream Logo files-02.png');

interface BillSettlementModalProps {
  visible: boolean;
  table?: TableItem | null;
  activeTab?: CustomerTab | null;
  takeoutOrder?: TakeoutOrder | null;
  takeoutCollectAfterPay?: boolean;
  onClose: () => void;
  onDeferTakeoutPayment?: () => void;
  onConfirmPayment: (
    mode: 'single_tab' | 'entire_table' | 'takeout',
    tabIndex: number,
    method: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    tenderedAmount?: number,
    paymentChannel?: string,
    referenceNumber?: string,
    billingDetails?: any
  ) => void;
}

export const BillSettlementModal: React.FC<BillSettlementModalProps> = ({
  visible,
  table,
  activeTab,
  takeoutOrder,
  takeoutCollectAfterPay = false,
  onClose,
  onDeferTakeoutPayment,
  onConfirmPayment,
}) => {
  const { isMobile } = useResponsive();
  const { currentUser } = useAuthStore();
  const { operatingMode, cafeFoodServiceChargeRate, eventServiceChargeRate, serviceChargeEnabled } =
    useVenueStore();
  const [settlementMode, setSettlementMode] = useState<'single_tab' | 'entire_table'>('single_tab');
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'digital_wallet' | 'comp'>(
    'cash'
  );
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [shouldPrintReceipt, setShouldPrintReceipt] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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

  // Reset all state when opening modal or switching tab
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
      setSelectedMethod('cash');
      setShouldPrintReceipt(true);

      let isMounted = true;
      setIsLoadingQrChannels(true);
      qrPaymentChannelsApi
        .fetchActiveQrPaymentChannels()
        .then((channels) => {
          if (!isMounted) return;
          setQrChannels(channels);
          if (channels.length > 0 && !selectedQrChannel) {
            setSelectedQrChannel(channels[0]);
          }
          setIsLoadingQrChannels(false);
        })
        .catch((err) => {
          console.warn('[BillSettlementModal] Failed to load QR channels:', err);
          if (isMounted) setIsLoadingQrChannels(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [visible, activeTab?.id, takeoutOrder?.id]);

  const isTakeout = Boolean(takeoutOrder);
  if (!table && !takeoutOrder) return null;

  const effectiveOperatingMode =
    (isTakeout ? takeoutOrder?.operatingMode : activeTab?.operatingMode) || operatingMode || 'CAFE';

  // Extract raw order line items
  const rawItems = React.useMemo(() => {
    if (isTakeout && takeoutOrder) {
      return (takeoutOrder.items || []).map((i) => ({
        id: i.id,
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        stationTarget: (i.stationTarget as 'bar' | 'kitchen') || 'bar',
        notes: i.notes,
      }));
    }
    if (settlementMode === 'single_tab' && activeTab) {
      return (activeTab.items || [])
        .filter((i) => i.status !== 'cancelled')
        .map((i) => ({
          id: i.id,
          productName: i.productName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          stationTarget: (i.stationTarget as 'bar' | 'kitchen') || 'bar',
          notes: i.notes,
        }));
    }
    if (table?.tabs) {
      return table.tabs
        .flatMap((t) => t.items || [])
        .filter((i) => i.status !== 'cancelled')
        .map((i) => ({
          id: i.id,
          productName: i.productName,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          stationTarget: (i.stationTarget as 'bar' | 'kitchen') || 'bar',
          notes: i.notes,
        }));
    }
    return [];
  }, [isTakeout, takeoutOrder, settlementMode, activeTab, table]);

  // Map to PricingLineItem with Senior tag
  const isSeniorOrPwd = discountType === 'SENIOR_CITIZEN' || discountType === 'PWD';
  const pricingItems: PricingLineItem[] = React.useMemo(() => {
    return rawItems.map((item) => {
      const isItemSenior =
        isSeniorOrPwd && (seniorItemSelectionMode === 'all' || selectedSeniorItemIds.has(item.id));
      return {
        id: item.id,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        stationTarget: item.stationTarget || 'bar',
        isSeniorDiscounted: isItemSenior,
      };
    });
  }, [rawItems, isSeniorOrPwd, seniorItemSelectionMode, selectedSeniorItemIds]);

  // Statutory Billing Calculation
  const parsedCustomDiscount = parseFloat(customDiscountValue) || 0;
  const isComp = selectedMethod === 'comp';
  const tableGroupCorkage = React.useMemo(() => {
    if (settlementMode === 'entire_table' && table?.tabs) {
      return table.tabs.reduce((sum, t) => sum + (t.corkageAmount || 0), 0);
    }
    return activeTab?.corkageAmount || 0;
  }, [settlementMode, table?.tabs, activeTab?.corkageAmount]);

  const billing = React.useMemo(() => {
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

  // Tendered cash calculation
  const numericTendered = parseFloat(tenderedCash) || 0;
  const changeDue = Math.max(0, numericTendered - grandTotal);

  // Strict reference number & payment validation guards
  const isRefNumberValid = /^\d{4}$/.test(referenceNumber.trim());
  const isPaymentValid =
    selectedMethod === 'cash'
      ? grandTotal === 0 || numericTendered >= grandTotal
      : selectedMethod === 'digital_wallet'
        ? selectedQrChannel !== null && isRefNumberValid
        : true;

  const handleOpenConfirm = () => {
    // Senior / PWD validation check
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
      if (selectedMethod === 'cash') {
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

  const handleFinalizePayment = () => {
    try {
      onConfirmPayment(
        isTakeout ? 'takeout' : settlementMode,
        activeTab?.tabIndex || 1,
        selectedMethod,
        selectedMethod === 'cash' ? numericTendered : undefined,
        selectedMethod === 'digital_wallet'
          ? selectedQrChannel?.name || 'Digital Wallet'
          : undefined,
        selectedMethod === 'digital_wallet' ? referenceNumber.trim() : undefined,
        {
          ...billing,
          discountType: isComp ? 'COMP' : discountType,
          seniorPwdId: seniorPwdId.trim(),
          seniorPwdName: seniorPwdName.trim(),
          shouldPrintReceipt,
          tenderedAmount: selectedMethod === 'cash' ? numericTendered : grandTotal,
          corkageAmount: tableGroupCorkage,
        }
      );
      setTenderedCash('');
      setReferenceNumber('');
      setIsConfirmModalOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(
        err?.message || 'Payment processing failed. Please check cash drawer or printer.',
        {
          title: 'Payment Error',
        }
      );
    }
  };

  const quickCashOptions = [
    grandTotal,
    Math.ceil(grandTotal / 100) * 100,
    Math.ceil(grandTotal / 500) * 500,
    Math.ceil(grandTotal / 1000) * 1000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= grandTotal);

  const activeTabsCount = isTakeout
    ? 1
    : table?.tabs && table.tabs.length > 0
      ? table.tabs.filter((t) => t.status !== 'closed').length
      : table?.activeTabs.length || 1;

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

  const paymentMethodOptions: PosDropdownOption<'cash' | 'card' | 'digital_wallet' | 'comp'>[] = [
    {
      value: 'cash',
      label: 'Cash Tender',
      description: 'Physical bills & coins with change calculation',
      icon: Banknote,
    },
    {
      value: 'card',
      label: 'Credit / Debit Card (Terminal)',
      description: 'External bank POS card terminal settlement',
      icon: CreditCard,
    },
    {
      value: 'digital_wallet',
      label: 'GCash / Maya QR Wallet',
      description: 'Digital QR wallet payment confirmation',
      icon: QrCode,
    },
    {
      value: 'comp',
      label: 'House Comp (100% Complimentary)',
      description: 'Musician or managerial complimentary check',
      icon: Gift,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, isMobile && { padding: 8 }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={[styles.modalCard, isMobile && { padding: 16, maxHeight: '95%' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.badge, isTakeout && { backgroundColor: '#15803d' }]}>
                {isTakeout ? (
                  <ShoppingBag size={18} color="#ffffff" strokeWidth={2.4} />
                ) : (
                  <Receipt size={18} color="#ffffff" strokeWidth={2.4} />
                )}
              </View>
              <View>
                <Text style={styles.title}>
                  {isTakeout
                    ? takeoutCollectAfterPay
                      ? 'Takeout Settlement & Hand-off'
                      : 'Takeout Counter Settlement'
                    : 'Checkout & Bill Settlement'}
                </Text>
                <Text style={styles.subtitle}>
                  {isTakeout
                    ? `Takeout #${takeoutOrder?.ticketNumber} • ${takeoutOrder?.customerName} (${takeoutOrder?.items.length || 0} items)`
                    : table
                      ? `${
                          table.code.toLowerCase().startsWith('cafe') ||
                          table.code.toLowerCase().startsWith('bar')
                            ? table.code
                            : `${table.area === 'bar' ? 'Bar' : 'Cafe'} ${table.code}`
                        } • ${table.area === 'bar' ? 'Bar Area' : 'Cafe Area'}`
                      : ''}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close bill settlement"
            >
              <X size={20} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Settlement Scope Dropdown if multiple tabs on Dine-In */}
            {!isTakeout && activeTabsCount > 1 ? (
              <View className="mb-4">
                <PosDropdown
                  options={scopeOptions}
                  value={settlementMode}
                  onChange={setSettlementMode}
                  prefixLabel="Scope:"
                  sheetTitle="Select Settlement Scope"
                  className="w-full"
                />
              </View>
            ) : null}

            {/* Split Content: Left Payment Controls, Right Thermal Receipt Mockup */}
            <View style={[styles.splitRow, isMobile && { flexDirection: 'column', gap: 14 }]}>
              {/* LEFT COLUMN: PAYMENT METHOD & CASH CALCULATOR */}
              <View style={styles.leftCol}>
                {/* Total Display Card */}
                <View style={styles.totalDisplayCard}>
                  <Text style={styles.totalCardLabel}>Balance Due</Text>
                  <Text style={styles.totalCardAmount}>{formatCurrency(grandTotal)}</Text>
                  <Text style={styles.totalCardSub}>
                    Gross: {formatCurrency(subtotal)}
                    {serviceCharge > 0 ? ` + SC: ${formatCurrency(serviceCharge)}` : ''}
                    {billing.totalDiscountAmount > 0
                      ? ` - Disc: ${formatCurrency(billing.totalDiscountAmount)}`
                      : ''}
                  </Text>
                </View>

                {/* Discounts & Statutory Privileges Section */}
                <View style={styles.discountContainer}>
                  <View style={styles.discountTitleRow}>
                    <Text style={styles.discountTitle}>Discounts & Privileges</Text>
                    {billing.totalDiscountAmount > 0 ? (
                      <View className="bg-rose-100 px-2 py-0.5 rounded-full">
                        <Text className="text-xs font-black text-rose-700">
                          -{formatCurrency(billing.totalDiscountAmount)} OFF
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Discount Type Pills */}
                  <View style={styles.discountPillRow}>
                    <Pressable
                      onPress={() => setDiscountType('NONE')}
                      style={[
                        styles.discountPill,
                        discountType === 'NONE' && styles.discountPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.discountPillText,
                          discountType === 'NONE' && styles.discountPillTextActive,
                        ]}
                      >
                        No Discount
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setDiscountType('SENIOR_CITIZEN')}
                      style={[
                        styles.discountPill,
                        discountType === 'SENIOR_CITIZEN' && styles.discountPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.discountPillText,
                          discountType === 'SENIOR_CITIZEN' && styles.discountPillTextActive,
                        ]}
                      >
                        Senior Citizen (20%)
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setDiscountType('PWD')}
                      style={[
                        styles.discountPill,
                        discountType === 'PWD' && styles.discountPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.discountPillText,
                          discountType === 'PWD' && styles.discountPillTextActive,
                        ]}
                      >
                        PWD (20%)
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setDiscountType('PROMO')}
                      style={[
                        styles.discountPill,
                        discountType === 'PROMO' && styles.discountPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.discountPillText,
                          discountType === 'PROMO' && styles.discountPillTextActive,
                        ]}
                      >
                        Custom / Promo
                      </Text>
                    </Pressable>
                  </View>

                  {/* Senior Citizen / PWD Statutory Fields (BIR RR 7-2010) */}
                  {(discountType === 'SENIOR_CITIZEN' || discountType === 'PWD') && (
                    <View style={styles.seniorFieldsBox}>
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <ShieldCheck size={16} color="#c2410c" />
                        <Text style={styles.seniorInputLabel}>
                          {discountType === 'SENIOR_CITIZEN'
                            ? 'Senior Citizen OSCA Details'
                            : 'PWD Beneficiary Details'}{' '}
                          (Mandatory)
                        </Text>
                      </View>

                      <View className="flex-col sm:flex-row gap-2">
                        <View className="flex-1">
                          <Text className="text-[11px] font-bold text-gray-600 mb-1">
                            {discountType === 'SENIOR_CITIZEN'
                              ? 'OSCA ID Number *'
                              : 'PWD ID Number *'}
                          </Text>
                          <TextInput
                            value={seniorPwdId}
                            onChangeText={setSeniorPwdId}
                            placeholder="e.g. 12-3456-7890"
                            placeholderTextColor="#9ca3af"
                            style={styles.seniorInput}
                          />
                        </View>

                        <View className="flex-1">
                          <Text className="text-[11px] font-bold text-gray-600 mb-1">
                            Cardholder Full Name *
                          </Text>
                          <TextInput
                            value={seniorPwdName}
                            onChangeText={setSeniorPwdName}
                            placeholder="e.g. Maria Santos"
                            placeholderTextColor="#9ca3af"
                            style={styles.seniorInput}
                          />
                        </View>
                      </View>

                      {/* Scope Selector: All Items on this Tab vs Select Senior Items */}
                      {rawItems.length > 1 && (
                        <View className="mt-2 pt-2 border-t border-orange-200">
                          <Text className="text-[11px] font-extrabold text-gray-700 uppercase mb-1.5">
                            Items Entitled to 20% Discount & VAT Exemption:
                          </Text>
                          <View className="flex-row gap-2 mb-2">
                            <Pressable
                              onPress={() => setSeniorItemSelectionMode('all')}
                              className={`flex-1 py-1.5 px-2.5 rounded-lg border items-center ${
                                seniorItemSelectionMode === 'all'
                                  ? 'bg-amber-900 border-amber-900'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold ${
                                  seniorItemSelectionMode === 'all' ? 'text-white' : 'text-gray-700'
                                }`}
                              >
                                All Items on Tab
                              </Text>
                            </Pressable>

                            <Pressable
                              onPress={() => setSeniorItemSelectionMode('select')}
                              className={`flex-1 py-1.5 px-2.5 rounded-lg border items-center ${
                                seniorItemSelectionMode === 'select'
                                  ? 'bg-amber-900 border-amber-900'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold ${
                                  seniorItemSelectionMode === 'select'
                                    ? 'text-white'
                                    : 'text-gray-700'
                                }`}
                              >
                                Select Specific Items ({selectedSeniorItemIds.size})
                              </Text>
                            </Pressable>
                          </View>

                          {/* Interactive Checklist if 'select' mode */}
                          {seniorItemSelectionMode === 'select' && (
                            <View className="gap-1.5 max-h-40">
                              {rawItems.map((item) => {
                                const isSelected = selectedSeniorItemIds.has(item.id);
                                return (
                                  <Pressable
                                    key={item.id}
                                    onPress={() => {
                                      const next = new Set(selectedSeniorItemIds);
                                      if (isSelected) next.delete(item.id);
                                      else next.add(item.id);
                                      setSelectedSeniorItemIds(next);
                                    }}
                                    style={[
                                      styles.seniorItemRow,
                                      isSelected && styles.seniorItemRowActive,
                                    ]}
                                  >
                                    <View className="flex-row items-center gap-2 flex-1 mr-2">
                                      <View
                                        className={`w-4 h-4 rounded border items-center justify-center ${
                                          isSelected
                                            ? 'bg-orange-600 border-orange-600'
                                            : 'border-gray-400 bg-white'
                                        }`}
                                      >
                                        {isSelected && <CheckCircle2 size={12} color="#ffffff" />}
                                      </View>
                                      <Text
                                        className="text-xs font-bold text-gray-800"
                                        numberOfLines={1}
                                      >
                                        {item.quantity}x {item.productName}
                                      </Text>
                                    </View>
                                    <Text className="text-xs font-black text-gray-700">
                                      {formatCurrency(item.unitPrice * item.quantity)}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Custom Promo Discount Input */}
                  {discountType === 'PROMO' && (
                    <View className="bg-white rounded-xl p-3 border border-purple-200 gap-2.5">
                      <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Custom / Promo Discount Value
                      </Text>

                      {/* Segmented Mode Selector */}
                      <View className="flex-row rounded-lg bg-gray-100 p-1 gap-1">
                        <Pressable
                          onPress={() => setCustomDiscountMode('percent')}
                          className={`flex-1 py-2 rounded-md items-center justify-center ${
                            customDiscountMode === 'percent'
                              ? 'bg-[#641b2a] shadow-sm'
                              : 'bg-transparent'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              customDiscountMode === 'percent' ? 'text-white' : 'text-gray-600'
                            }`}
                          >
                            Percentage (%)
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setCustomDiscountMode('fixed')}
                          className={`flex-1 py-2 rounded-md items-center justify-center ${
                            customDiscountMode === 'fixed'
                              ? 'bg-[#641b2a] shadow-sm'
                              : 'bg-transparent'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              customDiscountMode === 'fixed' ? 'text-white' : 'text-gray-600'
                            }`}
                          >
                            Fixed Amount (₱)
                          </Text>
                        </Pressable>
                      </View>

                      {/* Full-width Numeric Input */}
                      <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-3 py-1">
                        <Text className="text-base font-extrabold text-gray-500 mr-2">
                          {customDiscountMode === 'percent' ? '%' : '₱'}
                        </Text>
                        <TextInput
                          value={customDiscountValue}
                          onChangeText={setCustomDiscountValue}
                          placeholder={
                            customDiscountMode === 'percent'
                              ? 'Enter discount % (e.g. 10)'
                              : 'Enter peso discount (e.g. 100)'
                          }
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          className="flex-1 text-base font-bold text-gray-900 py-1.5"
                        />
                      </View>
                    </View>
                  )}
                </View>

                {/* Payment Method Dropdown */}
                <View className="mb-4">
                  <PosDropdown
                    options={paymentMethodOptions}
                    value={selectedMethod}
                    onChange={setSelectedMethod}
                    prefixLabel="Tender:"
                    sheetTitle="Select Payment Method"
                    className="w-full"
                  />
                </View>

                {/* Cash Denominations Pad if Cash Selected */}
                {selectedMethod === 'cash' ? (
                  <View style={styles.cashSection}>
                    <Text style={styles.sectionLabel}>Quick Cash Denominations:</Text>
                    <View style={styles.quickCashRow}>
                      {quickCashOptions.map((opt, i) => (
                        <Pressable
                          key={i}
                          onPress={() => setTenderedCash(opt.toString())}
                          style={[
                            styles.quickCashChip,
                            numericTendered === opt && styles.quickCashChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickCashText,
                              numericTendered === opt && styles.quickCashTextActive,
                            ]}
                          >
                            {formatCurrency(opt)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.tenderedInputRow}>
                      <Text style={styles.inputPrefix}>Tendered: ₱</Text>
                      <TextInput
                        style={styles.tenderedInput}
                        keyboardType="numeric"
                        placeholder={grandTotal.toFixed(2)}
                        placeholderTextColor="#9ca3af"
                        value={tenderedCash}
                        onChangeText={setTenderedCash}
                      />
                    </View>

                    {/* Cash Validation Warning */}
                    {!isPaymentValid ? (
                      <View
                        style={{
                          backgroundColor: '#fef2f2',
                          borderWidth: 1,
                          borderColor: '#fecdd3',
                          borderRadius: 10,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          marginBottom: 10,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#dc2626' }}>
                          {numericTendered === 0
                            ? `⚠️ Cash tendered required (min. ${formatCurrency(grandTotal)})`
                            : `⚠️ Tendered amount is less than total due (${formatCurrency(grandTotal)})`}
                        </Text>
                      </View>
                    ) : null}

                    {/* Change Due Banner */}
                    <View style={styles.changeDueBanner}>
                      <Text style={styles.changeDueLabel}>Change Due to Guest:</Text>
                      <Text style={styles.changeDueAmount}>{formatCurrency(changeDue)}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Digital Wallet (QR) Section */}
                {selectedMethod === 'digital_wallet' ? (
                  <View style={styles.qrSection}>
                    {/* Channel Selector Pills */}
                    {isLoadingQrChannels ? (
                      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#800020" />
                      </View>
                    ) : qrChannels.length > 0 ? (
                      <>
                        <Text style={styles.refLabel}>Select Digital Wallet / Bank:</Text>
                        <View style={styles.channelPillsRow}>
                          {qrChannels.map((ch) => {
                            const isSelected =
                              selectedQrChannel?.id === ch.id ||
                              (!selectedQrChannel && ch === qrChannels[0]);
                            return (
                              <Pressable
                                key={ch.id}
                                onPress={() => setSelectedQrChannel(ch)}
                                style={[styles.channelPill, isSelected && styles.channelPillActive]}
                              >
                                <Text
                                  style={[
                                    styles.channelPillText,
                                    isSelected && styles.channelPillTextActive,
                                  ]}
                                >
                                  {ch.name}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>

                        {/* Selected Channel Display Card */}
                        {selectedQrChannel ? (
                          <View style={styles.qrDisplayCard}>
                            <View style={styles.qrThumbContainer}>
                              <Image
                                source={{ uri: selectedQrChannel.qr_image_url }}
                                style={styles.qrThumbImage}
                                resizeMode="contain"
                              />
                            </View>
                            <View style={styles.qrDetailsCol}>
                              <Text style={styles.qrChannelName}>{selectedQrChannel.name}</Text>
                              <Text style={styles.qrAccountName} numberOfLines={1}>
                                {selectedQrChannel.account_name}
                              </Text>
                              <Text style={styles.qrAccountNumber}>
                                {selectedQrChannel.account_number}
                              </Text>
                              <Pressable
                                onPress={() => setIsFullscreenQrOpen(true)}
                                style={styles.expandQrBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Show QR full screen for customer to scan"
                              >
                                <Maximize2 size={12} color="#800020" />
                                <Text style={styles.expandQrBtnText}>
                                  Show to Guest (Full Screen)
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <View
                        style={{
                          padding: 12,
                          backgroundColor: '#fef2f2',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: '#fecdd3',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: '#991b1b',
                            fontWeight: '600',
                          }}
                        >
                          No active QR payment methods configured in Admin Settings. Please ask
                          Admin to upload a QR code.
                        </Text>
                      </View>
                    )}

                    {/* 4-Digit Reference Number Input */}
                    <View style={styles.refInputCard}>
                      <View style={styles.refLabelRow}>
                        <Text style={styles.refLabel}>Reference Number (Last 4 Digits)</Text>
                        <Text style={styles.refRequiredBadge}>REQUIRED</Text>
                      </View>

                      <View style={styles.refInputRow}>
                        <Text style={styles.refPrefix}>REF #</Text>
                        <TextInput
                          style={styles.refInput}
                          keyboardType="numeric"
                          maxLength={4}
                          placeholder="8921"
                          placeholderTextColor="#94a3b8"
                          value={referenceNumber}
                          onChangeText={(val) =>
                            setReferenceNumber(val.replace(/[^0-9]/g, '').slice(0, 4))
                          }
                        />
                      </View>

                      {referenceNumber.length > 0 && !isRefNumberValid ? (
                        <View style={styles.validationBannerError}>
                          <AlertCircle size={14} color="#dc2626" />
                          <Text style={styles.validationTextError}>
                            Enter exactly 4 numeric digits ({referenceNumber.length}/4)
                          </Text>
                        </View>
                      ) : isRefNumberValid ? (
                        <View style={styles.validationBannerSuccess}>
                          <ShieldCheck size={14} color="#16a34a" />
                          <Text style={styles.validationTextSuccess}>
                            Verified Reference: #{referenceNumber}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.refHelperText}>
                          Input the last 4 digits shown on the customer's payment confirmation slip.
                        </Text>
                      )}
                    </View>
                  </View>
                ) : null}

                {/* Print Receipt Toggle */}
                <Pressable
                  onPress={() => setShouldPrintReceipt(!shouldPrintReceipt)}
                  style={styles.printCheckboxRow}
                >
                  <View
                    style={[styles.checkboxBox, shouldPrintReceipt && styles.checkboxBoxActive]}
                  >
                    {shouldPrintReceipt ? <CheckCircle2 size={14} color="#ffffff" /> : null}
                  </View>
                  <Printer size={16} color="#4b5563" />
                  <Text style={styles.printCheckboxText}>
                    Send Print Trigger to USB Printer PC (ESC/POS Receipt)
                  </Text>
                </Pressable>
              </View>

              {/* RIGHT COLUMN: THERMAL RECEIPT MOCKUP PREVIEW */}
              <View style={styles.rightCol}>
                <View style={styles.receiptPaper}>
                  {/* Receipt Header with Logo */}
                  <View style={{ alignItems: 'center', marginBottom: 6 }}>
                    <Image
                      source={MONKS_DREAM_LOGO}
                      style={{ width: 54, height: 54, resizeMode: 'contain', marginBottom: 4 }}
                    />
                    <Text style={styles.receiptLogo}>MONK'S DREAM</Text>
                    <Text style={styles.receiptSubLogo}>JAZZ BAR AND CAFE</Text>
                    <Text style={styles.receiptTagline}>Craft Cocktails & Fine Jazz</Text>
                    <Text style={styles.receiptContact}>
                      Tel: +63 917 555 1957 • IG/FB: @monksdreamjazz
                    </Text>
                  </View>
                  <Text style={styles.receiptDivider}>--------------------------------</Text>

                  {/* Metadata */}
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>
                      {isTakeout
                        ? `CHECK: #${takeoutOrder?.ticketNumber || 'T-001'}`
                        : `CHECK: #${(activeTab?.id || 'REC-001').slice(0, 8).toUpperCase()}`}
                    </Text>
                    <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>
                      MODE: {operatingMode === 'EVENT' ? 'EVENT NIGHT' : 'DAYTIME CAFE'}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptMeta}>
                      DATE:{' '}
                      {new Date().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.receiptMeta}>
                      TIME:{' '}
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptMeta}>
                      {isTakeout
                        ? `TAKEOUT: #${takeoutOrder?.ticketNumber}`
                        : `TABLE: ${table?.code ? `Table ${table.code}` : 'Floor'}`}
                    </Text>
                    <Text style={styles.receiptMeta}>
                      TAB:{' '}
                      {isTakeout
                        ? takeoutOrder?.customerName || 'Walk-in'
                        : activeTab?.guestName || 'Table Guest'}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptMeta}>
                      STAFF: {currentUser?.displayName || 'Cashier'}
                    </Text>
                    <Text style={styles.receiptMeta}>TERMINAL: TILL-1</Text>
                  </View>

                  <Text style={styles.receiptDivider}>================================</Text>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>QTY DESCRIPTION</Text>
                    <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>AMOUNT (PHP)</Text>
                  </View>
                  <Text style={styles.receiptDivider}>================================</Text>

                  {/* Itemized Line Items */}
                  {rawItems.map((item, idx) => (
                    <View key={idx} style={{ marginBottom: 4 }}>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptItemName}>
                          {item.quantity}x {item.productName}
                        </Text>
                        <Text style={styles.receiptItemPrice}>
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </Text>
                      </View>
                      {item.notes ? (
                        <Text style={styles.receiptItemNote}> &gt;&gt; Note: {item.notes}</Text>
                      ) : null}
                    </View>
                  ))}

                  <Text style={styles.receiptDivider}>--------------------------------</Text>

                  {/* Financial Summary */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptMeta}>SUBTOTAL (Gross Sales):</Text>
                    <Text style={styles.receiptMeta}>{formatCurrency(subtotal)}</Text>
                  </View>

                  {billing.vatExemptSales > 0 ? (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMeta}>LESS: VAT EXEMPTION (12%):</Text>
                      <Text style={[styles.receiptMeta, { color: '#b91c1c' }]}>
                        -{formatCurrency(billing.seniorItemsGross - billing.vatExemptSales)}
                      </Text>
                    </View>
                  ) : null}

                  {billing.seniorDiscountAmount > 0 ? (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMeta}>
                        LESS: {discountType === 'SENIOR_CITIZEN' ? 'SC' : 'PWD'} DISCOUNT (20%):
                      </Text>
                      <Text style={[styles.receiptMeta, { color: '#b91c1c' }]}>
                        -{formatCurrency(billing.seniorDiscountAmount)}
                      </Text>
                    </View>
                  ) : null}

                  {billing.customDiscountAmount > 0 ? (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMeta}>LESS: PROMO DISCOUNT:</Text>
                      <Text style={[styles.receiptMeta, { color: '#b91c1c' }]}>
                        -{formatCurrency(billing.customDiscountAmount)}
                      </Text>
                    </View>
                  ) : null}

                  {serviceCharge > 0 ? (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMeta}>
                        SERVICE CHARGE ({operatingMode === 'EVENT' ? 'EVENT 10%' : 'CAFE FOOD 10%'}
                        ):
                      </Text>
                      <Text style={styles.receiptMeta}>{formatCurrency(serviceCharge)}</Text>
                    </View>
                  ) : null}

                  {billing.corkageAmount > 0 ? (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMeta}>CORKAGE FEE:</Text>
                      <Text style={styles.receiptMeta}>
                        {formatCurrency(billing.corkageAmount)}
                      </Text>
                    </View>
                  ) : null}

                  {/* Bold Grand Total */}
                  <Text style={styles.receiptDivider}>================================</Text>
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptBold, { fontSize: 16 }]}>TOTAL AMOUNT DUE:</Text>
                    <Text style={[styles.receiptBold, { fontSize: 16, color: '#800020' }]}>
                      {formatCurrency(grandTotal)}
                    </Text>
                  </View>
                  <Text style={styles.receiptDivider}>================================</Text>

                  {/* Payment Details */}
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptMeta}>PAYMENT METHOD:</Text>
                    <Text style={[styles.receiptMeta, { fontWeight: '800' }]}>
                      {selectedMethod === 'digital_wallet'
                        ? `${(selectedQrChannel?.name || 'DIGITAL WALLET').toUpperCase()} QR`
                        : selectedMethod.toUpperCase()}
                    </Text>
                  </View>

                  {selectedMethod === 'digital_wallet' ? (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMeta}>REFERENCE NO:</Text>
                      <Text
                        style={[
                          styles.receiptMeta,
                          !isRefNumberValid && { color: '#dc2626', fontWeight: '800' },
                        ]}
                      >
                        {isRefNumberValid ? `#${referenceNumber}` : 'REQUIRED (4-DIGIT)'}
                      </Text>
                    </View>
                  ) : null}

                  {selectedMethod === 'cash' ? (
                    <>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptMeta}>CASH TENDERED:</Text>
                        <Text style={styles.receiptMeta}>{formatCurrency(numericTendered)}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptMeta}>CHANGE DUE:</Text>
                        <Text style={[styles.receiptMeta, { fontWeight: '800', color: '#16a34a' }]}>
                          {formatCurrency(changeDue)}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptMeta}>AMOUNT PAID:</Text>
                      <Text style={styles.receiptMeta}>{formatCurrency(grandTotal)}</Text>
                    </View>
                  )}

                  {/* Philippine VAT Breakdown */}
                  <Text style={styles.receiptDivider}>--------------------------------</Text>
                  <Text style={[styles.receiptMeta, { fontWeight: '700', marginBottom: 2 }]}>
                    TAX & STATUTORY BREAKDOWN:
                  </Text>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptTaxSub}> VATable Sales (12%):</Text>
                    <Text style={styles.receiptTaxSub}>{formatCurrency(vatableSales)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptTaxSub}> VAT Amount (12%):</Text>
                    <Text style={styles.receiptTaxSub}>{formatCurrency(vatAmount)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptTaxSub}> VAT-Exempt Sales:</Text>
                    <Text style={styles.receiptTaxSub}>{formatCurrency(vatExemptSales)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptTaxSub}> Zero-Rated Sales:</Text>
                    <Text style={styles.receiptTaxSub}>₱0.00</Text>
                  </View>

                  {billing.vatExemptSales > 0 ? (
                    <>
                      <Text style={styles.receiptDivider}>--------------------------------</Text>
                      <Text style={[styles.receiptMeta, { fontWeight: '700', marginBottom: 2 }]}>
                        BENEFICIARY INFORMATION:
                      </Text>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptTaxSub}> TYPE / ID NO:</Text>
                        <Text style={[styles.receiptTaxSub, { fontWeight: '700' }]}>
                          {discountType === 'SENIOR_CITIZEN' ? 'OSCA' : 'PWD'} #
                          {seniorPwdId || 'REQUIRED'}
                        </Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptTaxSub}> NAME:</Text>
                        <Text style={[styles.receiptTaxSub, { fontWeight: '700' }]}>
                          {(seniorPwdName || 'REQUIRED').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.receiptRow, { marginTop: 4 }]}>
                        <Text style={styles.receiptTaxSub}> SIGNATURE:</Text>
                        <Text style={styles.receiptTaxSub}>______________________</Text>
                      </View>
                    </>
                  ) : null}

                  {/* Jazz Club Cultural Quote & Notice */}
                  <Text style={styles.receiptDivider}>--------------------------------</Text>
                  <View style={{ alignItems: 'center', marginVertical: 4 }}>
                    <Text style={styles.receiptQuote}>"Writing about music is like dancing</Text>
                    <Text style={styles.receiptQuote}>about architecture."</Text>
                    <Text style={[styles.receiptQuote, { fontWeight: '700', marginTop: 1 }]}>
                      - Thelonious Monk
                    </Text>
                    <Text style={[styles.receiptFooter, { marginTop: 4 }]}>
                      Thank you for supporting live music!
                    </Text>
                    <Text style={styles.receiptFooter}>Please come back for the next set.</Text>
                  </View>
                  <Text style={styles.receiptDivider}>--------------------------------</Text>
                  <Text style={styles.receiptNotOfficial}>THIS IS NOT AN OFFICIAL RECEIPT</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.footerRow}>
            {isTakeout && onDeferTakeoutPayment && !takeoutCollectAfterPay ? (
              <Pressable
                onPress={() => {
                  onDeferTakeoutPayment();
                  onClose();
                }}
                style={styles.cancelBtn}
                accessibilityRole="button"
                accessibilityLabel="Defer takeout payment to pickup"
              >
                <Text style={styles.cancelBtnText}>Pay on Pickup (DUE)</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleOpenConfirm}
              disabled={!isPaymentValid}
              style={[
                styles.confirmPayBtn,
                isTakeout && { backgroundColor: '#15803d' },
                !isPaymentValid && { opacity: 0.5, backgroundColor: '#9ca3af' },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Confirm payment of ${formatCurrency(grandTotal)}`}
            >
              <CheckCircle2 size={18} color="#ffffff" strokeWidth={2.4} />
              <Text style={styles.confirmPayBtnText}>
                {isTakeout && takeoutCollectAfterPay
                  ? `Confirm Payment & Hand Off (${formatCurrency(grandTotal)})`
                  : `Confirm Payment & Print Receipt (${formatCurrency(grandTotal)})`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ConfirmationModal
        visible={isConfirmModalOpen}
        title={`Confirm Payment of ${formatCurrency(grandTotal)}?`}
        message={
          isTakeout
            ? `Takeout #${takeoutOrder?.ticketNumber} (${takeoutOrder?.customerName}) via ${
                selectedMethod === 'digital_wallet' && selectedQrChannel
                  ? `${selectedQrChannel.name} (Ref: #${referenceNumber})`
                  : selectedMethod.toUpperCase().replace('_', ' ')
              }. ${
                takeoutCollectAfterPay
                  ? 'This will record payment, print the receipt, and mark the order as collected.'
                  : 'This will record payment, print the receipt, and keep the ticket active on KDS until collected.'
              }`
            : `Table ${table?.code || ''} • ${
                settlementMode === 'single_tab'
                  ? activeTab?.guestName || `Tab #${activeTab?.tabIndex || 1}`
                  : 'Entire Table'
              } via ${
                selectedMethod === 'digital_wallet' && selectedQrChannel
                  ? `${selectedQrChannel.name} (Ref: #${referenceNumber})`
                  : selectedMethod.toUpperCase().replace('_', ' ')
              }. This will finalize the tab and send the receipt to the printer.`
        }
        confirmText={
          isTakeout && takeoutCollectAfterPay ? 'Pay & Complete Hand-off' : 'Complete Settlement'
        }
        cancelText="Back"
        variant="success"
        onConfirm={handleFinalizePayment}
        onCancel={() => setIsConfirmModalOpen(false)}
      />

      {/* Guest Fullscreen QR Scan Modal */}
      <FullscreenQrModal
        visible={isFullscreenQrOpen}
        channel={selectedQrChannel}
        amount={grandTotal}
        onClose={() => setIsFullscreenQrOpen(false)}
      />
    </Modal>
  );
};
