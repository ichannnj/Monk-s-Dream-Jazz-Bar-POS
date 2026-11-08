import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import {
  Coins,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
} from 'lucide-react-native';
import type { PrintJobItem } from '../../data/printer.api';

interface PrintJobRowCardProps {
  item: PrintJobItem;
  isReprinting: boolean;
  onReprint: (job: PrintJobItem) => void;
}

export const PrintJobRowCard: React.FC<PrintJobRowCardProps> = ({
  item,
  isReprinting,
  onReprint,
}) => {
  const data = item.receipt_data || {};
  const isReceipt = item.job_type === 'CUSTOMER_RECEIPT' || item.job_type === 'RECEIPT';
  const isRunner = item.job_type === 'RUNNER_CHIT';
  const paymentMethod = (data.paymentMethod || data.payment_method || 'CASH').toUpperCase();
  const isCash = paymentMethod === 'CASH';

  const title = isRunner
    ? `Runner Chit #${data.orderNumber || ''} (Table ${data.tableNumber || 'Walk-in'})`
    : isReceipt
      ? `Receipt #${data.receiptNumber || ''} (${data.tabName || data.customerName || 'Guest'})`
      : `${item.job_type} - ${data.customerName || 'Ticket'}`;

  return (
    <View className="mb-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2.5">
          <View className="p-2 rounded-xl bg-stone-900 border border-stone-800">
            {isReceipt ? (
              <Coins size={18} color="#f59e0b" />
            ) : isRunner ? (
              <FileText size={18} color="#38bdf8" />
            ) : (
              <Sliders size={18} color="#a8a29e" />
            )}
          </View>
          <View>
            <Text className="text-base font-bold text-white">{title}</Text>
            <Text className="text-xs text-stone-400">
              {new Date(item.created_at).toLocaleTimeString()} • Type:{' '}
              <Text className="font-semibold text-stone-300">{item.job_type}</Text>
            </Text>
          </View>
        </View>

        <View>
          {item.status === 'COMPLETED' ? (
            <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1">
              <CheckCircle2 size={14} color="#10b981" />
              <Text className="ml-1 text-xs font-bold text-emerald-400">PRINTED</Text>
            </View>
          ) : item.status === 'PRINTING' ? (
            <View className="flex-row items-center rounded-full bg-sky-500/10 border border-sky-500/30 px-2.5 py-1">
              <ActivityIndicator size="small" color="#38bdf8" />
              <Text className="ml-1 text-xs font-bold text-sky-400">PRINTING</Text>
            </View>
          ) : item.status === 'FAILED' ? (
            <View className="flex-row items-center rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-1">
              <AlertCircle size={14} color="#f43f5e" />
              <Text className="ml-1 text-xs font-bold text-rose-400">FAILED</Text>
            </View>
          ) : (
            <View className="flex-row items-center rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1">
              <Clock size={14} color="#f59e0b" />
              <Text className="ml-1 text-xs font-bold text-amber-400">QUEUED</Text>
            </View>
          )}
        </View>
      </View>

      <View className="mt-3 flex-row flex-wrap items-center gap-3 border-t border-stone-800/80 pt-3 text-xs text-stone-400">
        {isReceipt && (
          <View className="flex-row items-center">
            <Text className="text-stone-500 mr-1.5">Payment:</Text>
            <View
              className={`rounded-md px-2 py-0.5 border ${
                isCash
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-stone-800 border-stone-700 text-stone-300'
              }`}
            >
              <Text className={`text-xs font-bold ${isCash ? 'text-amber-400' : 'text-stone-300'}`}>
                {data.paymentChannel ? `${data.paymentChannel} QR` : data.paymentMethod || 'CASH'}
                {isCash ? ' (DRAWER KICK)' : ''}
              </Text>
            </View>
          </View>
        )}

        {data.total != null && (
          <Text className="text-xs text-stone-300">
            Total:{' '}
            <Text className="font-bold text-white">
              ₱
              {Number(data.total).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </Text>
        )}

        {data.items && data.items.length > 0 && (
          <Text className="text-xs text-stone-400">
            {data.items.length} items (
            {data.items
              .slice(0, 2)
              .map((i: any) => `${i.quantity}x ${i.name}`)
              .join(', ')}
            {data.items.length > 2 ? '...' : ''})
          </Text>
        )}

        <View className="ml-auto">
          <Pressable
            onPress={() => onReprint(item)}
            disabled={isReprinting}
            className="flex-row items-center rounded-xl bg-stone-800 px-3 py-1.5 active:bg-stone-700"
          >
            <RotateCw size={13} color="#d6d3d1" />
            <Text className="ml-1.5 text-xs font-semibold text-stone-300">
              {isReprinting ? 'Queuing...' : 'Reprint'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
