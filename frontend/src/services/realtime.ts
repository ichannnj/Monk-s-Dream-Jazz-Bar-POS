/**
 * Realtime Subscriptions & Station Event Gateway
 * Monk's Dream Jazz Bar POS (Supabase BaaS)
 *
 * Provides real-time subscriptions for:
 * - Station routing (bar & kitchen KDS)
 * - FOH buzzout alerts (order complete / ready to serve)
 * - Auto-86 product availability broadcasts
 * - Floor table occupancy and tab transfer notifications
 * - Cash drawer transactions
 */
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface StationOrderPayload {
  orderItemId: string;
  orderId: string;
  productId: string;
  quantity: number;
  stationTarget: 'bar' | 'kitchen';
  status: string;
  notes?: string;
}

export interface TableOccupancyPayload {
  tableId: string;
  tableNumber: string;
  isOccupied: boolean;
}

export interface Auto86Payload {
  productId: string;
  name: string;
  auto86: boolean;
  outOfStockReason?: string;
}

export interface BuzzoutPayload {
  orderId: string;
  tableNumber?: string;
  customerName?: string;
  orderType: string;
  readyItemsCount: number;
  totalItemsCount: number;
}

export class RealtimeGateway {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Subscribe to station-specific order items (KDS screens).
   * @param station 'bar' | 'kitchen'
   * @param onOrderChange Callback invoked on INSERT/UPDATE/DELETE
   */
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

  /**
   * Subscribe to FOH Runner Buzzout broadcast and ready order notifications.
   */
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

  /**
   * Subscribe to Table occupancy and floor transfer events.
   */
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
        },
        (payload) => {
          onTableChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'table_transfer_logs',
        },
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

  /**
   * Subscribe to Auto-86 product availability updates across all floor tablets.
   */
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

  /**
   * Broadcast an FOH buzzout notification when all items on an order reach READY status.
   */
  async broadcastBuzzout(payload: BuzzoutPayload): Promise<void> {
    const channel = supabase.channel('foh:runner_buzzout');
    await channel.send({
      type: 'broadcast',
      event: 'foh:buzzout',
      payload,
    });
  }

  /**
   * Unsubscribe from all active channels.
   */
  unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      channel.unsubscribe();
    });
    this.channels.clear();
  }
}

export const realtimeGateway = new RealtimeGateway();
