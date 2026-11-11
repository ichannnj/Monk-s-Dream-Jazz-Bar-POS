import { useState, useMemo, useEffect } from 'react';
import {
  MenuItem,
  MenuCategory,
  OrderLineItem,
  BeverageTemperature,
  ProductVariant,
} from '@/types/floor';
import { toast } from '@/features/shared/toast/useToastStore';
import { useAuthStore } from '@/features/auth';
import { useVenueStore } from '@/features/shared/stores/useVenueStore';
import { useEventStore } from '@/features/events/application/useEventStore';
import {
  calculateTabBilling,
  PricingLineItem,
} from '@/features/checkout/utils/taxAndDiscountCalculator';
import { menuApi } from '@/features/menu/data/menu.api';
import {
  appendOrIncrementCartItem,
  computeServiceChargeLabel,
  resolveInitialCustomizerState,
  findMatchingVariant,
} from './orderEntryHelpers';

export interface UseOrderEntryControllerProps {
  visible: boolean;
  title: string;
  orderType?: 'dine_in' | 'takeout' | 'online';
  initialItems?: OrderLineItem[];
  hasExistingCorkage?: boolean;
  onClose: () => void;
  onSendOrder: (items: OrderLineItem[], hasCorkageFee: boolean, corkageAmount: number) => void;
}

