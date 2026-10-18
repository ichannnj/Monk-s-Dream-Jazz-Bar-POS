import { create } from 'zustand';
import {
  TableItem,
  SEED_TABLES,
  TakeoutOrder,
  SEED_TAKEOUT_ORDERS,
  OnlineDeliveryOrder,
  SEED_ONLINE_ORDERS,
  CheckItem,
  SEED_CHECKS,
  DrawerEntry,
  SEED_DRAWER_TRANSACTIONS,
  FloorAlert,
  SEED_ALERTS,
  ChatMessage,
  SEED_CHAT_MESSAGES,
  OrderLineItem,
  CustomerTab,
} from '../mockData';

interface OrderState {
  tables: TableItem[];
  takeoutOrders: TakeoutOrder[];
  onlineOrders: OnlineDeliveryOrder[];
  checks: CheckItem[];
  drawerEntries: DrawerEntry[];
  alerts: FloorAlert[];
  chatMessages: ChatMessage[];

  // Action methods
  openTableTab: (tableId: string, guestName: string, guestCount?: number) => void;
  addItemsToTab: (
    tableId: string,
    tabIndex: number,
    items: OrderLineItem[],
    hasCorkageFee?: boolean,
    corkageAmount?: number
  ) => void;
  transferTableOrTab: (
    originId: string,
    targetId: string,
    mode: 'entire' | 'tab',
    tabIndex?: number,
    reason?: string
  ) => void;
  settleTab: (
    tableId: string,
    tabIndex: number,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string,
    discountAmount?: number
  ) => void;
  settleTableGroup: (
    tableId: string,
    paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp',
    cashierName?: string
  ) => void;
  createTakeoutOrder: (
    customerName: string,
    items: OrderLineItem[],
    isPrepaid?: boolean,
    notes?: string
  ) => TakeoutOrder;
  updateTakeoutStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => void;
  createOnlineOrder: (
    platform: 'grabfood' | 'foodpanda',
    platformOrderRef: string,
    riderName: string,
    customerName: string,
    items: OrderLineItem[]
  ) => OnlineDeliveryOrder;
  updateOnlineStatus: (id: string, status: 'preparing' | 'ready' | 'completed') => void;
  addDrawerEntry: (
    type: 'float' | 'cash_in' | 'cash_out' | 'drop' | 'sale',
    amount: number,
    reason: string,
    performedBy: string
  ) => void;
  addChatMessage: (
    channel: 'all' | 'bar' | 'kitchen',
    message: string,
    senderName: string,
    senderRole: string
  ) => void;
  markAlertRead: (id: string) => void;
  addAlert: (alert: Omit<FloorAlert, 'id' | 'time' | 'isRead'>) => void;
  updateOrderItemStatus: (
    itemId: string,
    status: 'pending' | 'preparing' | 'ready' | 'served'
  ) => void;
  initRealtimeSync: () => () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  tables: SEED_TABLES,
  takeoutOrders: SEED_TAKEOUT_ORDERS,
  onlineOrders: SEED_ONLINE_ORDERS,
  checks: SEED_CHECKS,
  drawerEntries: SEED_DRAWER_TRANSACTIONS,
  alerts: SEED_ALERTS,
  chatMessages: SEED_CHAT_MESSAGES,

  openTableTab: (tableId, guestName, guestCount = 1) => {
    set((state) => {
      const updatedTables = state.tables.map((t) => {
        if (t.id !== tableId) return t;

        const nextTabIndex = t.activeTabs.length > 0 ? Math.max(...t.activeTabs) + 1 : 1;
        const newTab: CustomerTab = {
          id: `tab-${tableId}-${nextTabIndex}`,
          tabIndex: nextTabIndex,
          guestName: guestName.trim() || `Guest ${nextTabIndex}`,
          status: 'open',
          totalAmount: 0,
          items: [],
          openedAt: 'Just now',
        };

        const existingTabs = t.tabs || [];
        const nextTabs = [...existingTabs, newTab];
        const nextActiveTabs = [...t.activeTabs, nextTabIndex];

        return {
          ...t,
          status: 'occupied' as const,
          guests: t.guests > 0 ? t.guests + guestCount : guestCount,
          hasOpenCheck: true,
          activeTabs: nextActiveTabs,
          maxTabs: Math.max(t.maxTabs || 1, nextTabIndex, nextActiveTabs.length, t.seats || 1),
          tabs: nextTabs,
          elapsedTime: t.status === 'empty' ? '1m' : t.elapsedTime,
        };
      });

      return { tables: updatedTables };
    });
  },

