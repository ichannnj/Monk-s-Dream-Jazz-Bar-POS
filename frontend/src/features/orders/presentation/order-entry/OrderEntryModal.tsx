import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { X, ShoppingBag, ChevronLeft } from 'lucide-react-native';
import {
  MenuItem,
  MenuCategory,
  OrderLineItem,
  BeverageTemperature,
  ProductVariant,
} from '@/types/floor';
import { formatCurrency } from '@monks/shared';

import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';
import { useVenueStore } from '@/features/shared/stores/useVenueStore';
import {
  calculateTabBilling,
  PricingLineItem,
} from '@/features/checkout/utils/taxAndDiscountCalculator';
import { menuApi } from '@/features/menu/data/menu.api';
import { AdminItemImageModal } from '../admin-item-image/AdminItemImageModal';
import { ConfirmationModal, useResponsive } from '@/features/shared';
import { OrderCategoryBar } from './OrderCategoryBar';
import { OrderMenuItemGrid } from './OrderMenuItemGrid';
import { OrderCartSidebar } from './OrderCartSidebar';
import { OrderModifierModal } from './OrderModifierModal';
import { styles } from './OrderEntryModal.styles';

export interface OrderEntryModalProps {
  visible: boolean;
  title: string; // e.g. "Table B1 • Tab: Miles" or "Takeout #T-105"
  roundNumber?: number;
  orderType?: 'dine_in' | 'takeout' | 'online';
  initialItems?: OrderLineItem[];
  previousTabItems?: OrderLineItem[];
  hasExistingCorkage?: boolean;
  onClose: () => void;
  onSendOrder: (items: OrderLineItem[], hasCorkageFee: boolean, corkageAmount: number) => void;
}

