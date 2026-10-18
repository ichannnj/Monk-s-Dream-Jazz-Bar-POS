import { create } from 'zustand';
import { HybridLogicalClock } from '@monks/shared';
import {
  TableItem,
  TakeoutOrder,
  OnlineDeliveryOrder,
  CheckItem,
  DrawerEntry,
  FloorAlert,
  ChatMessage,
  OrderLineItem,
  CustomerTab,
} from '../types/floor';
import { supabase } from '../services/supabase';
import { ordersApi } from '../services/orders.api';
import { tablesApi } from '../services/tables.api';
import { realtimeGateway } from '../services/realtime';

export interface QueuedMutation {
  id: string;
  hlc: string;
  type: 'create_order' | 'transfer_table' | 'settle_tab' | 'update_status';
  payload: any;
  timestamp: number;
}

const posHlc = new HybridLogicalClock(`pos-node-${Math.random().toString(36).substring(2, 7)}`);

interface OrderState {
  tables: TableItem[];
  takeoutOrders: TakeoutOrder[];
  onlineOrders: OnlineDeliveryOrder[];
  checks: CheckItem[];
  drawerEntries: DrawerEntry[];
  alerts: FloorAlert[];
  chatMessages: ChatMessage[];
  isHydrated: boolean;
  offlineQueue: QueuedMutation[];

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
    status: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
  ) => void;
  voidOrderItem: (
    itemId: string,
    staffId: string,
    reason: string,
    tableId?: string,
    tabIndex?: number
  ) => Promise<boolean>;
  hydrateFromSupabase: () => Promise<void>;
  drainOfflineQueue: () => Promise<void>;
  initRealtimeSync: () => () => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  tables: [],
  takeoutOrders: [],
  onlineOrders: [],
  checks: [],
  drawerEntries: [],
  alerts: [],
  chatMessages: [],
  isHydrated: false,
  offlineQueue: [],

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
    // 1. Calculate current round number
    const existingTable = get().tables.find((t) => t.id === tableId);
    const existingTab = existingTable?.tabs?.find((t) => t.tabIndex === tabIndex);
    const existingItems = existingTab?.items || [];
    const maxRound =
      existingItems.length > 0 ? Math.max(1, ...existingItems.map((i) => i.roundNumber || 1)) : 0;
    const currentRound = maxRound + 1;

    const roundTaggedItems = items.map((i) => ({
      ...i,
      roundNumber: currentRound,
      status: i.status || 'pending',
    }));

    set((state) => {
      let itemsTotal = 0;
      roundTaggedItems.forEach((item) => {
        itemsTotal += item.unitPrice * item.quantity;
      });
      if (hasCorkageFee) itemsTotal += corkageAmount;

      const updatedTables = state.tables.map((table) => {
        if (table.id !== tableId) return table;

        const updatedTabs = (table.tabs || []).map((tab) => {
          if (tab.tabIndex !== tabIndex) return tab;

          const updatedItems = [...tab.items, ...roundTaggedItems];
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
        title: `🚀 Order Sent for Table ${targetTable?.code || tableId} (Round ${currentRound})`,
        description: `Round ${currentRound}: ${items.length} items dispatched to Bar/Kitchen stations. Chit printed.`,
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

    // Background asynchronous Supabase persistence
    const currentTable = get().tables.find((t) => t.id === tableId);
    const currentTab = currentTable?.tabs?.find((t) => t.tabIndex === tabIndex);
    const mutationId = `mut-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const hlcTs = posHlc.now();

    ordersApi
      .createOrderWithItems({
        tabId: currentTab?.id || `tab-${tableId}-${tabIndex}`,
        tableId: tableId,
        customerName: currentTab?.guestName || `Guest ${tabIndex}`,
        orderNumber: `#${currentTable?.code || 'T'}-${tabIndex}-R${currentRound}-${Date.now().toString().slice(-4)}`,
        orderType: 'DINE_IN',
        hasCorkageFee,
        corkageAmount,
        roundNumber: currentRound,
        items: roundTaggedItems.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          stationTarget: i.stationTarget,
          modifiers: i.modifiers,
          notes: i.notes,
        })),
      })
      .then((res) => {
        if (res.items && res.items.length > 0) {
          set((state) => ({
            tables: state.tables.map((t) => {
              if (t.id !== tableId) return t;
              return {
                ...t,
                tabs: (t.tabs || []).map((tb) => {
                  if (tb.tabIndex !== tabIndex) return tb;
                  return {
                    ...tb,
                    id: res.order.tab_id || tb.id,
                  };
                }),
              };
            }),
          }));
        }
      })
      .catch((err) => {
        console.warn('Background order dispatch deferred to offline queue:', err);
        set((state) => ({
          offlineQueue: [
            ...state.offlineQueue,
            {
              id: mutationId,
              hlc: hlcTs,
              type: 'create_order',
              payload: { tableId, tabIndex, items, hasCorkageFee, corkageAmount },
              timestamp: Date.now(),
            },
          ],
        }));
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

    // Background asynchronous Supabase RPC execution
    const originTable = get().tables.find((t) => t.id === originId);
    const targetTable = get().tables.find((t) => t.id === targetId);
    const tabToMove =
      originTable?.tabs?.find((t) => t.tabIndex === tabIndex) || originTable?.tabs?.[0];

    tablesApi
      .transferTableTab({
        originTableId: originId,
        targetTableId: targetId,
        tabId: tabToMove?.id || '00000000-0000-0000-0000-000000000000',
        staffId: '00000000-0000-0000-0000-000000000001',
        reason: reason || 'Guest relocation request',
      })
      .catch((err) => {
        console.warn('Background transferTableTab offline notice:', err);
      });
  },

  settleTab: (
    tableId,
    tabIndex,
    paymentMethod,
    cashierName = 'Coltrane (Cashier)',
    discountAmount = 0
  ) => {
    let grandTotalPaid = 0;
    let targetTabRef: CustomerTab | undefined;

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return state;

      const targetTab = table.tabs?.find((t) => t.tabIndex === tabIndex);
      targetTabRef = targetTab;
      const subtotal = targetTab?.totalAmount || 0;
      const netSubtotal = Math.max(0, subtotal - discountAmount);
      const tax = netSubtotal * 0.1;
      const grandTotal = netSubtotal + tax;
      grandTotalPaid = grandTotal;

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

    // Background asynchronous Supabase tab settlement
    let dbMethod: 'CASH' | 'CARD' | 'DIGITAL_WALLET' | 'COMP' = 'CASH';
    if (paymentMethod === 'card') dbMethod = 'CARD';
    else if (paymentMethod === 'digital_wallet') dbMethod = 'DIGITAL_WALLET';
    else if (paymentMethod === 'comp') dbMethod = 'COMP';

    tablesApi
      .settleTabAndRecordPayment({
        tabId: targetTabRef?.id || '00000000-0000-0000-0000-000000000000',
        paymentMethod: dbMethod,
        amount: grandTotalPaid,
        discountAmount,
        notes: `Settled by ${cashierName}`,
      })
      .catch((err) => {
        console.warn('Background settleTab offline notice:', err);
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

    // Background update to Supabase
    ordersApi.updateOrderItemStatus(itemId, newStatus);
  },

  voidOrderItem: async (itemId, staffId, reason, tableId, tabIndex) => {
    let cancelledItemName = 'Item';
    let cancelledPrice = 0;

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
              cancelledPrice = item.unitPrice * item.quantity;
              return {
                ...item,
                status: 'cancelled' as const,
                voidReason: reason,
              };
            }
            return item;
          });

          if (!found) return tab;

          const newTotal = Math.max(0, (tab.totalAmount || 0) - cancelledPrice);
          return {
            ...tab,
            items: updatedItems,
            totalAmount: newTotal,
          };
        });

        if (!found) return table;

        const tableTotal = updatedTabs.reduce((acc, cur) => acc + (cur.totalAmount || 0), 0);
        return {
          ...table,
          tabs: updatedTabs,
          totalAmount: tableTotal,
        };
      });

      // 2. Update Takeout
      const updatedTakeout = state.takeoutOrders.map((order) => {
        const updatedItems = order.items.map((item) => {
          if (item.id === itemId) {
            cancelledItemName = item.productName;
            return { ...item, status: 'cancelled' as const, voidReason: reason };
          }
          return item;
        });
        return { ...order, items: updatedItems };
      });

      // 3. Update Online
      const updatedOnline = state.onlineOrders.map((order) => {
        const updatedItems = order.items.map((item) => {
          if (item.id === itemId) {
            cancelledItemName = item.productName;
            return { ...item, status: 'cancelled' as const, voidReason: reason };
          }
          return item;
        });
        return { ...order, items: updatedItems };
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

  hydrateFromSupabase: async () => {
    try {
      const { data: dbTables, error } = await supabase
        .from('tables')
        .select(
          `
          id,
          table_number,
          zone,
          capacity,
          is_occupied,
          tabs (
            id,
            customer_name,
            status,
            order_type,
            corkage_amount,
            has_corkage_fee,
            created_at,
            orders (
              id,
              order_number,
              status,
              order_items (
                id,
                product_id,
                quantity,
                unit_price,
                status,
                station_target,
                modifiers,
                notes,
                products (
                  name,
                  base_price,
                  station_target,
                  image_url
                )
              )
            )
          )
        `
        )
        .order('table_number', { ascending: true });

      if (error || !dbTables || dbTables.length === 0) {
        console.warn('Hydration skipped / database empty, keeping baseline state:', error?.message);
        return;
      }

      const mappedTables: TableItem[] = dbTables.map((dbt: any) => {
        const rawTabs = dbt.tabs || [];
        const openTabs = rawTabs.filter((tb: any) => tb.status === 'OPEN');
        const activeTabsIndices = openTabs.map((_: any, idx: number) => idx + 1);

        const customerTabs: CustomerTab[] = openTabs.map((tb: any, idx: number) => {
          const rawOrders = tb.orders || [];
          const lineItems: OrderLineItem[] = rawOrders.flatMap((o: any) =>
            (o.order_items || []).map((oi: any) => ({
              id: oi.id,
              productId: oi.product_id,
              productName: oi.products?.name || 'Menu Item',
              unitPrice: parseFloat(oi.unit_price) || 0,
              quantity: oi.quantity || 1,
              stationTarget: (oi.station_target || oi.products?.station_target || 'bar') as
                'bar' | 'kitchen',
              modifiers: Array.isArray(oi.modifiers) ? oi.modifiers : [],
              notes: oi.notes || undefined,
              status: (oi.status || 'PENDING').toLowerCase() as any,
              roundNumber: o.round_number || 1,
            }))
          );

          const itemsSum = lineItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
          const corkage = parseFloat(tb.corkage_amount) || 0;

          return {
            id: tb.id,
            tabIndex: idx + 1,
            guestName: tb.customer_name || `Guest ${idx + 1}`,
            status: 'open',
            hasCorkageFee: tb.has_corkage_fee,
            corkageAmount: corkage,
            items: lineItems,
            totalAmount: itemsSum + corkage,
            openedAt: tb.created_at
              ? new Date(tb.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Open',
          };
        });

        const totalTableAmount = customerTabs.reduce((acc, cur) => acc + cur.totalAmount, 0);

        // Determine table preparation status
        const allItems = customerTabs.flatMap((t) => t.items);
        let tableStatus: TableItem['status'] = dbt.is_occupied ? 'occupied' : 'empty';
        if (allItems.length > 0) {
          if (allItems.every((i) => i.status === 'served')) {
            tableStatus = 'served';
          } else if (allItems.every((i) => i.status === 'ready')) {
            tableStatus = 'ready';
          } else if (allItems.some((i) => i.status === 'preparing')) {
            tableStatus = 'preparing';
          }
        }

        const isBar = dbt.zone === 'BAR_AREA' || dbt.table_number.toLowerCase().includes('bar');

        return {
          id: dbt.id,
          code: dbt.table_number,
          area: isBar ? 'bar' : 'cafe',
          seats: dbt.capacity || 4,
          guests: dbt.is_occupied ? Math.max(1, customerTabs.length) : 0,
          status: tableStatus,
          elapsedTime: dbt.is_occupied ? '10m' : '0m',
          hasOpenCheck: dbt.is_occupied,
          activeTabs: activeTabsIndices,
          maxTabs: dbt.capacity || 4,
          isMyTable: false,
          tabs: customerTabs,
          totalAmount: dbt.is_occupied ? totalTableAmount : undefined,
        };
      });

      // Also fetch Takeout and Online Delivery tabs
      const { data: nonDineInTabs } = await supabase
        .from('tabs')
        .select(
          `
          id,
          customer_name,
          status,
          order_type,
          order_channel,
          rider_name,
          external_order_ref,
          corkage_amount,
          has_corkage_fee,
          created_at,
          orders (
            id,
            order_number,
            round_number,
            status,
            order_items (
              id,
              product_id,
              quantity,
              unit_price,
              status,
              station_target,
              modifiers,
              notes,
              products (
                name,
                base_price,
                station_target,
                image_url
              )
            )
          )
        `
        )
        .in('order_type', ['TAKEOUT', 'ONLINE_DELIVERY']);

      const dbTakeout: TakeoutOrder[] = [];
      const dbOnline: OnlineDeliveryOrder[] = [];

      (nonDineInTabs || []).forEach((t: any) => {
        const rawOrders = t.orders || [];
        const lineItems: OrderLineItem[] = rawOrders.flatMap((o: any) =>
          (o.order_items || []).map((oi: any) => ({
            id: oi.id,
            productId: oi.product_id,
            productName: oi.products?.name || 'Menu Item',
            unitPrice: parseFloat(oi.unit_price) || 0,
            quantity: oi.quantity || 1,
            stationTarget: (oi.station_target || oi.products?.station_target || 'bar') as
              'bar' | 'kitchen',
            modifiers: Array.isArray(oi.modifiers) ? oi.modifiers : [],
            notes: oi.notes || undefined,
            status: (oi.status || 'PENDING').toLowerCase() as any,
            roundNumber: o.round_number || 1,
          }))
        );

        const itemsTotal = lineItems.reduce((acc, cur) => acc + cur.unitPrice * cur.quantity, 0);
        const orderStatus =
          lineItems.every((i) => i.status === 'ready' || i.status === 'served') &&
          lineItems.length > 0
            ? 'ready'
            : lineItems.every((i) => i.status === 'served') && lineItems.length > 0
              ? 'completed'
              : 'preparing';

        if (t.order_type === 'TAKEOUT') {
          dbTakeout.push({
            id: t.id,
            ticketNumber: t.orders?.[0]?.order_number || 'T-100',
            customerName: t.customer_name || 'Takeout Customer',
            items: lineItems,
            total: itemsTotal,
            status: orderStatus as any,
            elapsedTime: '5m',
            isPrepaid: true,
          });
        } else if (t.order_type === 'ONLINE_DELIVERY') {
          const platform = t.order_channel === 'FOODPANDA' ? 'foodpanda' : 'grabfood';
          dbOnline.push({
            id: t.id,
            platform,
            platformOrderRef: t.external_order_ref || t.orders?.[0]?.order_number || 'ONL-101',
            riderName: t.rider_name || 'Assigned Driver',
            customerName: t.customer_name || 'Delivery Customer',
            items: lineItems,
            total: itemsTotal,
            status: orderStatus as any,
            elapsedTime: '7m',
            paymentStatus: platform === 'foodpanda' ? 'PAID_ONLINE_FOODPANDA' : 'PAID_ONLINE_GRAB',
          });
        }
      });

      set({
        tables: mappedTables,
        takeoutOrders: dbTakeout,
        onlineOrders: dbOnline,
        isHydrated: true,
      });
    } catch (err) {
      console.warn('hydrateFromSupabase error:', err);
    }
  },

  drainOfflineQueue: async () => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return;

    const remainingQueue: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'create_order') {
          await ordersApi.createOrderWithItems(item.payload);
        } else if (item.type === 'transfer_table') {
          await tablesApi.transferTableTab(item.payload);
        } else if (item.type === 'settle_tab') {
          await tablesApi.settleTabAndRecordPayment(item.payload);
        } else if (item.type === 'update_status') {
          await ordersApi.updateOrderItemStatus(item.payload.itemId, item.payload.status);
        }
      } catch {
        remainingQueue.push(item);
      }
    }

    set({ offlineQueue: remainingQueue });
  },

  initRealtimeSync: () => {
    // 1. Initial live hydration and offline queue drain
    get().hydrateFromSupabase();
    get().drainOfflineQueue();

    // 2. Subscribe to centralized global realtime channels
    const unsub = realtimeGateway.subscribeGlobalPOSRealtime({
      onTableChange: (payload) => {
        if (payload.new) {
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

      onTabChange: (payload) => {
        if (payload.new && (payload.new.status === 'BILLED' || payload.new.status === 'CLOSED')) {
          const tabId = payload.new.id;
          set((state) => ({
            tables: state.tables.map((t) => ({
              ...t,
              tabs: (t.tabs || []).map((tab) =>
                tab.id === tabId ? { ...tab, status: 'billed' as const } : tab
              ),
            })),
          }));
        }
      },

      onOrderItemChange: (payload) => {
        const item = payload.new;
        if (!item) return;

        const itemId = item.id;
        const newStatus = (item.status || 'pending').toLowerCase() as any;

        set((state) => {
          // A. Update in Tables
          const updatedTables = state.tables.map((table) => {
            let tableModified = false;
            const updatedTabs = (table.tabs || []).map((tab) => {
              const itemIdx = tab.items.findIndex((i) => i.id === itemId);
              if (itemIdx >= 0) {
                tableModified = true;
                const itemsCopy = [...tab.items];
                itemsCopy[itemIdx] = { ...itemsCopy[itemIdx], status: newStatus };
                return { ...tab, items: itemsCopy };
              }
              return tab;
            });

            if (!tableModified) return table;

            const allItems = updatedTabs.flatMap((t) => t.items);
            let nextStatus = table.status;
            if (allItems.length > 0) {
              if (allItems.every((i) => i.status === 'served')) {
                nextStatus = 'served';
              } else if (allItems.every((i) => i.status === 'ready')) {
                nextStatus = 'ready';
              } else if (allItems.some((i) => i.status === 'preparing')) {
                nextStatus = 'preparing';
              }
            }

            return {
              ...table,
              status: nextStatus,
              tabs: updatedTabs,
            };
          });

          // B. Update in Takeout
          const updatedTakeout = state.takeoutOrders.map((order) => {
            const itemIdx = order.items.findIndex((i) => i.id === itemId);
            if (itemIdx >= 0) {
              const itemsCopy = [...order.items];
              itemsCopy[itemIdx] = { ...itemsCopy[itemIdx], status: newStatus };
              return {
                ...order,
                items: itemsCopy,
                status: itemsCopy.every((i) => i.status === 'ready')
                  ? ('ready' as const)
                  : order.status,
              };
            }
            return order;
          });

          // C. Update in Online
          const updatedOnline = state.onlineOrders.map((order) => {
            const itemIdx = order.items.findIndex((i) => i.id === itemId);
            if (itemIdx >= 0) {
              const itemsCopy = [...order.items];
              itemsCopy[itemIdx] = { ...itemsCopy[itemIdx], status: newStatus };
              return {
                ...order,
                items: itemsCopy,
                status: itemsCopy.every((i) => i.status === 'ready')
                  ? ('ready' as const)
                  : order.status,
              };
            }
            return order;
          });

          return {
            tables: updatedTables,
            takeoutOrders: updatedTakeout,
            onlineOrders: updatedOnline,
          };
        });

        // If item was an INSERT from another tablet, re-hydrate to retrieve complete order data
        if (payload.eventType === 'INSERT') {
          get().hydrateFromSupabase();
        }
      },

      onTransferLog: (payload) => {
        if (payload.new) {
          get().addAlert({
            title: 'Table Transferred',
            description: `Tab re-routed from origin table. Reason: ${payload.new.reason || 'Floor rearrangement'}`,
            type: 'transfer',
            targetRef: payload.new.tab_id,
          });
          get().hydrateFromSupabase();
        }
      },

      onProductChange: (payload) => {
        if (payload.new && payload.new.auto_86) {
          get().addAlert({
            title: 'Product Auto-86',
            description: `${payload.new.name} is now 86'd (${payload.new.out_of_stock_reason || 'Depleted'}).`,
            type: 'auto_86',
            targetRef: payload.new.id,
          });
        }
      },

      onBuzzout: (buzzoutPayload) => {
        get().addAlert({
          title: 'Order Ready for Runner',
          description: `Order for ${buzzoutPayload.customerName || buzzoutPayload.tableNumber || 'Guest'} is completely prepared.`,
          type: 'station_ready',
          targetRef: buzzoutPayload.orderId,
        });
      },

      onCashDrawerChange: (payload) => {
        if (payload.new) {
          const entry = payload.new;
          get().addDrawerEntry(
            (entry.action_type || 'sale').toLowerCase() as any,
            parseFloat(entry.amount) || 0,
            entry.reason || 'Cash movement',
            'Staff'
          );
        }
      },
    });

    return () => {
      unsub();
    };
  },
}));