  addItemsToTab: (tableId, tabIndex, items, hasCorkageFee = false, corkageAmount = 0) => {
    set((state) => {
      let itemsTotal = 0;
      items.forEach((item) => {
        itemsTotal += item.unitPrice * item.quantity;
      });
      if (hasCorkageFee) itemsTotal += corkageAmount;

      const updatedTables = state.tables.map((table) => {
        if (table.id !== tableId) return table;

        const updatedTabs = (table.tabs || []).map((tab) => {
          if (tab.tabIndex !== tabIndex) return tab;

          const updatedItems = [...tab.items, ...items];
          const newTotal = (tab.totalAmount || 0) + itemsTotal;

          return {
            ...tab,
            items: updatedItems,
            totalAmount: newTotal,
            hasCorkageFee: hasCorkageFee || tab.hasCorkageFee,
            corkageAmount: (tab.corkageAmount || 0) + corkageAmount,
          };
        });

        // Compute total amount on table
        const tableTotal = updatedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

        return {
          ...table,
          status: 'preparing' as const,
          totalAmount: tableTotal,
          tabs: updatedTabs,
        };
      });

      // Add station notification
      const targetTable = state.tables.find((t) => t.id === tableId);
      const newAlert: FloorAlert = {
        id: `alt-${Date.now()}`,
        title: `🚀 Order Sent for Table ${targetTable?.code || tableId}`,
        description: `${items.length} items dispatched to Bar/Kitchen stations. Chit #1043 printed.`,
        type: 'station_ready',
        time: 'Just now',
        isRead: false,
        targetRef: targetTable?.code,
      };

      return {
        tables: updatedTables,
        alerts: [newAlert, ...state.alerts],
      };
    });
  },