export const OrderEntryModal: React.FC<OrderEntryModalProps> = ({
  visible,
  title,
  roundNumber,
  orderType,
  initialItems = [],
  previousTabItems = [],
  hasExistingCorkage = false,
  onClose,
  onSendOrder,
}) => {
  const { currentUser } = useAuthStore();
  const { isMobile } = useResponsive();
  const isAdmin = currentUser?.role === 'admin';

  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('coffee');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderLineItem[]>(initialItems);
  const [hasCorkage, setHasCorkage] = useState(hasExistingCorkage);
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Admin image upload state
  const [editingImageItem, setEditingImageItem] = useState<MenuItem | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isConfirmDispatchOpen, setIsConfirmDispatchOpen] = useState<boolean>(false);

  // Customizer sheet state
  const [activeCustomizingItem, setActiveCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState<BeverageTemperature>('HOT');
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Fetch real menu items directly from local DB
  useEffect(() => {
    let isMounted = true;
    async function loadDbMenuItems() {
      try {
        const items = await menuApi.getMenuItems();
        if (isMounted && items.length > 0) {
          setMenuItemsList(items);
        }
      } catch (err) {
        console.warn('Failed to load DB menu items in OrderEntryModal:', err);
      }
    }

    if (visible) {
      loadDbMenuItems();
    }

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Keep local cart in sync with initialItems
  useEffect(() => {
    setCartItems(initialItems);
    setHasCorkage(hasExistingCorkage);
  }, [initialItems, hasExistingCorkage, visible]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItemsList.filter((item) => {
      if (searchQuery.trim().length > 0) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return item.category === selectedCategory;
    });
  }, [menuItemsList, selectedCategory, searchQuery]);

  const handleOpenImageEditor = (item: MenuItem) => {
    setEditingImageItem(item);
    setIsImageModalOpen(true);
  };

  const handleSaveProductImage = async (itemId: string, newImageUrl: string) => {
    try {
      const res = await menuApi.updateProductImage(itemId, newImageUrl);
      if (res && res.success) {
        setMenuItemsList((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, imageUrl: newImageUrl } : i))
        );
        toast.success(`Photo updated for item!`, { title: 'Product Updated' });
        return true;
      } else {
        toast.error('Failed to update product photo in database.');
        return false;
      }
    } catch (e: any) {
      toast.error(e?.message || 'Error updating product photo.');
      return false;
    }
  };

  // Pricing calculations (Philippine VAT inclusive + Station-aware service charge)
  const { operatingMode, serviceChargeEnabled, cafeFoodServiceChargeRate, eventServiceChargeRate } =
    useVenueStore();

  const isDineIn =
    orderType === 'dine_in' ||
    (!orderType &&
      !title.toLowerCase().includes('takeout') &&
      !title.toLowerCase().includes('delivery') &&
      !title.toLowerCase().includes('foodpanda') &&
      !title.toLowerCase().includes('grabfood'));

  const itemsSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  const corkageAmount = useMemo(() => {
    return hasCorkage ? itemsSubtotal * 0.2 : 0;
  }, [hasCorkage, itemsSubtotal]);

  const billingResult = useMemo(() => {
    const pricingItems: PricingLineItem[] = cartItems.map((ci) => ({
      id: ci.id,
      productName: ci.productName,
      unitPrice: ci.unitPrice,
      quantity: ci.quantity,
      stationTarget: ci.stationTarget || 'kitchen',
    }));

    return calculateTabBilling(pricingItems, {
      operatingMode,
      orderType: isDineIn ? 'DINE_IN' : 'TAKEOUT',
      serviceChargeEnabled,
      cafeFoodServiceChargeRate,
      eventServiceChargeRate,
      corkageAmount,
    });
  }, [
    cartItems,
    operatingMode,
    isDineIn,
    serviceChargeEnabled,
    cafeFoodServiceChargeRate,
    eventServiceChargeRate,
    corkageAmount,
  ]);

  const serviceCharge = billingResult.serviceCharge;
  const vatAmount = billingResult.vatAmount;
  const vatableSales = billingResult.vatableSales;
  const grandTotal = billingResult.totalAmountDue;

  const serviceChargeLabel = useMemo(() => {
    if (!isDineIn) return 'Service Charge (Takeout 0%):';
    if (!serviceChargeEnabled) return 'Service Charge (Disabled):';
    if (operatingMode === 'CAFE') {
      const hasFood = cartItems.some((ci) => ci.stationTarget === 'kitchen');
      const hasBar = cartItems.some((ci) => ci.stationTarget === 'bar');
      if (hasFood && !hasBar) return `Service Charge (${cafeFoodServiceChargeRate}% Food):`;
      if (!hasFood && hasBar) return 'Service Charge (Cafe Drinks 0%):';
      return `Service Charge (${cafeFoodServiceChargeRate}% Food / 0% Drinks):`;
    }
    return `Service Charge (${eventServiceChargeRate}% Event):`;
  }, [
    isDineIn,
    serviceChargeEnabled,
    operatingMode,
    cartItems,
    cafeFoodServiceChargeRate,
    eventServiceChargeRate,
  ]);

  // Handle item click: Open customizer if has variants or modifiers, else quick-add
  const handleItemClick = (item: MenuItem) => {
    const hasVariants = Boolean(item.variants && item.variants.length > 0);
    const hasModifiers = Boolean(item.modifiers && item.modifiers.length > 0);

    if (hasVariants) {
      // Pick initial temperature
      const hasHot = item.variants?.some((v) => v.temperature === 'HOT');
      const initialTemp: BeverageTemperature = hasHot
        ? 'HOT'
        : (item.variants?.[0]?.temperature as BeverageTemperature) || 'HOT';

      // Pick initial size for this temperature
      const sizeForTemp =
        item.variants?.find((v) => v.temperature === initialTemp)?.sizeLabel ||
        item.variants?.[0]?.sizeLabel ||
        'Standard';

      setSelectedTemperature(initialTemp);
      setSelectedSize(sizeForTemp);
      setActiveCustomizingItem(item);
      setSelectedModifiers([]);
      setItemNotes('');
      return;
    }

    if (hasModifiers) {
      setActiveCustomizingItem(item);
      setSelectedModifiers([]);
      setItemNotes('');
      return;
    }

    addToCartDirect(item, undefined, [], '');
  };

  const addToCartDirect = (
    item: MenuItem,
    variant?: ProductVariant,
    mods: string[] = [],
    notesStr: string = ''
  ) => {
    setCartItems((prev) => {
      let extraPrice = 0;
      const formattedMods = mods.map((modName) => {
        const found = item.modifiers.find((m) => m.name === modName);
        if (found) {
          extraPrice += found.priceDelta;
          if (found.priceDelta > 0) {
            return `${found.name} (+${formatCurrency(found.priceDelta)})`;
          }
        }
        return modName;
      });

      const baseUnit = variant ? variant.price : item.price;
      const effectivePrice = baseUnit + extraPrice;

      // Clean item title formatting
      let formattedName = item.name;
      if (variant && variant.temperature !== 'NONE') {
        const tempName = variant.temperature === 'HOT' ? 'Hot' : 'Iced';
        formattedName = `${item.name} (${tempName} · ${variant.sizeLabel})`;
      } else if (variant && variant.sizeLabel && variant.sizeLabel !== 'Standard') {
        formattedName = `${item.name} (${variant.sizeLabel})`;
      }

      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === item.id &&
          (i.variantId || undefined) === (variant?.id || undefined) &&
          (i.notes || '') === (notesStr || '') &&
          JSON.stringify(i.modifiers?.sort() || []) === JSON.stringify(formattedMods.sort())
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      } else {
        const newItem: OrderLineItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: item.id,
          productName: formattedName,
          stationTarget: item.stationTarget,
          variantId: variant?.id,
          temperature: variant?.temperature,
          sizeLabel: variant?.sizeLabel,
          unitPrice: effectivePrice,
          quantity: 1,
          status: 'pending',
          modifiers: formattedMods.length > 0 ? formattedMods : undefined,
          notes: notesStr ? notesStr : undefined,
        };
        return [...prev, newItem];
      }
    });

    toast.success(`Added ${item.name} to order basket`, {
      title: 'Item Added',
    });
  };

  const handleConfirmCustomize = () => {
    if (!activeCustomizingItem) return;

    let matchedVariant: ProductVariant | undefined = undefined;
    if (activeCustomizingItem.variants && activeCustomizingItem.variants.length > 0) {
      matchedVariant = activeCustomizingItem.variants.find(
        (v) =>
          (v.temperature === selectedTemperature || v.temperature === 'NONE') &&
          v.sizeLabel === selectedSize
      );
      if (!matchedVariant) {
        matchedVariant =
          activeCustomizingItem.variants.find((v) => v.temperature === selectedTemperature) ||
          activeCustomizingItem.variants[0];
      }
    }

    addToCartDirect(activeCustomizingItem, matchedVariant, selectedModifiers, itemNotes);
    setActiveCustomizingItem(null);
  };

  const handleToggleModifier = (modName: string) => {
    setSelectedModifiers((prev) =>
      prev.includes(modName) ? prev.filter((m) => m !== modName) : [...prev, modName]
    );
  };

  const updateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index].quantity = newQty;
      }
      return copy;
    });
  };

  const handleToggleCorkage = (val: boolean) => {
    setHasCorkage(val);
    if (val) {
      toast.info('20% corkage fee applied for outside beverage/food.', {
        title: 'Corkage Fee Added',
      });
    } else {
      toast.info('Corkage fee removed.', { title: 'Corkage Removed' });
    }
  };

  const handleOpenConfirm = () => {
    if (cartItems.length === 0) {
      toast.warning('Cart is empty. Please select menu items to dispatch.', {
        title: 'Empty Order',
      });
      return;
    }
    setIsConfirmDispatchOpen(true);
  };

  const handleExecuteDispatch = () => {
    try {
      onSendOrder(cartItems, hasCorkage, corkageAmount);
      setIsConfirmDispatchOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch order. Check station connectivity.', {
        title: 'Dispatch Error',
      });
    }
  };

  const totalCartQty = useMemo(
    () => cartItems.reduce((acc, i) => acc + i.quantity, 0),
    [cartItems]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, isMobile && { padding: 6 }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={[styles.fullscreenModal, isMobile && { height: '98%', borderRadius: 20 }]}>
          {/* Top Bar */}
          <View style={[styles.topBar, isMobile && { paddingHorizontal: 14, paddingVertical: 10 }]}>
            <View style={[styles.topBarLeft, { flex: 1 }]}>
              {isMobile && isMobileCartOpen ? (
                <Pressable
                  onPress={() => setIsMobileCartOpen(false)}
                  className="min-h-[48px] px-3 rounded-xl bg-stone-100 border border-stone-200 flex-row items-center gap-1"
                  accessibilityRole="button"
                  accessibilityLabel="Back to menu catalog"
                >
                  <ChevronLeft size={18} color="#1c1917" />
                  <Text className="text-base font-bold text-stone-800">Menu</Text>
                </Pressable>
              ) : null}
              <View style={[styles.activeDestinationBadge, { flexShrink: 1 }]}>
                <Text style={styles.activeDestinationText} numberOfLines={1}>
                  {title}
                </Text>
              </View>
              <Text style={styles.topBarSub} className="hidden md:flex">
                Monk’s Dream POS • Station Auto-Routing Active
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={styles.topCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close order entry"
            >
              <X size={22} color="#4b5563" />
            </Pressable>
          </View>

          {/* Main Content: Responsive Split on Desktop/Tablet | Toggleable Menu vs Cart on Mobile */}
          <View style={[styles.mainSplit, isMobile && { flexDirection: 'column' }]}>
            {(!isMobile || !isMobileCartOpen) && (
              <View style={styles.catalogPanel}>
                <OrderCategoryBar
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
                <OrderMenuItemGrid
                  items={filteredMenuItems}
                  isAdmin={isAdmin}
                  onItemClick={handleItemClick}
                  onOpenImageEditor={handleOpenImageEditor}
                />

                {/* Mobile Sticky Bottom Cart Bar */}
                {isMobile ? (
                  <View className="bg-white border-t border-stone-200 px-4 py-3 flex-row items-center justify-between gap-3">
                    <Pressable
                      onPress={() => setIsMobileCartOpen(true)}
                      className="flex-1 min-h-[48px] rounded-xl bg-stone-900 px-4 py-2.5 flex-row items-center justify-between active:opacity-90"
                      accessibilityRole="button"
                      accessibilityLabel="Open order basket"
                    >
                      <View className="flex-row items-center gap-2">
                        <ShoppingBag size={18} color="#ffffff" />
                        <Text className="text-base font-bold text-white">
                          Basket ({totalCartQty})
                        </Text>
                      </View>
                      <Text className="text-base font-extrabold text-amber-300">
                        {formatCurrency(grandTotal)}
                      </Text>
                    </Pressable>

                    {totalCartQty > 0 ? (
                      <Pressable
                        onPress={handleOpenConfirm}
                        className="min-h-[48px] rounded-xl bg-[#800020] px-5 items-center justify-center active:opacity-90"
                        accessibilityRole="button"
                        accessibilityLabel="Send Order"
                      >
                        <Text className="text-base font-extrabold text-white">Send</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            )}

            {(!isMobile || isMobileCartOpen) && (
              <OrderCartSidebar
                cartItems={cartItems}
                previousTabItems={previousTabItems}
                roundNumber={roundNumber}
                hasCorkage={hasCorkage}
                corkageAmount={corkageAmount}
                itemsSubtotal={itemsSubtotal}
                serviceCharge={serviceCharge}
                serviceChargeLabel={serviceChargeLabel}
                vatAmount={vatAmount}
                vatableSales={vatableSales}
                grandTotal={grandTotal}
                onUpdateQuantity={updateQuantity}
                onToggleCorkage={handleToggleCorkage}
                onSend={handleOpenConfirm}
              />
            )}
          </View>

          {/* ITEM CUSTOMIZER SHEET */}
          <OrderModifierModal
            item={activeCustomizingItem}
            selectedTemperature={selectedTemperature}
            selectedSize={selectedSize}
            selectedModifiers={selectedModifiers}
            notes={itemNotes}
            onSelectTemperature={setSelectedTemperature}
            onSelectSize={setSelectedSize}
            onToggleModifier={handleToggleModifier}
            onChangeNotes={setItemNotes}
            onClose={() => setActiveCustomizingItem(null)}
            onConfirm={handleConfirmCustomize}
          />

          {/* ADMIN IMAGE MODAL */}
          <AdminItemImageModal
            visible={isImageModalOpen}
            item={editingImageItem}
            onClose={() => {
              setIsImageModalOpen(false);
              setEditingImageItem(null);
            }}
            onSaveImage={handleSaveProductImage}
          />

          {/* CONFIRMATION MODAL FOR ORDER DISPATCH */}
          <ConfirmationModal
            visible={isConfirmDispatchOpen}
            title="Dispatch Order to Stations?"
            message={`${title}: ${cartItems.reduce(
              (acc, i) => acc + i.quantity,
              0
            )} item(s) totalling ${formatCurrency(
              grandTotal
            )} will be sent to Bar & Kitchen station chits.`}
            confirmText="Send Order"
            cancelText="Back to Cart"
            variant="primary"
            onConfirm={handleExecuteDispatch}
            onCancel={() => setIsConfirmDispatchOpen(false)}
          />
        </View>
      </View>
    </Modal>
  );
};
