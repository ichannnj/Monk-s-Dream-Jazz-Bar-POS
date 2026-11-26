import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  MenuItem,
  MenuCategory,
  MenuCategoryItem,
  OrderLineItem,
  BeverageTemperature,
  ProductVariant,
} from '@/types/floor';
import { toast } from '@/features/shared/toast/useToastStore';
import { useVenueStore } from '@/features/shared/stores/useVenueStore';
import { useEventStore } from '@/features/events/application/useEventStore';
import { realtimeGateway } from '@/features/shared/infrastructure/realtime';
import {
  calculateTabBilling,
  roundPhp,
  PricingLineItem,
} from '@/features/checkout/utils/taxAndDiscountCalculator';
import { menuApi } from '@/features/menu/data/menu.api';
import { DEFAULT_CATEGORIES, buildDynamicCategories } from './orderCategoryResolution';
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
  const [categoriesList, setCategoriesList] = useState<MenuCategoryItem[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('coffee');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderLineItem[]>(initialItems);
  const [hasCorkage, setHasCorkage] = useState(hasExistingCorkage);
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [isConfirmDispatchOpen, setIsConfirmDispatchOpen] = useState<boolean>(false);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const isDispatchingRef = useRef<boolean>(false);

  const [activeCustomizingItem, setActiveCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [itemNotes, setItemNotes] = useState('');
  const [selectedTemperature, setSelectedTemperature] = useState<BeverageTemperature>('HOT');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const todayEvent = useEventStore((s) => s.getTodayActiveEvent());

  useEffect(() => {
    if (todayEvent?.has_door_charge && Number(todayEvent.door_charge_amount) > 0) {
      setMenuItemsList((prevItems) =>
        prevItems.map((item) => {
          if (item.category === 'door_charge' || item.name.toLowerCase().includes('door charge')) {
            return {
              ...item,
              eventId: todayEvent.id,
              price: Number(todayEvent.door_charge_amount),
              description: `Admission for "${todayEvent.title}" (₱${Number(todayEvent.door_charge_amount).toFixed(2)} / head)`,
            };
          }
          return item;
        })
      );
    }
  }, [todayEvent]);

  const loadDbMenuData = useCallback(async () => {
    try {
      const [itemsRes, catsRes] = await Promise.allSettled([
        menuApi.getMenuItems(),
        menuApi.getCategories(),
      ]);

      let items: MenuItem[] = itemsRes.status === 'fulfilled' ? itemsRes.value : [];
      const dbCats = catsRes.status === 'fulfilled' ? catsRes.value : [];

      if (items.length > 0) {
        const todayEv = useEventStore.getState().getTodayActiveEvent();
        if (todayEv?.has_door_charge && Number(todayEv.door_charge_amount) > 0) {
          items = items.map((item) => {
            if (
              item.category === 'door_charge' ||
              item.name.toLowerCase().includes('door charge')
            ) {
              return {
                ...item,
                eventId: todayEv.id,
                price: Number(todayEv.door_charge_amount),
                description: `Admission for "${todayEv.title}" (₱${Number(todayEv.door_charge_amount).toFixed(2)} / head)`,
              };
            }
            return item;
          });
        }
        setMenuItemsList(items);
      }

      // Map dynamic categories from database and menu items
      const finalCats = buildDynamicCategories(dbCats, items);
      setCategoriesList(finalCats);

      // Validate selected category against active list
      setSelectedCategory((prev) => {
        if (finalCats.some((c) => c.id === prev)) {
          return prev;
        }
        return (finalCats[0]?.id as MenuCategory) || 'coffee';
      });
    } catch (err) {
      console.warn('Failed to load DB menu items in OrderEntryModal:', err);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;

    loadDbMenuData();

    const unsubRealtime = realtimeGateway.subscribeGlobalPOSRealtime({
      onCategoryChange: () => loadDbMenuData(),
      onProductChange: () => loadDbMenuData(),
      onPosSyncNeeded: () => loadDbMenuData(),
    });

    return () => {
      unsubRealtime();
    };
  }, [visible, loadDbMenuData]);

  useEffect(() => {
    setCartItems(initialItems);
    setHasCorkage(hasExistingCorkage);
    isDispatchingRef.current = false;
    setIsDispatching(false);
    setIsConfirmDispatchOpen(false);
  }, [initialItems, hasExistingCorkage, visible]);

  const filteredMenuItems = useMemo(() => {
    return menuItemsList.filter((item) => {
      if (searchQuery.trim().length > 0) {
        return item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }
      return item.category === selectedCategory;
    });
  }, [menuItemsList, selectedCategory, searchQuery]);

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
    if (!hasCorkage) return 0;
    const corkageableSubtotal = cartItems
      .filter(
        (item) =>
          item.categorySlug !== 'door_charge' &&
          item.productId !== 'd1000001-0000-0000-0000-000000000001' &&
          !item.productName?.toLowerCase().includes('door charge')
      )
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    return roundPhp(corkageableSubtotal * 0.2);
  }, [hasCorkage, cartItems]);

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
      serviceChargeEnabled: false,
      corkageAmount,
    });
  }, [cartItems, operatingMode, isDineIn, corkageAmount]);

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
      if (index < 0 || index >= prev.length) return prev;
      const copy = [...prev];
      const newQty = copy[index].quantity + delta;
      if (newQty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index] = {
          ...copy[index],
          quantity: newQty,
        };
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
    if (isDispatchingRef.current || isDispatching) return;
    isDispatchingRef.current = true;
    setIsDispatching(true);
    try {
      await onSendOrder(cartItems, hasCorkage, corkageAmount);
      setIsConfirmDispatchOpen(false);
      onClose();
    } catch (err: any) {
      isDispatchingRef.current = false;
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

  const selectedCategoryLabel = useMemo(() => {
    const found = categoriesList.find((c) => c.id === selectedCategory);
    return found?.label || selectedCategory;
  }, [categoriesList, selectedCategory]);

  return {
    categoriesList,
    selectedCategory,
    selectedCategoryLabel,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    cartItems,
    hasCorkage,
    filteredMenuItems,
    isMobileCartOpen,
    setIsMobileCartOpen,
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
