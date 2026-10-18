import React from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { Send, Trash2, Minus, Plus } from 'lucide-react-native';
import { OrderLineItem } from '../../../mockData';
import { styles } from './OrderEntryModal.styles';

export interface OrderCartSidebarProps {
  cartItems: OrderLineItem[];
  hasCorkage: boolean;
  corkageAmount: number;
  itemsSubtotal: number;
  taxAmount: number;
  grandTotal: number;
  onUpdateQuantity: (index: number, delta: number) => void;
  onToggleCorkage: (val: boolean) => void;
  onSend: () => void;
}

export const OrderCartSidebar: React.FC<OrderCartSidebarProps> = ({
  cartItems,
  hasCorkage,
  corkageAmount,
  itemsSubtotal,
  taxAmount,
  grandTotal,
  onUpdateQuantity,
  onToggleCorkage,
  onSend,
}) => {
  return (
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
                  <Text style={styles.cartItemModText}>+ {cartItem.modifiers.join(', ')}</Text>
                ) : null}

                {cartItem.notes ? (
                  <Text style={styles.cartItemNotesText}>Note: "{cartItem.notes}"</Text>
                ) : null}

                <Text style={styles.cartItemUnitPrice}>${cartItem.unitPrice.toFixed(2)} each</Text>
              </View>

              {/* Steppers & Line Total */}
              <View style={styles.cartItemControls}>
                <Text style={styles.cartItemTotal}>
                  ${(cartItem.unitPrice * cartItem.quantity).toFixed(2)}
                </Text>

                <View style={styles.stepperBox}>
                  <Pressable
                    onPress={() => onUpdateQuantity(idx, -1)}
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

                  <Text style={styles.stepperQuantity}>{cartItem.quantity}</Text>

                  <Pressable
                    onPress={() => onUpdateQuantity(idx, 1)}
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
          <Text style={styles.corkageSub}>Outside bottle or catered food brought by guest</Text>
        </View>
        <Switch
          value={hasCorkage}
          onValueChange={onToggleCorkage}
          trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
          thumbColor={hasCorkage ? '#832238' : '#f4f3f4'}
        />
      </View>

      {/* Summary & Pricing Breakdown */}
      <View style={styles.pricingSummary}>
        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>Items Subtotal:</Text>
          <Text style={styles.summaryValue}>${itemsSubtotal.toFixed(2)}</Text>
        </View>

        {hasCorkage ? (
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: '#832238' }]}>Outside Corkage (20%):</Text>
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
          <Text style={styles.grandTotalValue}>${grandTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* Send Order Action */}
      <Pressable
        onPress={onSend}
        disabled={cartItems.length === 0}
        style={[styles.sendOrderBtn, cartItems.length === 0 && styles.sendOrderBtnDisabled]}
      >
        <Send size={18} color="#ffffff" strokeWidth={2.4} />
        <Text style={styles.sendOrderBtnText}>Send Order to Stations</Text>
      </Pressable>
    </View>
  );
};
