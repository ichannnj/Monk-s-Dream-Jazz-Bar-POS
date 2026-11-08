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

    if (upper.includes('GCASH')) {
      return (
        <View className="flex-row items-center rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-1.5" />
          <Text className="text-xs font-black text-blue-700">GCash</Text>
        </View>
      );
    }
    if (upper.includes('MAYA')) {
      return (
        <View className="flex-row items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1.5" />
          <Text className="text-xs font-black text-emerald-700">Maya</Text>
        </View>
      );
    }
    if (upper.includes('QRPH') || upper.includes('BPI')) {
      return (
        <View className="flex-row items-center rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-purple-600 mr-1.5" />
          <Text className="text-xs font-black text-purple-700">QRPH</Text>
        </View>
      );
    }
    if (upper.includes('BANK')) {
      return (
        <View className="flex-row items-center rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-amber-600 mr-1.5" />
          <Text className="text-xs font-black text-amber-800">Bank Transfer</Text>
        </View>
      );
    }
    if (upper.includes('CARD')) {
      return (
        <View className="flex-row items-center rounded-lg bg-slate-100 border border-slate-300 px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full bg-slate-600 mr-1.5" />
          <Text className="text-xs font-black text-slate-800">Credit / Debit Card</Text>
        </View>
      );
    }
    return (
      <View className="flex-row items-center rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1">
        <Text className="text-xs font-bold text-stone-700">{label}</Text>
      </View>
    );
  };

  return (
    <View className="mb-3 rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs">
      {/* Top Row: Ref #, Channel, Amount, Mode */}
      <View className="flex-col sm:flex-row sm:items-center justify-between gap-3">
        <View className="flex-row flex-wrap items-center gap-2.5">
          {hasRef ? (
            <Pressable
              onPress={() => onCopyRef(item.referenceNumber!)}
              className="flex-row items-center rounded-xl bg-amber-500/10 border border-amber-500/40 px-3 py-1.5 active:bg-amber-500/20"
              accessibilityLabel={`Reference Number ${item.referenceNumber}. Tap to copy.`}
            >
              <Text className="text-xs font-black text-amber-900 tracking-wider font-mono">
                REF #{item.referenceNumber}
              </Text>
              {copiedRef === item.referenceNumber ? (
                <Check size={13} color="#15803d" className="ml-1.5" />
              ) : (
                <Copy size={13} color="#b45309" className="ml-1.5" />
              )}
            </Pressable>
          ) : (
            <View className="rounded-xl bg-stone-100 border border-stone-200 px-3 py-1.5">
              <Text className="text-xs font-bold text-stone-500">NO REF #</Text>
            </View>
          )}

          {getChannelBadge(item.paymentChannel, item.paymentMethod)}

          <View
            className={`rounded-lg px-2.5 py-1 flex-row items-center border ${
              isEvent
                ? 'bg-amber-50 border-amber-200/80 text-amber-800'
                : 'bg-sky-50 border-sky-200/80 text-sky-800'
            }`}
          >
            {isEvent ? (
              <Sparkles size={11} color="#d97706" />
            ) : (
              <Coffee size={11} color="#0284c7" />
            )}
            <Text
              className={`ml-1 text-xs font-bold ${isEvent ? 'text-amber-800' : 'text-sky-800'}`}
            >
              {isEvent ? 'Event' : 'Cafe'}
            </Text>
          </View>
        </View>

        <Text className="text-xl font-black text-stone-900">{formatCurrency(item.total)}</Text>
      </View>

      {/* Middle Row */}
      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
        <Text className="text-xs font-bold text-stone-800">{item.checkNumber}</Text>
        <Text className="text-xs text-stone-500">•</Text>
        <Text className="text-xs font-semibold text-stone-700">{item.guestName}</Text>
        <Text className="text-xs text-stone-500">•</Text>
        <Text className="text-xs text-stone-600">{item.tableOrRef}</Text>
        <Text className="text-xs text-stone-500">•</Text>
        <View className="flex-row items-center">
          <User size={12} color="#78716c" />
          <Text className="ml-1 text-xs text-stone-600">{item.cashierName}</Text>
        </View>
        <Text className="text-xs text-stone-500">•</Text>
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
        <View className="mt-3 rounded-xl bg-stone-50 p-3 border border-stone-200/80">
          <Text className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
            Ordered Line Items ({item.items.length}):
          </Text>
          {item.items.map((it, idx) => (
            <View key={idx} className="flex-row items-center justify-between py-1">
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
      <View className="mt-3 flex-row items-center justify-between border-t border-stone-100/80 pt-2.5">
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
            <ChevronUp size={14} color="#78716c" className="ml-1" />
          ) : (
            <ChevronDown size={14} color="#78716c" className="ml-1" />
          )}
        </Pressable>

        <Pressable
          onPress={() => onReprint(item)}
          disabled={reprintingId === item.id}
          className="flex-row items-center rounded-xl bg-stone-100 px-3 py-1.5 active:bg-stone-200"
        >
          {reprintingId === item.id ? (
            <ActivityIndicator size="small" color="#44403c" />
          ) : (
            <RotateCw size={12} color="#44403c" />
          )}
          <Text className="ml-1.5 text-xs font-bold text-stone-800">Reprint Thermal Receipt</Text>
        </Pressable>
      </View>
    </View>
  );
};
