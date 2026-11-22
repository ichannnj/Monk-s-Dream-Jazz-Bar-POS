import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import {
  Copy,
  Check,
  RotateCw,
  Sparkles,
  Coffee,
  ChevronDown,
  ChevronUp,
  User,
  Clock,
  QrCode,
  CreditCard,
  Building2,
} from 'lucide-react-native';
import { formatCurrency } from '@monks/shared';
import type { SettledCheckItem } from '@/features/check-history/domain/check.types';

export interface CashlessTransactionCardProps {
  item: SettledCheckItem;
  isExpanded: boolean;
  copiedRef: string | null;
  reprintingId: string | null;
  onToggleExpand: () => void;
  onCopyRef: (ref: string) => void;
  onReprint: (item: SettledCheckItem) => void;
}

export const CashlessTransactionCard: React.FC<CashlessTransactionCardProps> = ({
  item,
  isExpanded,
  copiedRef,
  reprintingId,
  onToggleExpand,
  onCopyRef,
  onReprint,
}) => {
  const hasRef = Boolean(item.referenceNumber);
  const isEvent = item.operatingMode === 'EVENT';

  const getChannelBadge = (channel?: string, method?: string) => {
    const label = channel || method || 'ONLINE';
    const upper = label.toUpperCase();

    let icon = <QrCode size={12} color="#1A1617" />;
    let text = label;

    if (upper.includes('GCASH')) {
      text = 'GCash';
    } else if (upper.includes('MAYA')) {
      text = 'Maya';
    } else if (upper.includes('QRPH') || upper.includes('BPI')) {
      text = 'QRPH';
    } else if (upper.includes('BANK')) {
      text = 'Bank Transfer';
      icon = <Building2 size={12} color="#1A1617" />;
    } else if (upper.includes('CARD')) {
      text = 'Card';
      icon = <CreditCard size={12} color="#1A1617" />;
    }

    return (
      <View className="flex-row items-center rounded-lg bg-stone-100 border border-stone-200 px-2 py-0.5">
        {icon}
        <Text className="ml-1 text-xs font-bold text-stone-800">{text}</Text>
      </View>
    );
  };

  return (
    <View className="mb-2.5 rounded-xl border border-stone-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
      {/* Top Row: Ref #, Channel, Amount, Mode */}
      <View className="flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <View className="flex-row flex-wrap items-center gap-2">
          {hasRef ? (
            <Pressable
              onPress={() => onCopyRef(item.referenceNumber!)}
              className="flex-row items-center rounded-lg bg-[#EFECE6] border border-stone-300 px-2.5 py-1 active:bg-stone-100"
              accessibilityLabel={`Reference Number ${item.referenceNumber}. Tap to copy.`}
            >
              <Text className="text-xs font-bold text-stone-900 tracking-wider font-mono">
                REF #{item.referenceNumber}
              </Text>
              {copiedRef === item.referenceNumber ? (
                <Check size={12} color="#810021" className="ml-1.5" />
              ) : (
                <Copy size={12} color="#78716c" className="ml-1.5" />
              )}
            </Pressable>
          ) : (
            <View className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1">
              <Text className="text-xs font-bold text-stone-500">NO REF #</Text>
            </View>
          )}

          {getChannelBadge(item.paymentChannel, item.paymentMethod)}

          <View className="rounded-lg px-2 py-0.5 flex-row items-center border border-stone-200 bg-[#EFECE6]">
            {isEvent ? (
              <Sparkles size={11} color="#810021" />
            ) : (
              <Coffee size={11} color="#1A1617" />
            )}
            <Text className="ml-1 text-xs font-bold text-stone-700">
              {isEvent ? 'Event' : 'Cafe'}
            </Text>
          </View>
        </View>

        <Text className="text-lg sm:text-xl font-black text-stone-900">
          {formatCurrency(item.total)}
        </Text>
      </View>

      {/* Middle Row: Check Metadata */}
      <View className="mt-2.5 flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600 border-t border-stone-100 pt-2">
        <Text className="text-xs font-bold text-stone-800">{item.checkNumber}</Text>
        <Text className="text-xs text-stone-300">•</Text>
        <Text className="text-xs font-semibold text-stone-700">{item.guestName}</Text>
        <Text className="text-xs text-stone-300">•</Text>
        <Text className="text-xs text-stone-600">{item.tableOrRef}</Text>
        <Text className="text-xs text-stone-300">•</Text>
        <View className="flex-row items-center">
          <User size={12} color="#78716c" />
          <Text className="ml-1 text-xs text-stone-600">{item.cashierName}</Text>
        </View>
        <Text className="text-xs text-stone-300">•</Text>
        <View className="flex-row items-center">
          <Clock size={12} color="#78716c" />
          <Text className="ml-1 text-xs text-stone-500">
            {new Date(item.settledAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            })}{' '}
            {item.timestamp}
          </Text>
        </View>
      </View>

      {/* Expandable Line Items Preview */}
      {isExpanded && item.items && item.items.length > 0 && (
        <View className="mt-2.5 rounded-lg bg-[#EFECE6] p-2.5 border border-stone-200/80">
          <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
            Ordered Line Items ({item.items.length}):
          </Text>
          {item.items.map((it, idx) => (
            <View key={idx} className="flex-row items-center justify-between py-0.5">
              <Text className="text-xs font-medium text-stone-800">
                {it.quantity}x {it.name} {it.notes ? `(${it.notes})` : ''}
              </Text>
              <Text className="text-xs font-bold text-stone-900">
                {formatCurrency(it.subtotal)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Bottom Action Bar */}
      <View className="mt-2.5 flex-row items-center justify-between border-t border-stone-100/80 pt-2">
        <Pressable
          onPress={onToggleExpand}
          className="flex-row items-center py-1 text-stone-500 active:opacity-70"
        >
          <Text className="text-xs font-bold text-stone-600">
            {isExpanded
              ? 'Hide items'
              : `View items (${item.items?.length || item.itemsCount || 0})`}
          </Text>
          {isExpanded ? (
            <ChevronUp size={13} color="#78716c" className="ml-1" />
          ) : (
            <ChevronDown size={13} color="#78716c" className="ml-1" />
          )}
        </Pressable>

        <Pressable
          onPress={() => onReprint(item)}
          disabled={reprintingId === item.id}
          className="min-h-[44px] flex-row items-center rounded-xl bg-white border border-stone-200 px-3 active:bg-stone-50"
        >
          {reprintingId === item.id ? (
            <ActivityIndicator size="small" color="#810021" />
          ) : (
            <RotateCw size={13} color="#810021" />
          )}
          <Text className="ml-1.5 text-xs font-bold text-stone-800">Reprint Receipt</Text>
        </Pressable>
      </View>
    </View>
  );
};
