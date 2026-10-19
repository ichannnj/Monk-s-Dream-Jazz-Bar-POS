import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch } from 'react-native';
import { Send, Trash2, Minus, Plus, History, ChevronDown, ChevronUp } from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import { OrderLineItem } from '../../../mockData';
import { styles } from './OrderEntryModal.styles';

export interface OrderCartSidebarProps {
  cartItems: OrderLineItem[];
  previousTabItems?: OrderLineItem[];
  roundNumber?: number;
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
  previousTabItems = [],
  roundNumber,
  hasCorkage,
  corkageAmount,
  itemsSubtotal,
  taxAmount,
  grandTotal,
  onUpdateQuantity,
  onToggleCorkage,
  onSend,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <View style={styles.cartPanel}>
      <View style={styles.cartHeader}>
        <View>
          <Text style={styles.cartHeaderTitle}>
            {roundNumber ? `Round ${roundNumber} Basket` : 'Current Order Basket'}
          </Text>
          {roundNumber && roundNumber > 1 ? (
            <Text style={{ fontSize: 16, color: '#b45309', fontWeight: '700', marginTop: 2 }}>
              Add-on Round · In-flight orders locked
            </Text>
          ) : null}
        </View>
        <View style={styles.itemCountBadge}>
          <Text style={styles.itemCountText}>
            {cartItems.reduce((acc, i) => acc + i.quantity, 0)} items
          </Text>
        </View>
      </View>

      {/* Previous Tab Orders Accordion (for Add-On Rounds) */}
      {previousTabItems && previousTabItems.length > 0 ? (
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: '#f3f4f6',
            paddingBottom: 8,
            marginBottom: 8,
            marginHorizontal: 16,
          }}
        >
          <Pressable
            onPress={() => setShowHistory(!showHistory)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              minHeight: 48,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <History size={18} color="#64748b" />
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569' }}>
                  Previous Rounds History ({previousTabItems.length})
                </Text>
                <Text style={{ fontSize: 16, color: '#94a3b8' }}>
                  Already sent to KDS · Historical record
                </Text>
              </View>
            </View>
            {showHistory ? (
              <ChevronUp size={18} color="#64748b" />
            ) : (
              <ChevronDown size={18} color="#64748b" />
            )}
          </Pressable>

          {showHistory ? (
            <View style={{ marginTop: 8, gap: 6 }}>
              {previousTabItems.map((prevItem, pIdx) => (
                <View
                  key={prevItem.id || pIdx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: prevItem.status === 'cancelled' ? '#fef2f2' : '#f1f5f9',
                    minHeight: 48,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: prevItem.status === 'cancelled' ? '#991b1b' : '#334155',
                      textDecorationLine: prevItem.status === 'cancelled' ? 'line-through' : 'none',
                    }}
                  >
                    {prevItem.quantity}x {prevItem.productName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      color:
                        prevItem.status === 'ready'
                          ? '#15803d'
                          : prevItem.status === 'preparing'
                            ? '#b45309'
                            : prevItem.status === 'cancelled'
                              ? '#b91c1c'
                              : '#64748b',
                    }}
                  >
                    {prevItem.status}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

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

                <Text style={styles.cartItemUnitPrice}>
                  {formatCurrency(cartItem.unitPrice)} each
                </Text>
              </View>

              {/* Steppers & Line Total */}
              <View style={styles.cartItemControls}>
                <Text style={styles.cartItemTotal}>
                  {formatCurrency(cartItem.unitPrice * cartItem.quantity)}
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
          <Text style={styles.summaryValue}>{formatCurrency(itemsSubtotal)}</Text>
        </View>

        {hasCorkage ? (
          <View style={styles.summaryLine}>
            <Text style={[styles.summaryLabel, { color: '#832238' }]}>Outside Corkage (20%):</Text>
            <Text style={[styles.summaryValue, { color: '#832238' }]}>
              +{formatCurrency(corkageAmount)}
            </Text>
          </View>
        ) : null}

        <View style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>Tax (10% VAT):</Text>
          <Text style={styles.summaryValue}>{formatCurrency(taxAmount)}</Text>
        </View>

        <View style={[styles.summaryLine, styles.totalLine]}>
          <Text style={styles.grandTotalLabel}>Total Amount:</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
        </View>
      </View>

      {/* Send Order Action */}
      <Pressable
        onPress={onSend}
        disabled={cartItems.length === 0}
        style={[styles.sendOrderBtn, cartItems.length === 0 && styles.sendOrderBtnDisabled]}
      >
        <Send size={18} color="#ffffff" strokeWidth={2.4} />
        <Text style={styles.sendOrderBtnText}>
          {roundNumber ? `Send Round ${roundNumber} to Stations` : 'Send Order to Stations'}
        </Text>
      </Pressable>
    </View>
  );
};