export function useOrderEntryController({
  visible,
  title,
  orderType,
  initialItems = [],
  hasExistingCorkage = false,
  onClose,
  onSendOrder,
}: UseOrderEntryControllerProps) {
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('coffee');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderLineItem[]>(initialItems);
  const [hasCorkage, setHasCorkage] = useState(hasExistingCorkage);
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [editingImageItem, setEditingImageItem] = useState<MenuItem | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isConfirmDispatchOpen, setIsConfirmDispatchOpen] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  const [activeCustomizingItem, setActiveCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState<BeverageTemperature>('HOT');
  const [selectedSize, setSelectedSize] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function loadDbMenuItems() {
      try {
        let items = await menuApi.getMenuItems();
        if (isMounted && items.length > 0) {
          const todayEvent = useEventStore.getState().getTodayActiveEvent();
          if (todayEvent?.has_door_charge && Number(todayEvent.door_charge_amount) > 0) {
            items = items.map((item) => {
              if (
                item.category === 'door_charge' ||
                item.name.toLowerCase().includes('door charge')
              ) {
                return {
                  ...item,
                  price: Number(todayEvent.door_charge_amount),
                  description: `Admission for "${todayEvent.title}" (₱${Number(todayEvent.door_charge_amount).toFixed(2)} / head)`,
                };
              }
              return item;
            });
          }
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

  useEffect(() => {
    setCartItems(initialItems);
    setHasCorkage(hasExistingCorkage);
  }, [initialItems, hasExistingCorkage, visible]);

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
      }
      toast.error('Failed to update product photo in database.');
      return false;
    } catch (e: any) {
      toast.error(e?.message || 'Error updating product photo.');
      return false;
    }
  };

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
      categorySlug: ci.categorySlug,
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
    return computeServiceChargeLabel(
      isDineIn,
      serviceChargeEnabled,
      operatingMode,
      cartItems,
      cafeFoodServiceChargeRate,
      eventServiceChargeRate
    );
  }, [
    isDineIn,
    serviceChargeEnabled,
    operatingMode,
    cartItems,
    cafeFoodServiceChargeRate,
    eventServiceChargeRate,
  ]);

  const addToCartDirect = (
    item: MenuItem,
    variant?: ProductVariant,
    mods: string[] = [],
    notesStr: string = '',
    variantSelections: import('@/types/floor').OrderItemVariantSelection[] = []
  ) => {
    setCartItems((prev) =>
      appendOrIncrementCartItem(prev, item, variant, mods, notesStr, variantSelections)
    );
    toast.success(`Added ${item.name} to order basket`, { title: 'Item Added' });
  };

  const handleItemClick = (item: MenuItem) => {
    const hasVariants = Boolean(item.variants && item.variants.length > 0);
    const hasModifiers = Boolean(item.modifiers && item.modifiers.length > 0);
    const hasVariantGroups = Boolean(item.variantGroups && item.variantGroups.length > 0);

    if (hasVariants || hasModifiers || hasVariantGroups) {
      if (hasVariants) {
        const { initialTemp, initialSize } = resolveInitialCustomizerState(item);
        setSelectedTemperature(initialTemp);
        setSelectedSize(initialSize);
      }
      // Populate default variant options if any
      const initialOptions: Record<string, string> = {};
      if (hasVariantGroups && item.variantGroups) {
        item.variantGroups.forEach((grp) => {
          const defaultOpt = grp.options.find((o) => o.isDefault);
          if (defaultOpt) {
            initialOptions[grp.id] = defaultOpt.id;
          }
        });
      }
      setSelectedVariantOptions(initialOptions);
      setActiveCustomizingItem(item);
      setSelectedModifiers([]);
      setItemNotes('');
      return;
    }

    addToCartDirect(item, undefined, [], '', []);
  };

  const handleSelectVariantOption = (groupId: string, optionId: string) => {
    setSelectedVariantOptions((prev) => {
      const copy = { ...prev };
      if (!optionId) {
        delete copy[groupId];
      } else {
        copy[groupId] = optionId;
      }
      return copy;
    });
  };

  const handleConfirmCustomize = () => {
    if (!activeCustomizingItem) return;

    // Build OrderItemVariantSelection array
    const variantSelections: import('@/types/floor').OrderItemVariantSelection[] = [];
    if (activeCustomizingItem.variantGroups) {
      for (const grp of activeCustomizingItem.variantGroups) {
        const chosenOptId = selectedVariantOptions[grp.id];
        if (chosenOptId) {
          const opt = grp.options.find((o) => o.id === chosenOptId);
          if (opt) {
            variantSelections.push({
              groupId: grp.id,
              optionId: opt.id,
              groupNameSnapshot: grp.name,
              optionNameSnapshot: opt.name,
              priceDeltaSnapshot: opt.priceDelta,
            });
          }
        } else if (grp.isRequired) {
          toast.warning(`Please select an option for ${grp.name}`, { title: 'Required Selection' });
          return;
        }
      }
    }

    const matched = findMatchingVariant(activeCustomizingItem, selectedTemperature, selectedSize);
    addToCartDirect(
      activeCustomizingItem,
      matched,
      selectedModifiers,
      itemNotes,
      variantSelections
    );
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

  const handleExecuteDispatch = async () => {
    if (isDispatching) return;
    setIsDispatching(true);
    try {
      await onSendOrder(cartItems, hasCorkage, corkageAmount);
      setIsConfirmDispatchOpen(false);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to dispatch order. Check station connectivity.', {
        title: 'Dispatch Error',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const totalCartQty = useMemo(
    () => cartItems.reduce((acc, i) => acc + i.quantity, 0),
    [cartItems]
  );

  return {
    isAdmin,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    cartItems,
    hasCorkage,
    filteredMenuItems,
    isMobileCartOpen,
    setIsMobileCartOpen,
    editingImageItem,
    setEditingImageItem,
    isImageModalOpen,
    setIsImageModalOpen,
    isConfirmDispatchOpen,
    setIsConfirmDispatchOpen,
    activeCustomizingItem,
    setActiveCustomizingItem,
    selectedModifiers,
    selectedVariantOptions,
    itemNotes,
    setItemNotes,
    selectedTemperature,
    setSelectedTemperature,
    selectedSize,
    setSelectedSize,
    itemsSubtotal,
    corkageAmount,
    serviceCharge,
    serviceChargeLabel,
    vatAmount,
    vatableSales,
    grandTotal,
    totalCartQty,
    handleOpenImageEditor,
    handleSaveProductImage,
    handleItemClick,
    handleConfirmCustomize,
    handleSelectVariantOption,
    handleToggleModifier,
    updateQuantity,
    handleToggleCorkage,
    handleOpenConfirm,
    handleExecuteDispatch,
    isDispatching,
  };
}
