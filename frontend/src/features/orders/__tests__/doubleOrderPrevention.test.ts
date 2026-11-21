import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { appendOrIncrementCartItem } from '../presentation/order-entry/orderEntryHelpers';
import {
  clearDurableQueue,
  enqueueDurableMutation,
  loadDurableQueue,
  markMutationInFlight,
  clearMutationInFlight,
  isMutationInFlight,
  ensureUuid,
} from '../data/durableQueue';
import { safeStorage } from '../../shared/infrastructure/storage/safeStorage';
import { createTableTabSlice } from '../../table-service/application/tableTab.slice';
import { createHydrationSlice } from '../application/hydration.slice';
import { ordersApi } from '../data/orders.api';
import type { MenuItem, OrderLineItem } from '@/types/floor';

describe('Double-Order Prevention', () => {
  beforeEach(() => {
    safeStorage.clear();
    clearDurableQueue();
    vi.restoreAllMocks();
  });

  it('appendOrIncrementCartItem does not mutate prev cart items or modifiers (StrictMode safe)', () => {
    const menuItem: MenuItem = {
      id: 'prod-1',
      name: 'Cortado',
      category: 'coffee',
      price: 160,
      description: 'Double ristretto',
      stationTarget: 'bar',
      isAvailable: true,
      dietary: [],
      allergens: [],
    };

    const initialCart: OrderLineItem[] = [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Cortado',
        stationTarget: 'bar',
        categorySlug: 'coffee',
        unitPrice: 160,
        quantity: 1,
        status: 'pending',
        modifiers: ['Oat Milk (+₱30.00)', 'Extra Shot (+₱40.00)'],
      },
    ];

    const firstPass = appendOrIncrementCartItem(initialCart, menuItem, undefined, [
      'Extra Shot (+₱40.00)',
      'Oat Milk (+₱30.00)',
    ]);
    const secondPass = appendOrIncrementCartItem(initialCart, menuItem, undefined, [
      'Extra Shot (+₱40.00)',
      'Oat Milk (+₱30.00)',
    ]);

    expect(initialCart[0]!.quantity).toBe(1);
    expect(initialCart[0]!.modifiers).toEqual(['Oat Milk (+₱30.00)', 'Extra Shot (+₱40.00)']);
    expect(firstPass[0]!.quantity).toBe(2);
    expect(secondPass[0]!.quantity).toBe(2);
  });

  it('tracks and clears in-flight mutations accurately', () => {
    expect(isMutationInFlight('mut-test-1')).toBe(false);
    markMutationInFlight('mut-test-1');
    expect(isMutationInFlight('mut-test-1')).toBe(true);
    clearMutationInFlight('mut-test-1');
    expect(isMutationInFlight('mut-test-1')).toBe(false);

    const uuid = ensureUuid('not-a-uuid');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    const preserved = ensureUuid('11111111-1111-4111-8111-111111111111');
    expect(preserved).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('prevents drainOfflineQueue from double-dispatching an in-flight addItemsToTab order', async () => {
    let resolveDispatch!: (value: any) => void;
    const pendingDispatch = new Promise((resolve) => {
      resolveDispatch = resolve;
    });

    const createOrderSpy = vi
      .spyOn(ordersApi, 'createOrderWithItems')
      .mockImplementation(() => pendingDispatch as any);

    const store = create<any>((set, get) => ({
      tables: [
        {
          id: 'tbl-1',
          code: 'C1',
          area: 'cafe',
          seats: 4,
          guests: 2,
          status: 'occupied',
          elapsedTime: '00:01',
          hasOpenCheck: true,
          activeTabs: [1],
          maxTabs: 99,
          isMyTable: false,
          tabs: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              tabIndex: 1,
              guestName: 'Miles',
              status: 'open',
              totalAmount: 0,
              items: [],
              openedAt: '12:00 PM',
            },
          ],
        },
      ],
      takeoutOrders: [],
      onlineOrders: [],
      alerts: [],
      offlineQueue: [],
      ...createTableTabSlice(set, get),
      ...createHydrationSlice(set, get),
    }));

    store.getState().addItemsToTab('tbl-1', 1, [
      {
        id: 'item-local-1',
        productId: 'prod-espresso',
        productName: 'Espresso',
        unitPrice: 120,
        quantity: 1,
        stationTarget: 'bar',
        status: 'pending',
      },
    ]);

    // Wait a tick for priorWritesPromise await inside addItemsToTab
    await Promise.resolve();
    await Promise.resolve();

    expect(createOrderSpy).toHaveBeenCalledTimes(1);
    const callArg = createOrderSpy.mock.calls[0]![0];
    expect(callArg.externalOrderRef).toBeTruthy();
    expect(callArg.items[0]!.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // Simulate overlapping Supabase CDC & heartbeat queue drains while the primary request is still in flight
    await Promise.all([store.getState().drainOfflineQueue(), store.getState().drainOfflineQueue()]);

    // Must STILL only be called once!
    expect(createOrderSpy).toHaveBeenCalledTimes(1);

    resolveDispatch({
      order: { id: 'ord-1', tab_id: '11111111-1111-4111-8111-111111111111' },
      items: [{ id: callArg.items[0]!.id, created_at: new Date().toISOString() }],
      depletion: { success: true },
    });

    await Promise.resolve();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(loadDurableQueue()).toHaveLength(0);
  });

  it('serializes concurrent drainOfflineQueue calls so queued offline mutations execute once', async () => {
    let resolveCall!: (value: any) => void;
    const createOrderSpy = vi.spyOn(ordersApi, 'createOrderWithItems').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCall = resolve;
        }) as any
    );

    enqueueDurableMutation({
      id: 'mut-offline-once',
      hlc: 'hlc-1',
      type: 'create_order',
      payload: {
        tabId: '11111111-1111-4111-8111-111111111111',
        tableId: 'tbl-1',
        tabIndex: 1,
        customerName: 'Coltrane',
        orderNumber: '#C1-1-R1',
        orderType: 'DINE_IN',
        roundNumber: 1,
        items: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            productId: 'prod-latte',
            productName: 'Latte',
            quantity: 1,
            unitPrice: 170,
            stationTarget: 'bar',
          },
        ],
      },
    });

    const store = create<any>((set, get) => ({
      tables: [],
      takeoutOrders: [],
      onlineOrders: [],
      alerts: [],
      offlineQueue: loadDurableQueue(),
      ...createHydrationSlice(set, get),
    }));

    const p1 = store.getState().drainOfflineQueue();
    const p2 = store.getState().drainOfflineQueue();

    await Promise.resolve();
    expect(createOrderSpy).toHaveBeenCalledTimes(1);

    resolveCall({
      order: { id: 'ord-offline-1', tab_id: '11111111-1111-4111-8111-111111111111' },
      items: [],
      depletion: { success: true },
    });

    await Promise.all([p1, p2]);
    expect(createOrderSpy).toHaveBeenCalledTimes(1);
    expect(loadDurableQueue()).toHaveLength(0);
  });
});
