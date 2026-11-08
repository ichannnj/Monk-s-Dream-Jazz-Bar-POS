/**
 * Realtime Subscriptions & Station Event Gateway
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 */
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  StationOrderPayload,
  TableOccupancyPayload,
  Auto86Payload,
  BuzzoutPayload,
  TableTransferPayload,
  GlobalRealtimeCallbacks,
  ChatRealtimeCallbacks,
} from './realtime.types';
import {
  subscribeChatMessagesChannel,
  trackChatPresenceOnChannel,
  broadcastChatMessageOnChannel,
} from './realtimeChatChannel';
import { subscribeGlobalPOSRealtimeChannel } from './realtimePosGlobalChannel';

export * from './realtime.types';

export class RealtimeGateway {
  private channels: Map<string, RealtimeChannel> = new Map();
  private globalPosListeners: Set<GlobalRealtimeCallbacks> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleChannelReconnect(channelName: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.globalPosListeners.size > 0 && channelName === 'pos_global_sync') {
        const oldChannel = this.channels.get(channelName);
        if (oldChannel) {
          try {
            oldChannel.unsubscribe();
          } catch {
            // Ignore normal unsubscribe notice
          }
          this.channels.delete(channelName);
        }
        const listenersCopy = Array.from(this.globalPosListeners);
        this.globalPosListeners.clear();
        listenersCopy.forEach((cb) => this.subscribeGlobalPOSRealtime(cb));
      }
    }, 2500);
  }

  private async safeSend(
    channel: RealtimeChannel,
    message: { type: 'broadcast'; event: string; payload: any }
  ): Promise<any> {
    try {
      if (channel.state === 'joined') {
        return await channel.send(message);
      }
      if (typeof (channel as any).httpSend === 'function') {
        return await (channel as any).httpSend(message);
      }
      return await channel.send(message);
    } catch {
      // Non-fatal if offline
    }
  }

  subscribeStationOrders(
    station: 'bar' | 'kitchen',
    onOrderChange: (payload: any) => void
  ): () => void {
    const channelName = `kds:station_${station}`;
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `station_target=eq.${station}`,
        },
        (payload) => {
          onOrderChange(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  subscribeRunnerBuzzout(
    onBuzzout: (payload: any) => void,
    onItemReady?: (payload: any) => void
  ): () => void {
    const channelName = 'foh:runner_buzzout';
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'foh:buzzout' }, (event) => {
        onBuzzout(event.payload);
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
          filter: 'status=eq.READY',
        },
        (payload) => {
          if (onItemReady) onItemReady(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  subscribeFloorTables(
    onTableChange: (payload: any) => void,
    onTabTransfer?: (payload: any) => void
  ): () => void {
    const channelName = 'floor:tables_occupancy';
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, (payload) => {
        onTableChange(payload);
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'table_transfer_logs' },
        (payload) => {
          if (onTabTransfer) onTabTransfer(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  subscribeAuto86(onProductChange: (payload: any) => void): () => void {
    const channelName = 'catalog:auto_86';
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          onProductChange(payload);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    return () => {
      channel.unsubscribe();
      this.channels.delete(channelName);
    };
  }

  subscribeGlobalPOSRealtime(callbacks: GlobalRealtimeCallbacks): () => void {
    return subscribeGlobalPOSRealtimeChannel(
      this.channels,
      this.globalPosListeners,
      callbacks,
      (channelName) => this.scheduleChannelReconnect(channelName)
    );
  }

  async broadcastTableTransfer(payload: TableTransferPayload): Promise<void> {
    const channel = this.channels.get('pos_global_sync') || supabase.channel('pos_global_sync');
    await this.safeSend(channel, {
      type: 'broadcast',
      event: 'station:table_transferred',
      payload,
    });
  }

  async broadcastPosSync(reason: string): Promise<void> {
    try {
      let channel = this.channels.get('pos_global_sync');
      if (!channel) {
        channel = supabase.channel('pos_global_sync');
        channel.subscribe();
        this.channels.set('pos_global_sync', channel);
      }
      await this.safeSend(channel, {
        type: 'broadcast',
        event: 'pos:sync_needed',
        payload: { reason, timestamp: new Date().toISOString() },
      });
    } catch {
      // Non-fatal if offline
    }
  }

  async broadcastBuzzout(payload: BuzzoutPayload): Promise<void> {
    const channel = supabase.channel('foh:runner_buzzout');
    await this.safeSend(channel, {
      type: 'broadcast',
      event: 'foh:buzzout',
      payload,
    });
  }

  subscribeChatMessages(callbacks: ChatRealtimeCallbacks): () => void {
    return subscribeChatMessagesChannel(this.channels, callbacks);
  }

  async trackChatPresence(user: {
    id: string;
    displayName?: string;
    role?: string;
  }): Promise<void> {
    return trackChatPresenceOnChannel(this.channels, user);
  }

  async broadcastChatMessage(payload: any): Promise<void> {
    return broadcastChatMessageOnChannel(this.channels, this.safeSend.bind(this), payload);
  }

  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }
}

export const realtimeGateway = new RealtimeGateway();