  transferTableOrTab: (originId, targetId, mode, tabIndex, reason) => {
    set((state) => {
      const origin = state.tables.find((t) => t.id === originId);
      const target = state.tables.find((t) => t.id === targetId);
      if (!origin || !target) return state;

      // Ensure origin has populated tabs array
      const originTabs =
        origin.tabs && origin.tabs.length > 0
          ? origin.tabs
          : origin.activeTabs.map((num) => ({
              id: `tab-${origin.id}-${num}`,
              tabIndex: num,
              guestName: `Guest ${num}`,
              status: 'open' as const,
              totalAmount: (origin.totalAmount || 0) / (origin.activeTabs.length || 1),
              items: [],
            }));

      if (mode === 'entire') {
        const targetExistingTabs = target.tabs || [];
        const targetExistingCount = targetExistingTabs.length;

        const reindexedTransferredTabs = originTabs.map((t, idx) => ({
          ...t,
          id: `tab-${target.id}-${targetExistingCount + idx + 1}`,
          tabIndex: targetExistingCount + idx + 1,
        }));

        const combinedTabs = [...targetExistingTabs, ...reindexedTransferredTabs];
        const combinedActiveTabs = combinedTabs.map((t) => t.tabIndex);
        const combinedAmount = (target.totalAmount || 0) + (origin.totalAmount || 0);

        const updatedTables = state.tables.map((t) => {
          if (t.id === originId) {
            return {
              ...t,
              status: 'empty' as const,
              guests: 0,
              hasOpenCheck: false,
              totalAmount: undefined,
              activeTabs: [],
              tabs: [],
              elapsedTime: '0m',
            };
          }
          if (t.id === targetId) {
            return {
              ...t,
              status: target.status === 'empty' ? origin.status : target.status,
              guests: target.guests + origin.guests,
              hasOpenCheck: true,
              totalAmount: combinedAmount,
              activeTabs: combinedActiveTabs,
              maxTabs: Math.max(
                target.maxTabs || 1,
                combinedActiveTabs.length,
                ...combinedActiveTabs,
                target.seats || 1
              ),
              tabs: combinedTabs,
              assignedStaff: target.assignedStaff || origin.assignedStaff,
              elapsedTime: target.status === 'empty' ? origin.elapsedTime : target.elapsedTime,
            };
          }
          return t;
        });

        const newAlert: FloorAlert = {
          id: `alt-${Date.now()}`,
          title: `🔁 Table Transferred: ${origin.code} ➔ ${target.code}`,
          description: `All open tabs re-routed to Table ${target.code}. Reason: ${
            reason || 'Party relocation'
          }`,
          type: 'transfer',
          time: 'Just now',
          isRead: false,
          targetRef: target.code,
        };

        return {
          tables: updatedTables,
          alerts: [newAlert, ...state.alerts],
        };
      } else {
        // Specific Tab Transfer
        const effectiveTabIndex = tabIndex ?? originTabs[0]?.tabIndex ?? 1;
        const tabToMove = originTabs.find((t) => t.tabIndex === effectiveTabIndex) || originTabs[0];

        if (!tabToMove) return state;

        const remainingOriginTabs = originTabs.filter((t) => t.id !== tabToMove.id);
        const remainingOriginActiveTabs = remainingOriginTabs.map((t) => t.tabIndex);
        const remainingOriginAmount = remainingOriginTabs.reduce(
          (acc, cur) => acc + (cur.totalAmount || 0),
          0
        );

        const targetExistingTabs = target.tabs || [];
        const nextTargetTabIndex =
          targetExistingTabs.length > 0
            ? Math.max(...targetExistingTabs.map((t) => t.tabIndex)) + 1
            : 1;

        const movedTabAdjusted: CustomerTab = {
          ...tabToMove,
          id: `tab-${target.id}-${nextTargetTabIndex}`,
          tabIndex: nextTargetTabIndex,
        };

        const nextTargetTabs = [...targetExistingTabs, movedTabAdjusted];
        const nextTargetActiveTabs = nextTargetTabs.map((t) => t.tabIndex);
        const nextTargetAmount = (target.totalAmount || 0) + tabToMove.totalAmount;

        const updatedTables = state.tables.map((t) => {
          if (t.id === originId) {
            const isEmptyNow = remainingOriginTabs.length === 0;
            return {
              ...t,
              status: isEmptyNow ? ('empty' as const) : t.status,
              guests: isEmptyNow ? 0 : Math.max(1, t.guests - 1),
              hasOpenCheck: !isEmptyNow,
              totalAmount: isEmptyNow ? undefined : remainingOriginAmount,
              activeTabs: remainingOriginActiveTabs,
              tabs: remainingOriginTabs,
              elapsedTime: isEmptyNow ? '0m' : t.elapsedTime,
            };
          }
          if (t.id === targetId) {
            return {
              ...t,
              status: target.status === 'empty' ? ('occupied' as const) : target.status,
              guests: target.status === 'empty' ? 1 : target.guests + 1,
              hasOpenCheck: true,
              totalAmount: nextTargetAmount,
              activeTabs: nextTargetActiveTabs,
              maxTabs: Math.max(
                target.maxTabs || 1,
                nextTargetTabIndex,
                nextTargetActiveTabs.length,
                target.seats || 1
              ),
              tabs: nextTargetTabs,
              assignedStaff: target.assignedStaff || origin.assignedStaff,
              elapsedTime: target.status === 'empty' ? '1m' : target.elapsedTime,
            };
          }
          return t;
        });

        const newAlert: FloorAlert = {
          id: `alt-${Date.now()}`,
          title: `🔁 Tab Moved: "${tabToMove.guestName}" (${origin.code} ➔ ${target.code})`,
          description: `Guest tab transferred. Station tickets re-routed. Reason: ${
            reason || 'Guest relocation request'
          }`,
          type: 'transfer',
          time: 'Just now',
          isRead: false,
          targetRef: target.code,
        };

        return {
          tables: updatedTables,
          alerts: [newAlert, ...state.alerts],
        };
      }
    });
  },

