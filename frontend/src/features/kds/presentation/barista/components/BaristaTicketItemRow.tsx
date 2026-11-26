import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { BarItemLine } from '../types';
import { styles } from './BaristaTicketCard.styles';
import { useLiveNow, getItemElapsedMetrics } from '@/features/shared/utils/elapsedTime';
import { useKeyedCooldown } from '@/features/shared/hooks/useAsyncAction';

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
  const isVoid = item.isVoided || item.status === 'cancelled';
  const isServed = item.status === 'served';
  const isReady = item.status === 'ready';
  const is86 = item.is86;

  const nowMs = useLiveNow(!isVoid && !isServed);
  const metrics = getItemElapsedMetrics(item, nowMs);
  const { lock } = useKeyedCooldown(300);

  const isHot = item.temperature === 'HOT' || item.productName.toLowerCase().includes('(hot');
  const isCold =
    item.temperature === 'COLD' ||
    item.productName.toLowerCase().includes('(iced') ||
    item.productName.toLowerCase().includes('(cold');

  const statusPillColors = isVoid
    ? { bg: '#fee2e2', text: '#b91c1c' }
    : isServed
      ? { bg: '#f3f4f6', text: '#6b7280' }
      : isReady
        ? { bg: '#dcfce7', text: '#15803d' }
        : item.status === 'preparing'
          ? { bg: '#fef3c7', text: '#b45309' }
          : { bg: '#f3f4f6', text: '#4b5563' };

  const timerColors =
    isVoid || isServed
      ? { bg: '#f3f4f6', text: '#6b7280' }
      : metrics.urgency === 'late'
        ? { bg: '#fee2e2', text: '#b91c1c' }
        : metrics.urgency === 'warning'
          ? { bg: '#fef3c7', text: '#b45309' }
          : { bg: '#efeae3', text: '#374151' };

  return (
    <View
      style={[
        { marginBottom: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 },
        isReady && { backgroundColor: '#f0fdf4' },
        isServed && { opacity: 0.65 },
      ]}
    >
      <Pressable
        onPress={() => {
          if (isVoid || isServed) return;
          if (!lock(`kds:item:${item.id}`)) return;
          onToggleItem?.(ticketId, item.id);
        }}
        style={[styles.itemRow, { minHeight: 40 }]}
      >
        <Text style={[styles.itemQty, isVoid ? styles.itemVoidText : null]}>{item.quantity}×</Text>
        <Text
          style={[
            styles.itemName,
            isVoid ? styles.itemVoidText : null,
            isVoid ? styles.itemStrikethrough : null,
            isReady ? { color: '#15803d' } : null,
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

        {!isVoid ? (
          <View
            style={{
              backgroundColor: timerColors.bg,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: timerColors.text,
                fontVariant: ['tabular-nums'],
              }}
            >
              {metrics.displayTimer}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            backgroundColor: statusPillColors.bg,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
          }}
        >
          {isReady || isServed ? (
            <Check size={11} color={statusPillColors.text} strokeWidth={3} />
          ) : null}
          <Text style={{ fontSize: 10, fontWeight: '800', color: statusPillColors.text }}>
            {metrics.stageLabel}
          </Text>
        </View>

        {!isVoid && !isServed && onVoidItem ? (
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
