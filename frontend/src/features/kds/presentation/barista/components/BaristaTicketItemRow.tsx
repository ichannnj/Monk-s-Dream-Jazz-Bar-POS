import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { BarItemLine } from '../types';
import { styles } from './BaristaTicketCard.styles';

export interface BaristaTicketItemRowProps {
  item: BarItemLine;
  ticketId: string;
  onToggleItem?: (ticketId: string, itemId: string) => void;
  onVoidItem?: (item: BarItemLine) => void;
}

export const BaristaTicketItemRow: React.FC<BaristaTicketItemRowProps> = ({
  item,
  ticketId,
  onToggleItem,
  onVoidItem,
}) => {
  const isVoid = item.isVoided;
  const is86 = item.is86;

  const isHot = item.temperature === 'HOT' || item.productName.toLowerCase().includes('(hot');
  const isCold =
    item.temperature === 'COLD' ||
    item.productName.toLowerCase().includes('(iced') ||
    item.productName.toLowerCase().includes('(cold');

  return (
    <View style={{ marginBottom: 4 }}>
      <Pressable onPress={() => onToggleItem?.(ticketId, item.id)} style={styles.itemRow}>
        <Text style={[styles.itemQty, isVoid ? styles.itemVoidText : null]}>{item.quantity}×</Text>
        <Text
          style={[
            styles.itemName,
            isVoid ? styles.itemVoidText : null,
            isVoid ? styles.itemStrikethrough : null,
          ]}
        >
          {item.productName}
          {is86 ? <Text style={styles.outOfStockSuffix}> · Out of Stock</Text> : null}
        </Text>
        {isHot ? (
          <View style={styles.itemVariantBadgeHot}>
            <Text style={styles.itemVariantTextHot}>🔥 HOT</Text>
          </View>
        ) : isCold ? (
          <View style={styles.itemVariantBadgeCold}>
            <Text style={styles.itemVariantTextCold}>❄️ ICED</Text>
          </View>
        ) : null}

        {!isVoid && onVoidItem ? (
          <Pressable
            onPress={(e) => {
              (e as any)?.stopPropagation?.();
              onVoidItem(item);
            }}
            accessibilityLabel={`Void ${item.productName}`}
            style={styles.itemVoidActionBtn}
          >
            <X size={13} color="#dc2626" strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </Pressable>

      {/* Modifiers List */}
      {item.modifiers && item.modifiers.length > 0 ? (
        <View style={styles.itemModRow}>
          <Text style={styles.itemModText}>+ {item.modifiers.join(', ')}</Text>
        </View>
      ) : null}

      {/* Specific Item Prep Notes */}
      {item.notes ? (
        <View style={styles.itemModRow}>
          <Text style={styles.itemNoteSubText}>"{item.notes}"</Text>
        </View>
      ) : null}
    </View>
  );
};