  settleTab: (
    tableId,
    tabIndex,
    paymentMethod,
    cashierName = 'Coltrane (Cashier)',
    discountAmount = 0
  ) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      const targetTab = table.tabs?.find((t) => t.tabIndex === tabIndex);
      const subtotal = targetTab?.totalAmount || 0;
      const netSubtotal = Math.max(0, subtotal - discountAmount);
      const tax = netSubtotal * 0.1;
      const grandTotal = netSubtotal + tax;

      // Create Check record
      const newCheck: CheckItem = {
        id: `chk-${Date.now()}`,
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'dine_in',
        tableOrRef: `Table ${table.code}`,
        guestName: targetTab?.guestName || `Tab #${tabIndex}`,
        itemsCount: targetTab?.items.length || 1,
        subtotal: netSubtotal,
        tax: tax,
        total: grandTotal,
        paymentMethod: paymentMethod,
        status: 'paid',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: cashierName,
        itemsSummary:
          targetTab?.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ') || 'Table Bill',
      };

      // If payment is cash, log to drawer
      let nextDrawer = state.drawerEntries;
      if (paymentMethod === 'cash') {
        const cashDrawerEntry: DrawerEntry = {
          id: `drw-${Date.now()}`,
          type: 'sale',
          amount: grandTotal,
          reason: `Table ${table.code} (${targetTab?.guestName}) Cash Settle`,
          performedBy: cashierName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        nextDrawer = [cashDrawerEntry, ...state.drawerEntries];
      }

      // Update Table state
      const remainingTabs = (table.tabs || []).filter((t) => t.tabIndex !== tabIndex);
      const remainingActiveTabs = table.activeTabs.filter((num) => num !== tabIndex);
      const remainingAmount = remainingTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);

      const updatedTables = state.tables.map((t) => {
        if (t.id !== tableId) return t;

        return {
          ...t,
          activeTabs: remainingActiveTabs,
          tabs: remainingTabs,
          status: remainingActiveTabs.length === 0 ? ('empty' as const) : ('occupied' as const),
          hasOpenCheck: remainingActiveTabs.length > 0,
          totalAmount: remainingActiveTabs.length === 0 ? undefined : remainingAmount,
          guests: remainingActiveTabs.length === 0 ? 0 : Math.max(1, t.guests - 1),
        };
      });

