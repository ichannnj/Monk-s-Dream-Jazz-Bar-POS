import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { MenuItem, MenuCategory, OrderLineItem } from '../../../types/floor';
import { formatCurrency } from '@monks/shared';

import { toast } from '../../../store/useToastStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { menuApi } from '../../../services/menu.api';
import { AdminItemImageModal } from '../AdminItemImageModal';
import { ConfirmationModal } from '../../shared/ConfirmationModal';
import { OrderCategoryBar } from './OrderCategoryBar';
import { OrderMenuItemGrid } from './OrderMenuItemGrid';
import { OrderCartSidebar } from './OrderCartSidebar';
import { OrderModifierModal } from './OrderModifierModal';
import { styles } from './OrderEntryModal.styles';

export interface OrderEntryModalProps {
  visible: boolean;
  title: string; // e.g. "Table B1 • Tab: Miles" or "Takeout #T-105"
  roundNumber?: number;
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
  initialItems = [],
  previousTabItems = [],
  hasExistingCorkage = false,
  onClose,
  onSendOrder,
}) => {
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin';

  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('coffee');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<OrderLineItem[]>(initialItems);
  const [hasCorkage, setHasCorkage] = useState(hasExistingCorkage);
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([]);

  // Admin image upload state
  const [editingImageItem, setEditingImageItem] = useState<MenuItem | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [isConfirmDispatchOpen, setIsConfirmDispatchOpen] = useState<boolean>(false);

  // Customizer sheet state
  const [activeCustomizingItem, setActiveCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState('');

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

  // Pricing calculations
  const itemsSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
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

  // Handle item click: Open customizer if has modifiers, else quick-add
  const handleItemClick = (item: MenuItem) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setActiveCustomizingItem(item);
      setSelectedModifiers([]);
      setItemNotes('');
      return;
    }
    addToCartDirect(item, [], '');
  };

  const addToCartDirect = (item: MenuItem, mods: string[], notesStr: string) => {
    setCartItems((prev) => {
      let extraPrice = 0;
      mods.forEach((modName) => {
        const found = item.modifiers.find((m) => m.name === modName);
        if (found) extraPrice += found.priceDelta;
      });

      const effectivePrice = item.price + extraPrice;
      const existingIdx = prev.findIndex(
        (i) =>
          i.productId === item.id &&
          (i.notes || '') === (notesStr || '') &&
          JSON.stringify(i.modifiers?.sort() || []) === JSON.stringify(mods.sort())
      );

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      } else {
        const newItem: OrderLineItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: item.id,
          productName: item.name,
          stationTarget: item.stationTarget,
          unitPrice: effectivePrice,
          quantity: 1,
          status: 'pending',
          modifiers: mods.length > 0 ? mods : undefined,
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
    addToCartDirect(activeCustomizingItem, selectedModifiers, itemNotes);
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close modal"
        />
        <View style={styles.fullscreenModal}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <View style={styles.activeDestinationBadge}>
                <Text style={styles.activeDestinationText}>{title}</Text>
              </View>
              <Text style={styles.topBarSub}>Monk’s Dream POS • Station Auto-Routing Active</Text>
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
            </View>

            <OrderCartSidebar
              cartItems={cartItems}
              previousTabItems={previousTabItems}
              roundNumber={roundNumber}
              hasCorkage={hasCorkage}
              corkageAmount={corkageAmount}
              itemsSubtotal={itemsSubtotal}
              taxAmount={taxAmount}
              grandTotal={grandTotal}
              onUpdateQuantity={updateQuantity}
              onToggleCorkage={handleToggleCorkage}
              onSend={handleOpenConfirm}
            />
          </View>

          {/* ITEM CUSTOMIZER SHEET */}
          <OrderModifierModal
            item={activeCustomizingItem}
            selectedModifiers={selectedModifiers}
            notes={itemNotes}
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
