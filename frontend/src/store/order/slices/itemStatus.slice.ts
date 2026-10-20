import { CustomerTab, FloorAlert } from '../../../types/floor';
import { ordersApi } from '../../../services/orders.api';
import { deriveTabTotal, deriveTableStatus } from '../order.helpers';
import { OrderStoreSet, OrderStoreGet } from '../order.types';

export const createItemStatusSlice = (set: OrderStoreSet, _get: OrderStoreGet) => ({
  updateOrderItemStatus: (
    itemId: string,
    newStatus: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  ) => {
    set((state) => {
      // 1. Update items in Tables
      const updatedTables = state.tables.map((table) => {
        let hasItem = false;
        const updatedTabs = (table.tabs || []).map((tab) => {
          const updatedItems = tab.items.map((item) => {
            if (item.id === itemId) {
              hasItem = true;
              return { ...item, status: newStatus };
            }
            return item;
          });
          return { ...tab, items: updatedItems };
        });

        if (!hasItem) return table;

        return {
          ...table,
          tabs: updatedTabs,
          status: deriveTableStatus(table.activeTabs.length > 0, updatedTabs),
        };
      });

      // 2. Update items in Takeout orders
      const updatedTakeout = state.takeoutOrders.map((order) => {
        const updatedItems = order.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        );
        const activeItems = updatedItems.filter((i) => i.status !== 'cancelled');
        const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'ready');
        return {
          ...order,
          items: updatedItems,
          status: allReady ? ('ready' as const) : order.status,
        };
      });

      // 3. Update items in Online delivery orders
      const updatedOnline = state.onlineOrders.map((order) => {
        const updatedItems = order.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        );
        const activeItems = updatedItems.filter((i) => i.status !== 'cancelled');
        const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'ready');
        return {
          ...order,
          items: updatedItems,
          status: allReady ? ('ready' as const) : order.status,
        };
      });

      return {
        tables: updatedTables,
        takeoutOrders: updatedTakeout,
        onlineOrders: updatedOnline,
      };
    });

    // Background update to Supabase
    ordersApi.updateOrderItemStatus(itemId, newStatus);
  },

  markRoundServed: (
    tableId: string,
    tabIndex: number,
    roundNumber: number,
    stationTarget?: 'bar' | 'kitchen'
  ) => {
    const itemIdsToUpdate: string[] = [];

    set((state) => {
      const updatedTables = state.tables.map((table) => {
        if (table.id !== tableId) return table;

        const updatedTabs = (table.tabs || []).map((tab) => {
          if (tab.tabIndex !== tabIndex) return tab;

          const updatedItems = tab.items.map((item) => {
            const matchesRound = (item.roundNumber || 1) === roundNumber;
            const matchesStation = !stationTarget || item.stationTarget === stationTarget;
            if (
              matchesRound &&
              matchesStation &&
              item.status !== 'cancelled' &&
              item.status !== 'served'
            ) {
              itemIdsToUpdate.push(item.id);
              return { ...item, status: 'served' as const };
            }
            return item;
          });

          return { ...tab, items: updatedItems };
        });

        return {
          ...table,
          tabs: updatedTabs,
          status: deriveTableStatus(table.activeTabs.length > 0, updatedTabs),
        };
      });

      return { tables: updatedTables };
    });

    itemIdsToUpdate.forEach((id) => {
      ordersApi.updateOrderItemStatus(id, 'served');
    });
  },

  markTakeoutServed: (orderId: string) => {
    const itemIdsToUpdate: string[] = [];

    set((state) => {
      const updatedTakeout = state.takeoutOrders.map((order) => {
        if (order.id !== orderId) return order;
        const updatedItems = order.items.map((i) => {
          if (i.status !== 'cancelled') {
            itemIdsToUpdate.push(i.id);
            return { ...i, status: 'served' as const };
          }
          return i;
        });
        return {
          ...order,
          items: updatedItems,
          status: 'completed' as const,
        };
      });
      return { takeoutOrders: updatedTakeout };
    });

    itemIdsToUpdate.forEach((id) => {
      ordersApi.updateOrderItemStatus(id, 'served');
    });
  },

  markOnlineServed: (orderId: string) => {
    const itemIdsToUpdate: string[] = [];

    set((state) => {
      const updatedOnline = state.onlineOrders.map((order) => {
        if (order.id !== orderId) return order;
        const updatedItems = order.items.map((i) => {
          if (i.status !== 'cancelled') {
            itemIdsToUpdate.push(i.id);
            return { ...i, status: 'served' as const };
          }
          return i;
        });
        return {
          ...order,
          items: updatedItems,
          status: 'completed' as const,
        };
      });
      return { onlineOrders: updatedOnline };
    });

    itemIdsToUpdate.forEach((id) => {
      ordersApi.updateOrderItemStatus(id, 'served');
    });
  },

  voidOrderItem: async (
    itemId: string,
    staffId: string,
    reason: string,
    tableId?: string,
    tabIndex?: number
  ): Promise<boolean> => {
    let cancelledItemName = 'Item';

    set((state) => {
      // 1. Update Tables
      const updatedTables = state.tables.map((table) => {
        if (tableId && table.id !== tableId) return table;

        let found = false;
        const updatedTabs = (table.tabs || []).map((tab) => {
          if (tabIndex !== undefined && tab.tabIndex !== tabIndex) return tab;

          const updatedItems = tab.items.map((item) => {
            if (item.id === itemId) {
              found = true;
              cancelledItemName = item.productName;
              return {
                ...item,
                status: 'cancelled' as const,
                voidReason: reason,
              };
            }
            return item;
          });

          if (!found) return tab;

          const updatedTab: CustomerTab = {
            ...tab,
            items: updatedItems,
          };
          updatedTab.totalAmount = deriveTabTotal(updatedTab);
          return updatedTab;
        });

        if (!found) return table;

        const tableTotal = updatedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
        return {
          ...table,
          tabs: updatedTabs,
          totalAmount: tableTotal,
          status: deriveTableStatus(table.activeTabs.length > 0, updatedTabs),
        };
      });

      // 2. Update Takeout
      const updatedTakeout = state.takeoutOrders.map((order) => {
        let found = false;
        const updatedItems = order.items.map((item) => {
          if (item.id === itemId) {
            found = true;
            cancelledItemName = item.productName;
            return { ...item, status: 'cancelled' as const, voidReason: reason };
          }
          return item;
        });
        if (!found) return order;

        const activeItems = updatedItems.filter((i) => i.status !== 'cancelled');
        const newTotal = activeItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
        const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'ready');
        return {
          ...order,
          items: updatedItems,
          total: newTotal,
          status: allReady ? ('ready' as const) : order.status,
        };
      });

      // 3. Update Online
      const updatedOnline = state.onlineOrders.map((order) => {
        let found = false;
        const updatedItems = order.items.map((item) => {
          if (item.id === itemId) {
            found = true;
            cancelledItemName = item.productName;
            return { ...item, status: 'cancelled' as const, voidReason: reason };
          }
          return item;
        });
        if (!found) return order;

        const activeItems = updatedItems.filter((i) => i.status !== 'cancelled');
        const newTotal = activeItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
        const allReady = activeItems.length > 0 && activeItems.every((i) => i.status === 'ready');
        return {
          ...order,
          items: updatedItems,
          total: newTotal,
          status: allReady ? ('ready' as const) : order.status,
        };
      });

      const newAlert: FloorAlert = {
        id: `alt-void-${Date.now()}`,
        title: `🚨 Item Voided: ${cancelledItemName}`,
        description: `${cancelledItemName} cancelled. Reason: ${reason}. Restoral/waste logged.`,
        type: 'spoilage_alert',
        time: 'Just now',
        isRead: false,
      };

      return {
        tables: updatedTables,
        takeoutOrders: updatedTakeout,
        onlineOrders: updatedOnline,
        alerts: [newAlert, ...state.alerts],
      };
    });

    try {
      await ordersApi.cancelOrderItem(itemId, staffId, reason);
      return true;
    } catch (err) {
      console.warn('cancelOrderItem network/db error (mutation preserved in UI):', err);
      return false;
    }
  },
});