      return {
        tables: updatedTables,
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });
  },

  settleTableGroup: (tableId, paymentMethod, cashierName = 'Coltrane (Cashier)') => {
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      const subtotal = table.totalAmount || 0;
      const tax = subtotal * 0.1;
      const grandTotal = subtotal + tax;

      const allItems: OrderLineItem[] = [];
      table.tabs?.forEach((tab) => allItems.push(...tab.items));

      const newCheck: CheckItem = {
        id: `chk-${Date.now()}`,
        checkNumber: `#${1042 + state.checks.length}`,
        orderType: 'dine_in',
        tableOrRef: `Table ${table.code} (Group Settle)`,
        guestName: table.tabs?.map((t) => t.guestName).join(' & ') || `Table ${table.code}`,
        itemsCount: allItems.length,
        subtotal: subtotal,
        tax: tax,
        total: grandTotal,
        paymentMethod: paymentMethod,
        status: 'paid',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        cashierName: cashierName,
        itemsSummary:
          allItems.map((i) => `${i.quantity}x ${i.productName}`).join(', ') ||
          'Combined Table Bill',
      };

      let nextDrawer = state.drawerEntries;
      if (paymentMethod === 'cash') {
        const cashDrawerEntry: DrawerEntry = {
          id: `drw-${Date.now()}`,
          type: 'sale',
          amount: grandTotal,
          reason: `Table ${table.code} Combined Group Cash Settle`,
          performedBy: cashierName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        };
        nextDrawer = [cashDrawerEntry, ...state.drawerEntries];
      }

      const updatedTables = state.tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          status: 'empty' as const,
          guests: 0,
          hasOpenCheck: false,
          totalAmount: undefined,
          activeTabs: [],
          tabs: [],
          elapsedTime: '0m',
        };
      });

      return {
        tables: updatedTables,
        checks: [newCheck, ...state.checks],
        drawerEntries: nextDrawer,
      };
    });
  },

  createTakeoutOrder: (customerName, items, isPrepaid = true, notes) => {
    const nextTicketNum = `T-${107 + get().takeoutOrders.length}`;
    const itemsTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

    const newOrder: TakeoutOrder = {
      id: `to-${Date.now()}`,
      ticketNumber: nextTicketNum,
      customerName: customerName.trim() || 'Walk-in Guest',
      items: items,
      total: itemsTotal,
      status: 'preparing',
      elapsedTime: '1m',
      isPrepaid: isPrepaid,
      notes: notes,
    };

    set((state) => ({
      takeoutOrders: [newOrder, ...state.takeoutOrders],
      alerts: [
        {
          id: `alt-${Date.now()}`,
          title: `🛍️ New Takeout Order: #${nextTicketNum}`,
          description: `Guest: ${customerName} (${items.length} items to-go). Packaging: To-go cups & boxes.`,
          type: 'station_ready',
          time: 'Just now',
          isRead: false,
          targetRef: nextTicketNum,
        },
        ...state.alerts,
      ],
    }));

    return newOrder;
  },

  updateTakeoutStatus: (id, status) => {
    set((state) => ({
      takeoutOrders: state.takeoutOrders.map((o) => (o.id === id ? { ...o, status } : o)),
    }));
  },

  createOnlineOrder: (platform, platformOrderRef, riderName, customerName, items) => {
    const itemsTotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

    const newOrder: OnlineDeliveryOrder = {
      id: `od-${Date.now()}`,
      platform: platform,
      platformOrderRef: platformOrderRef.trim().toUpperCase(),
      riderName: riderName.trim() || 'Rider Assigned',
      customerName: customerName.trim() || 'Online Customer',
      items: items,
      total: itemsTotal,
      status: 'preparing',
      elapsedTime: '1m',
      paymentStatus: platform === 'grabfood' ? 'PAID_ONLINE_GRAB' : 'PAID_ONLINE_FOODPANDA',
    };

    set((state) => ({
      onlineOrders: [newOrder, ...state.onlineOrders],
      alerts: [
        {
          id: `alt-${Date.now()}`,
          title: `🛵 Online Delivery Entered: ${platformOrderRef}`,
          description: `${platform === 'grabfood' ? 'GrabFood' : 'Foodpanda'} #${platformOrderRef} - Rider: ${riderName}. Bag chit printed.`,
          type: 'station_ready',
          time: 'Just now',
          isRead: false,
          targetRef: platformOrderRef,
        },
        ...state.alerts,
      ],
    }));

    return newOrder;
  },

  updateOnlineStatus: (id, status) => {
    set((state) => ({
      onlineOrders: state.onlineOrders.map((o) => (o.id === id ? { ...o, status } : o)),
    }));
  },

  addDrawerEntry: (type, amount, reason, performedBy) => {
    const newEntry: DrawerEntry = {
      id: `drw-${Date.now()}`,
      type,
      amount,
      reason,
      performedBy,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    set((state) => ({
      drawerEntries: [newEntry, ...state.drawerEntries],
    }));
  },

  addChatMessage: (channel, message, senderName, senderRole) => {
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      channel,
      message,
      senderName,
      senderRole,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    set((state) => ({
      chatMessages: [...state.chatMessages, newMsg],
    }));
  },

  markAlertRead: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
    }));
  },

  addAlert: (alert) => {
    const newAlert: FloorAlert = {
      ...alert,
      id: `alt-${Date.now()}`,
      time: 'Just now',
      isRead: false,
    };
    set((state) => ({
      alerts: [newAlert, ...state.alerts],
    }));
  },

  updateOrderItemStatus: (itemId, newStatus) => {
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

        // Check if all items in table are ready or served
        const allItems = updatedTabs.flatMap((t) => t.items);
        const hasPrep = allItems.some((i) => i.status === 'preparing');
        const hasReady = allItems.some((i) => i.status === 'ready');
        const allServed = allItems.length > 0 && allItems.every((i) => i.status === 'served');

        let nextTableStatus = table.status;
        if (hasReady) {
          nextTableStatus = 'ready';
        } else if (hasPrep) {
          nextTableStatus = 'preparing';
        } else if (allServed) {
          nextTableStatus = 'served';
        }

        return {
          ...table,
          tabs: updatedTabs,
          status: nextTableStatus,
        };
      });

      // 2. Update items in Takeout orders
      const updatedTakeout = state.takeoutOrders.map((order) => {
        const updatedItems = order.items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        );
        const allReady = updatedItems.length > 0 && updatedItems.every((i) => i.status === 'ready');
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
        const allReady = updatedItems.length > 0 && updatedItems.every((i) => i.status === 'ready');
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
  },

  initRealtimeSync: () => {
    // Dynamic import/reference to avoid circular dependencies
    const { realtimeGateway } = require('../services/realtime');

    // 1. Subscribe to Floor table occupancy and transfers
    const unsubFloor = realtimeGateway.subscribeFloorTables(
      (payload: any) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          const updatedTable = payload.new;
          set((state) => ({
            tables: state.tables.map((t) =>
              t.id === updatedTable.id || t.code === updatedTable.table_number
                ? {
                    ...t,
                    status: updatedTable.is_occupied ? 'occupied' : 'empty',
                    hasOpenCheck: updatedTable.is_occupied,
                  }
                : t
            ),
          }));
        }
      },
      (transferLog: any) => {
        if (transferLog.new) {
          get().addAlert({
            title: 'Table Transferred',
            description: `Tab re-routed from origin table. Reason: ${transferLog.new.reason || 'Floor rearrangement'}`,
            type: 'transfer',
            targetRef: transferLog.new.tab_id,
          });
        }
      }
    );

    // 2. Subscribe to Auto-86 updates
    const unsub86 = realtimeGateway.subscribeAuto86((payload: any) => {
      if (payload.new && payload.new.auto_86) {
        get().addAlert({
          title: 'Product Auto-86',
          description: `${payload.new.name} is now 86'd (${payload.new.out_of_stock_reason || 'Depleted'}).`,
          type: 'auto_86',
          targetRef: payload.new.id,
        });
      }
    });

    // 3. Subscribe to Runner Buzzout notifications
    const unsubBuzzout = realtimeGateway.subscribeRunnerBuzzout(
      (buzzoutPayload: any) => {
        get().addAlert({
          title: 'Order Ready for Runner',
          description: `Order for ${buzzoutPayload.customerName || buzzoutPayload.tableNumber || 'Guest'} is completely prepared.`,
          type: 'station_ready',
          targetRef: buzzoutPayload.orderId,
        });
      },
      (itemReadyPayload: any) => {
        get().addAlert({
          title: 'Station Item Ready',
          description: 'An item has reached READY status on the KDS display.',
          type: 'station_ready',
          targetRef: itemReadyPayload.new?.id,
        });
      }
    );

    return () => {
      unsubFloor();
      unsub86();
      unsubBuzzout();
    };
  },
}));
