import { useMemo } from 'react';
import {
  TableItem,
  ChannelCategory,
  TakeoutOrder,
  OnlineDeliveryOrder,
} from '../../mockData';
import { StatusFilter } from './UnifiedCommandBar';

export function useFloorFilters(
  tables: TableItem[],
  takeoutOrders: TakeoutOrder[],
  onlineOrders: OnlineDeliveryOrder[],
  selectedChannel: ChannelCategory,
  selectedStatus: StatusFilter
) {
  // Channel Counts
  const channelCounts = useMemo(() => {
    return {
      all: tables.length + takeoutOrders.length + onlineOrders.length,
      cafe: tables.filter((t) => t.area === 'cafe').length,
      bar: tables.filter((t) => t.area === 'bar').length,
      takeout: takeoutOrders.filter((t) => t.status !== 'completed').length,
      online: onlineOrders.filter((o) => o.status !== 'completed').length,
    };
  }, [tables, takeoutOrders, onlineOrders]);

  // Status Counts for active channel
  const statusCounts = useMemo(() => {
    let relevantTables = tables;
    if (selectedChannel === 'cafe') {
      relevantTables = tables.filter((t) => t.area === 'cafe');
    } else if (selectedChannel === 'bar') {
      relevantTables = tables.filter((t) => t.area === 'bar');
    }

    return {
      all: relevantTables.length,
      empty: relevantTables.filter((t) => t.status === 'empty').length,
      occupied: relevantTables.filter((t) => t.status === 'occupied').length,
      preparing: relevantTables.filter((t) => t.status === 'preparing').length,
      ready: relevantTables.filter((t) => t.status === 'ready').length,
      served: relevantTables.filter((t) => t.status === 'served').length,
    };
  }, [tables, selectedChannel]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    if (selectedChannel === 'takeout' || selectedChannel === 'online') {
      return [];
    }
    return tables.filter((table) => {
      if (selectedChannel !== 'all' && table.area !== selectedChannel) {
        return false;
      }
      if (selectedStatus !== 'all' && table.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [tables, selectedChannel, selectedStatus]);

  // Filtered Takeout Orders
  const filteredTakeoutOrders = useMemo(() => {
    if (selectedChannel === 'cafe' || selectedChannel === 'bar') {
      return [];
    }
    return takeoutOrders.filter((o) => {
      if (o.status === 'completed') return false;
      if (selectedStatus === 'preparing' && o.status !== 'preparing') return false;
      if (selectedStatus === 'ready' && o.status !== 'ready') return false;
      if (
        selectedStatus === 'empty' ||
        selectedStatus === 'occupied' ||
        selectedStatus === 'served'
      )
        return false;
      return true;
    });
  }, [takeoutOrders, selectedChannel, selectedStatus]);

  // Filtered Online Orders
  const filteredOnlineOrders = useMemo(() => {
    if (selectedChannel === 'cafe' || selectedChannel === 'bar') {
      return [];
    }
    return onlineOrders.filter((o) => {
      if (o.status === 'completed') return false;
      if (selectedStatus === 'preparing' && o.status !== 'preparing') return false;
      if (selectedStatus === 'ready' && o.status !== 'ready') return false;
      if (
        selectedStatus === 'empty' ||
        selectedStatus === 'occupied' ||
        selectedStatus === 'served'
      )
        return false;
      return true;
    });
  }, [onlineOrders, selectedChannel, selectedStatus]);

  return {
    channelCounts,
    statusCounts,
    filteredTables,
    filteredTakeoutOrders,
    filteredOnlineOrders,
  };
}
