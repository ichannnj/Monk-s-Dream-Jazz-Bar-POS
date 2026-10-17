import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  Coffee,
  Wine,
  UtensilsCrossed,
  Pizza,
  Cake,
  AlertTriangle,
  Leaf,
  Ban,
  CheckCircle2,
} from 'lucide-react-native';
import {
  MenuItem,
  SEED_MENU_ITEMS,
  MenuCategory,
  OrderLineItem,
} from '../../mockData';

interface OrderEntryModalProps {
  visible: boolean;
  title: string; // e.g. "Table B1 • Tab: Miles" or "Takeout #T-105"
  initialItems?: OrderLineItem[];
  hasExistingCorkage?: boolean;
  onClose: () => void;
  onSendOrder: (
    items: OrderLineItem[],
    hasCorkageFee: boolean,
    corkageAmount: number
  ) => void;
}

export const OrderEntryModal: React.FC<OrderEntryModalProps> = ({
  visible,
  title,
  initialItems = [],
  hasExistingCorkage = false,
  onClose,
  onSendOrder,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<MenuCategory>('coffee');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderLineItem[]>(initialItems);
  const [hasCorkage, setHasCorkage] = useState(hasExistingCorkage);

  // Customizer State
  const [activeCustomizingItem, setActiveCustomizingItem] =
    useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');

  // Reset or initialize on visibility change
  React.useEffect(() => {
    if (visible) {
      setCartItems(initialItems);
      setHasCorkage(hasExistingCorkage);
      setSearchQuery('');
    }
  }, [visible, initialItems, hasExistingCorkage]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return SEED_MENU_ITEMS.filter((item) => {
      if (searchQuery.trim().length > 0) {
        return item.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase().trim());
      }
      return item.category === selectedCategory;
    });
  }, [selectedCategory, searchQuery]);

  // Cart Calculations
  const itemsSubtotal = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
  }, [cartItems]);

  const corkageAmount = useMemo(() => {
    return hasCorkage ? itemsSubtotal * 0.2 : 0;
  }, [hasCorkage, itemsSubtotal]);

  const taxAmount = useMemo(() => {
    return (itemsSubtotal + corkageAmount) * 0.1;
  }, [itemsSubtotal, corkageAmount]);

  const grandTotal = useMemo(() => {
    return itemsSubtotal + corkageAmount + taxAmount;
  }, [itemsSubtotal, corkageAmount, taxAmount]);

  // Add Item to Cart
  const handleItemClick = (item: MenuItem) => {
    if (!item.isAvailable || item.auto86) return;

    if (item.modifiers.length > 0) {
      setActiveCustomizingItem(item);
      setSelectedModifiers([]);
      setItemNotes('');
    } else {
      addToCartDirect(item, [], '');
    }
  };

  const addToCartDirect = (
    item: MenuItem,
    modifiers: string[],
    notes: string
  ) => {
    let price = item.price;
    modifiers.forEach((modName) => {
      const found = item.modifiers.find((m) => m.name === modName);
      if (found) price += found.priceDelta;
    });

    setCartItems((prev) => {
      const existingIdx = prev.findIndex(
        (ci) =>
          ci.productId === item.id &&
          JSON.stringify(ci.modifiers) === JSON.stringify(modifiers) &&
          (ci.notes || '') === notes
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      } else {
        const newItem: OrderLineItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          productId: item.id,
          productName: item.name,
          unitPrice: price,
          quantity: 1,
          stationTarget: item.stationTarget,
          modifiers: modifiers.length > 0 ? modifiers : undefined,
          notes: notes.trim() || undefined,
          status: 'pending',
        };
        return [...prev, newItem];
      }
    });
  };

  const handleConfirmCustomize = () => {
    if (activeCustomizingItem) {
      addToCartDirect(activeCustomizingItem, selectedModifiers, itemNotes);
      setActiveCustomizingItem(null);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const nextQty = target.quantity + delta;

      if (nextQty <= 0) {
        return copy.filter((_, i) => i !== index);
      } else {
        copy[index] = { ...target, quantity: nextQty };
        return copy;
      }
    });
  };

  const handleSend = () => {
    onSendOrder(cartItems, hasCorkage, corkageAmount);
    onClose();
  };

  const categories: { id: MenuCategory; label: string; Icon: any }[] = [
    { id: 'coffee', label: 'Coffee', Icon: Coffee },
    { id: 'cocktails_wine', label: 'Bar & Wine', Icon: Wine },
    { id: 'mains_pasta', label: 'Pasta & Mains', Icon: Pizza },
    { id: 'small_plates', label: 'Small Bites', Icon: UtensilsCrossed },
    { id: 'desserts', label: 'Desserts', Icon: Cake },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.fullscreenModal}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.activeDestinationBadge}>
                <Text style={styles.activeDestinationText}>{title}</Text>
              </View>
              <Text style={styles.topBarSub}>
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

          {/* Main Content Split: Left Catalog (62%), Right Cart (38%) */}
          <View style={styles.mainSplit}>
            {/* LEFT CATALOG PANEL */}
            <View style={styles.catalogPanel}>
              {/* Category Pills & Search */}
              <View style={styles.catalogHeader}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryPillsScroll}
                >
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    const { Icon } = cat;

                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => {
                          setSelectedCategory(cat.id);
                          setSearchQuery('');
                        }}
                        style={[
                          styles.catPill,
                          isActive && styles.catPillActive,
                        ]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${cat.label} category`}
                      >
                        <Icon
                          size={16}
                          color={isActive ? '#ffffff' : '#4b5563'}
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[
                            styles.catPillText,
                            isActive && styles.catPillTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Search Bar */}
                <View style={styles.searchRow}>
                  <Search size={16} color="#9ca3af" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search coffee, pasta, wine, cocktails..."
                    placeholderTextColor="#9ca3af"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    accessibilityLabel="Search menu items"
                  />
                  {searchQuery.length > 0 ? (
                    <Pressable
                      onPress={() => setSearchQuery('')}
                      accessibilityRole="button"
                      accessibilityLabel="Clear search"
                    >
                      <X size={16} color="#9ca3af" />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {/* Products Grid */}
              <ScrollView
                style={styles.productsScroll}
                contentContainerStyle={styles.productsGrid}
                showsVerticalScrollIndicator={false}
              >
                {filteredMenuItems.map((item) => {
                  const isSoldOut = !item.isAvailable || item.auto86;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleItemClick(item)}
                      disabled={isSoldOut}
                      style={({ pressed }) => [
                        styles.productCard,
                        isSoldOut && styles.productCardDisabled,
                        pressed && !isSoldOut && styles.productCardPressed,
                      ]}
                    >
                      {/* Station Target Tag & Price */}
                      <View style={styles.productCardTop}>
                        <View
                          style={[
                            styles.stationBadge,
                            item.stationTarget === 'bar'
                              ? styles.badgeBar
                              : styles.badgeKitchen,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stationBadgeText,
                              item.stationTarget === 'bar'
                                ? styles.textBar
                                : styles.textKitchen,
                            ]}
                          >
                            {item.stationTarget === 'bar' ? '☕ BAR' : '🍳 KITCHEN'}
                          </Text>
                        </View>

                        <Text style={styles.productPrice}>
                          ${item.price.toFixed(2)}
                        </Text>
                      </View>

                      {/* Product Name & Description */}
                      <Text style={styles.productName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.productDesc} numberOfLines={2}>
                        {item.description}
                      </Text>

                      {/* Dietary & Allergens Row */}
                      <View style={styles.badgesRow}>
                        {item.dietary.map((d) => (
                          <View key={d} style={styles.dietaryPill}>
                            <Leaf size={10} color="#15803d" />
                            <Text style={styles.dietaryPillText}>{d}</Text>
                          </View>
                        ))}

                        {item.allergens.map((a) => (
                          <View key={a} style={styles.allergenPill}>
                            <AlertTriangle size={10} color="#b45309" />
                            <Text style={styles.allergenPillText}>{a}</Text>
                          </View>
                        ))}

                        {item.isResoldOutsideFood ? (
                          <View style={styles.resoldPill}>
                            <Text style={styles.resoldPillText}>Outside (+20%)</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* SOLD OUT OVERLAY (86 Safeguard) */}
                      {isSoldOut ? (
                        <View style={styles.soldOutOverlay}>
                          <Ban size={22} color="#dc2626" strokeWidth={2.4} />
                          <Text style={styles.soldOutTitle}>SOLD OUT (86)</Text>
                          <Text style={styles.soldOutReason}>
                            {item.outOfStockReason || 'Ingredient Depleted'}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* RIGHT ORDER CART PANEL */}
            <View style={styles.cartPanel}>
              <View style={styles.cartHeader}>
                <Text style={styles.cartHeaderTitle}>Current Order Basket</Text>
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>
                    {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
                  </Text>
                </View>
              </View>

              {/* Cart Items List */}
              <ScrollView
                style={styles.cartScroll}
                contentContainerStyle={styles.cartScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {cartItems.length === 0 ? (
                  <View style={styles.emptyCartBox}>
                    <Text style={styles.emptyCartTitle}>No items selected</Text>
                    <Text style={styles.emptyCartSub}>
                      Tap products on the left catalog to add them to this order
                    </Text>
                  </View>
                ) : (
                  cartItems.map((cartItem, idx) => (
                    <View key={cartItem.id || idx} style={styles.cartItemRow}>
                      <View style={styles.cartItemInfo}>
                        <View style={styles.cartItemNameLine}>
                          <View
                            style={[
                              styles.miniStationDot,
                              cartItem.stationTarget === 'bar'
                                ? { backgroundColor: '#0284c7' }
                                : { backgroundColor: '#ea580c' },
                            ]}
                          />
                          <Text style={styles.cartItemName} numberOfLines={1}>
                            {cartItem.productName}
                          </Text>
                        </View>

                        {/* Modifiers & Notes */}
                        {cartItem.modifiers && cartItem.modifiers.length > 0 ? (
                          <Text style={styles.cartItemModText}>
                            + {cartItem.modifiers.join(', ')}
                          </Text>
                        ) : null}

                        {cartItem.notes ? (
                          <Text style={styles.cartItemNotesText}>
                            Note: "{cartItem.notes}"
                          </Text>
                        ) : null}

                        <Text style={styles.cartItemUnitPrice}>
                          ${cartItem.unitPrice.toFixed(2)} each
                        </Text>
                      </View>

                      {/* Steppers & Line Total */}
                      <View style={styles.cartItemControls}>
                        <Text style={styles.cartItemTotal}>
                          ${(cartItem.unitPrice * cartItem.quantity).toFixed(2)}
                        </Text>

                        <View style={styles.stepperBox}>
                          <Pressable
                            onPress={() => updateQuantity(idx, -1)}
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease quantity of ${cartItem.productName}`}
                          >
                            {cartItem.quantity === 1 ? (
                              <Trash2 size={15} color="#ef4444" />
                            ) : (
                              <Minus size={15} color="#4b5563" />
                            )}
                          </Pressable>

                          <Text style={styles.stepperQuantity}>
                            {cartItem.quantity}
                          </Text>

                          <Pressable
                            onPress={() => updateQuantity(idx, 1)}
                            style={styles.stepperBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Increase quantity of ${cartItem.productName}`}
                          >
                            <Plus size={15} color="#4b5563" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* 20% Corkage Fee Toggle */}
              <View style={styles.corkageBox}>
                <View style={styles.corkageLabelGroup}>
                  <Text style={styles.corkageTitle}>Fixed 20% Corkage Fee</Text>
                  <Text style={styles.corkageSub}>
                    Outside bottle or catered food brought by guest
                  </Text>
                </View>
                <Switch
                  value={hasCorkage}
                  onValueChange={setHasCorkage}
                  trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
                  thumbColor={hasCorkage ? '#832238' : '#f4f3f4'}
                />
              </View>

              {/* Summary & Pricing Breakdown */}
              <View style={styles.pricingSummary}>
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Items Subtotal:</Text>
                  <Text style={styles.summaryValue}>
                    ${itemsSubtotal.toFixed(2)}
                  </Text>
                </View>

                {hasCorkage ? (
                  <View style={styles.summaryLine}>
                    <Text style={[styles.summaryLabel, { color: '#832238' }]}>
                      Outside Corkage (20%):
                    </Text>
                    <Text style={[styles.summaryValue, { color: '#832238' }]}>
                      +${corkageAmount.toFixed(2)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLabel}>Tax (10% VAT):</Text>
                  <Text style={styles.summaryValue}>${taxAmount.toFixed(2)}</Text>
                </View>

                <View style={[styles.summaryLine, styles.totalLine]}>
                  <Text style={styles.grandTotalLabel}>Total Amount:</Text>
                  <Text style={styles.grandTotalValue}>
                    ${grandTotal.toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Send Order Action */}
              <Pressable
                onPress={handleSend}
                disabled={cartItems.length === 0}
                style={[
                  styles.sendOrderBtn,
                  cartItems.length === 0 && styles.sendOrderBtnDisabled,
                ]}
              >
                <Send size={18} color="#ffffff" strokeWidth={2.4} />
                <Text style={styles.sendOrderBtnText}>
                  Send Order to Stations
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ITEM CUSTOMIZER SHEET (MODIFIERS & NOTES) */}
          {activeCustomizingItem ? (
            <View style={styles.customizerBackdrop}>
              <View style={styles.customizerCard}>
                <View style={styles.customizerHeader}>
                  <View>
                    <Text style={styles.customizerTitle}>
                      Customize {activeCustomizingItem.name}
                    </Text>
                    <Text style={styles.customizerSub}>
                      Base: ${activeCustomizingItem.price.toFixed(2)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setActiveCustomizingItem(null)}
                    style={styles.closeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Close customizer"
                  >
                    <X size={20} color="#4b5563" />
                  </Pressable>
                </View>

                {/* Modifiers List */}
                <Text style={styles.customizerSectionTitle}>
                  Available Recipe Modifiers:
                </Text>
                <View style={styles.modList}>
                  {activeCustomizingItem.modifiers.map((mod) => {
                    const isSelected = selectedModifiers.includes(mod.name);

                    return (
                      <Pressable
                        key={mod.id}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedModifiers((prev) =>
                              prev.filter((m) => m !== mod.name)
                            );
                          } else {
                            setSelectedModifiers((prev) => [...prev, mod.name]);
                          }
                        }}
                        style={[
                          styles.modRow,
                          isSelected && styles.modRowSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modName,
                            isSelected && styles.modNameSelected,
                          ]}
                        >
                          {mod.name}
                        </Text>
                        <Text
                          style={[
                            styles.modPrice,
                            isSelected && styles.modPriceSelected,
                          ]}
                        >
                          {mod.priceDelta > 0
                            ? `+$${mod.priceDelta.toFixed(2)}`
                            : 'Free'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Special Prep Notes */}
                <Text style={styles.customizerSectionTitle}>
                  Preparation Notes:
                </Text>
                <TextInput
                  style={styles.customizerInput}
                  placeholder="e.g. Extra hot oat milk, no parmesan, light ice..."
                  placeholderTextColor="#9ca3af"
                  value={itemNotes}
                  onChangeText={setItemNotes}
                />

                <Pressable
                  onPress={handleConfirmCustomize}
                  style={styles.confirmCustomizeBtn}
                >
                  <CheckCircle2 size={16} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.confirmCustomizeBtnText}>
                    Add to Cart
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 30, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullscreenModal: {
    backgroundColor: '#f6f0ed',
    borderRadius: 28,
    width: '100%',
    height: '95%',
    maxWidth: 1280,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  topBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  activeDestinationBadge: {
    backgroundColor: '#641b2a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  activeDestinationText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  topBarSub: {
    fontSize: 13.5,
    color: '#6b7280',
    fontWeight: '500',
  },
  topCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSplit: {
    flex: 1,
    flexDirection: 'row',
  },
  catalogPanel: {
    flex: 1.6,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#fcfaf9',
  },
  catalogHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryPillsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: '#f3f4f6',
  },
  catPillActive: {
    backgroundColor: '#641b2a',
  },
  catPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4b5563',
  },
  catPillTextActive: {
    color: '#ffffff',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  productsScroll: {
    flex: 1,
  },
  productsGrid: {
    padding: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  productCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 146,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  productCardDisabled: {
    opacity: 0.7,
    backgroundColor: '#f3f4f6',
  },
  productCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  productCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  badgeBar: {
    backgroundColor: '#e0f2fe',
  },
  badgeKitchen: {
    backgroundColor: '#ffedd5',
  },
  stationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textBar: {
    color: '#0369a1',
  },
  textKitchen: {
    color: '#c2410c',
  },
  productPrice: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#1a1a1e',
    fontVariant: ['tabular-nums'],
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1e',
    marginBottom: 4,
  },
  productDesc: {
    fontSize: 12.5,
    color: '#6b7280',
    lineHeight: 17,
    marginBottom: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  dietaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  dietaryPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803d',
  },
  allergenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  allergenPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#b45309',
  },
  resoldPill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  resoldPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#6d28d9',
  },
  soldOutOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  soldOutTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
    marginTop: 4,
  },
  soldOutReason: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  cartPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    justifyContent: 'space-between',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cartHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  itemCountBadge: {
    backgroundColor: '#fceeed',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemCountText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#832238',
    fontVariant: ['tabular-nums'],
  },
  cartScroll: {
    flex: 1,
    marginVertical: 10,
  },
  cartScrollContent: {
    gap: 10,
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#6b7280',
  },
  emptyCartSub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  cartItemNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStationDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1e',
  },
  cartItemModText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  cartItemNotesText: {
    fontSize: 12,
    color: '#d97706',
    fontStyle: 'italic',
    marginTop: 1,
  },
  cartItemUnitPrice: {
    fontSize: 12.5,
    color: '#9ca3af',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  cartItemControls: {
    alignItems: 'flex-end',
    gap: 6,
  },
  cartItemTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1e',
    fontVariant: ['tabular-nums'],
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 2,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQuantity: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 8,
    fontVariant: ['tabular-nums'],
  },
  corkageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff1f2',
    padding: 14,
    borderRadius: 14,
    marginVertical: 8,
    minHeight: 52,
  },
  corkageLabelGroup: {
    flex: 1,
    marginRight: 8,
  },
  corkageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#832238',
  },
  corkageSub: {
    fontSize: 12,
    color: '#9f1239',
  },
  pricingSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    marginBottom: 12,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13.5,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14.5,
    color: '#374151',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  totalLine: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#641b2a',
    fontVariant: ['tabular-nums'],
  },
  sendOrderBtn: {
    backgroundColor: '#641b2a',
    borderRadius: 16,
    minHeight: 52,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#641b2a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sendOrderBtnDisabled: {
    opacity: 0.5,
  },
  sendOrderBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Customizer sheet overlay
  customizerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customizerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 480,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  customizerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customizerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  customizerSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizerSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  modList: {
    gap: 8,
    marginBottom: 16,
  },
  modRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  modRowSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#15803d',
  },
  modName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#374151',
  },
  modNameSelected: {
    color: '#15803d',
    fontWeight: '800',
  },
  modPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    fontVariant: ['tabular-nums'],
  },
  modPriceSelected: {
    color: '#15803d',
  },
  customizerInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 14.5,
    color: '#111827',
    marginBottom: 18,
  },
  confirmCustomizeBtn: {
    backgroundColor: '#15803d',
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  confirmCustomizeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
