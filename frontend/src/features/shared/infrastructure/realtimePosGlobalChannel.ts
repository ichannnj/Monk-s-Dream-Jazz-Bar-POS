import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { GlobalRealtimeCallbacks } from './realtime.types';

export const ensureGlobalPOSRealtimeChannel = (
  channels: Map<string, RealtimeChannel>,
  globalPosListeners: Set<GlobalRealtimeCallbacks>,
  onReconnect: (channelName: string) => void
): RealtimeChannel => {
  const channelName = 'pos_global_sync';
  let channel = channels.get(channelName);
  if (channel && channel.state !== 'closed' && channel.state !== 'errored') {
    return channel;
  }

  // Remove any pre-existing channels with this topic before creating a new one
  const matched = supabase
    .getChannels()
    .find((c) => c.topic === `realtime:${channelName}` || c.topic === channelName);
  if (matched) {
    try {
      matched.unsubscribe();
    } catch {
      // Channel may already be unsubscribed
    }
    supabase.removeChannel(matched);
  }

  channel = supabase
    .channel(channelName, {
      config: { broadcast: { self: true } },
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onTableChange?.(payload));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tabs' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onTabChange?.(payload));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onOrderChange?.(payload));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onOrderItemChange?.(payload));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onProductChange?.(payload));
    })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'table_transfer_logs' },
      (payload) => {
        globalPosListeners.forEach((cb) => cb.onTransferLog?.(payload));
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'cash_drawer_transactions' },
      (payload) => {
        globalPosListeners.forEach((cb) => cb.onCashDrawerChange?.(payload));
      }
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onPaymentChange?.(payload));
    })
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_items' },
      (payload) => {
        globalPosListeners.forEach((cb) => cb.onInventoryChange?.(payload));
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stock_movements' },
      (payload) => {
        globalPosListeners.forEach((cb) => cb.onStockMovementChange?.(payload));
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'attendance_records' },
      (payload) => {
        globalPosListeners.forEach((cb) => cb.onAttendanceChange?.(payload));
      }
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onUserChange?.(payload));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, (payload) => {
      globalPosListeners.forEach((cb) => cb.onCategoryChange?.(payload));
    })
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'waste_logs' },
      (payload) => {
        globalPosListeners.forEach((cb) => cb.onWasteLogChange?.(payload));
      }
    )
    .on('broadcast', { event: 'foh:buzzout' }, (event) => {
      globalPosListeners.forEach((cb) => cb.onBuzzout?.(event.payload));
    })
    .on('broadcast', { event: 'station:table_transferred' }, (event) => {
      globalPosListeners.forEach((cb) => cb.onTableTransfer?.(event.payload));
    })
    .on('broadcast', { event: 'pos:sync_needed' }, (event) => {
      globalPosListeners.forEach((cb) => cb.onPosSyncNeeded?.(event.payload));
    })
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[RealtimeGateway] pos_global_sync status: ${status}`, err);
        onReconnect(channelName);
      }
    });

  channels.set(channelName, channel);
  return channel;
};

export const subscribeGlobalPOSRealtimeChannel = (
  channels: Map<string, RealtimeChannel>,
  globalPosListeners: Set<GlobalRealtimeCallbacks>,
  callbacks: GlobalRealtimeCallbacks,
  onReconnect: (channelName: string) => void
): (() => void) => {
  const channelName = 'pos_global_sync';
  globalPosListeners.add(callbacks);
  ensureGlobalPOSRealtimeChannel(channels, globalPosListeners, onReconnect);

  return () => {
    globalPosListeners.delete(callbacks);
    if (globalPosListeners.size === 0) {
      const existingChannel = channels.get(channelName);
      if (existingChannel) {
        try {
          existingChannel.unsubscribe();
        } catch {
          // Channel may already be unsubscribed
        }
        supabase.removeChannel(existingChannel);
        channels.delete(channelName);
      }
    }
  };
};
