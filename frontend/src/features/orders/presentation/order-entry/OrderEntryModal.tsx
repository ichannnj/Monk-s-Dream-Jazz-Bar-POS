import React from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { OrderLineItem } from '@/types/floor';
import { formatCurrency } from '@monks/shared';
import { AdminItemImageModal } from '../admin-item-image/AdminItemImageModal';
import { ConfirmationModal, useResponsive } from '@/features/shared';
import { OrderCategoryBar } from './OrderCategoryBar';
import { OrderMenuItemGrid } from './OrderMenuItemGrid';
import { OrderCartSidebar } from './OrderCartSidebar';
import { OrderModifierModal } from './OrderModifierModal';
import { OrderEntryTopBar } from './components/OrderEntryTopBar';
import { OrderMobileBottomBar } from './components/OrderMobileBottomBar';
import { useOrderEntryController } from './useOrderEntryController';
import { styles } from './OrderEntryModal.styles';

export interface OrderEntryModalProps {
  visible: boolean;
  title: string;
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
  const { isMobile } = useResponsive();

  const {
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
    handleToggleModifier,
    updateQuantity,
    handleToggleCorkage,
    handleOpenConfirm,
    handleExecuteDispatch,
  } = useOrderEntryController({
    visible,
    title,
    orderType,
    initialItems,
    hasExistingCorkage,
    onClose,
    onSendOrder,
  });

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
          <OrderEntryTopBar
            title={title}
            isMobile={isMobile}
            isMobileCartOpen={isMobileCartOpen}
            onBackToMenu={() => setIsMobileCartOpen(false)}
            onClose={onClose}
          />

          {/* Main Content: Responsive Split on Desktop/Tablet | Toggleable on Mobile */}
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
                  <OrderMobileBottomBar
                    totalCartQty={totalCartQty}
                    grandTotal={grandTotal}
                    onOpenCart={() => setIsMobileCartOpen(true)}
                    onOpenConfirm={handleOpenConfirm}
                  />
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
