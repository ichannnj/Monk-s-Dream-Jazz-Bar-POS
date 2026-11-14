import { describe, it, expect, beforeEach } from 'vitest';
import { safeStorage } from '../../shared/infrastructure/storage/safeStorage';
import {
  loadDurableQueue,
  saveDurableQueue,
  enqueueDurableMutation,
  dequeueDurableMutation,
  clearDurableQueue,
  computeBackoffDelay,
  isItemReadyForRetry,
  recordMutationFailure,
} from '../data/durableQueue';
import {
  saveAuthoritativeSnapshot,
  loadAuthoritativeSnapshot,
  clearAuthoritativeSnapshot,
  getInitialVenueState,
  isValidVenueSnapshot,
  CURRENT_SNAPSHOT_VERSION,
} from '../data/venueSnapshot';
import { create } from 'zustand';
import type { QueuedMutation } from '../domain/order.types';

describe('Durable Offline Storage & Queue Lifecycle', () => {
  beforeEach(() => {
    safeStorage.clear();
    clearDurableQueue();
    clearAuthoritativeSnapshot();
  });

  describe('Seam A: safeStorage Storage Adapter', () => {
    it('handles set, get, remove with memory fallback', () => {
      const testData = { venueId: 'monks-jazz-01', mode: 'CAFE', timestamp: 1700000000 };
      const saved = safeStorage.setItem('test_venue', testData);
      expect(saved).toBe(true);

      const retrieved = safeStorage.getItem('test_venue', null);
      expect(retrieved).toEqual(testData);

      const fallbackResult = safeStorage.getItem('missing_key', { fallback: true });
      expect(fallbackResult).toEqual({ fallback: true });

      const removed = safeStorage.removeItem('test_venue');
      expect(removed).toBe(true);

      const afterRemoval = safeStorage.getItem('test_venue', null);
      expect(afterRemoval).toBeNull();
    });

    it('handles malformed corrupted JSON safely without throwing', () => {
      safeStorage.setRaw('corrupted_key', '{ invalid json: [unclosed');
      const fallbackVal = { safe: true };
      const res = safeStorage.getItem('corrupted_key', fallbackVal);
      expect(res).toEqual(fallbackVal);
    });
  });

  describe('Seam B: durableQueue Domain Queue Manager', () => {
    it('enqueues mutations with UUID and timestamp, and dequeues in FIFO order', () => {
      const m1 = enqueueDurableMutation({
        hlc: 'hlc-001',
        type: 'create_order',
        payload: { tableId: 'tbl-1', items: [{ name: 'Espresso' }] },
      });

      expect(m1.id).toBeDefined();
      expect(m1.timestamp).toBeGreaterThan(0);
      expect(m1.retryCount).toBe(0);

      const m2 = enqueueDurableMutation({
        hlc: 'hlc-002',
        type: 'create_order',
        payload: { tableId: 'tbl-2', items: [{ name: 'Latte' }] },
      });

      const queue = loadDurableQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0]!.id).toBe(m1.id);
      expect(queue[1]!.id).toBe(m2.id);

      dequeueDurableMutation(m1.id);
      const afterFirstDequeue = loadDurableQueue();
      expect(afterFirstDequeue).toHaveLength(1);
      expect(afterFirstDequeue[0]!.id).toBe(m2.id);

      dequeueDurableMutation(m2.id);
      expect(loadDurableQueue()).toHaveLength(0);
    });
  });

  describe('Seam C: Store Boot & Offline Order Dispatch', () => {
    interface OrderStoreSlice {
      offlineQueue: QueuedMutation[];
      dispatchOfflineOrder: (
        tableId: string,
        items: Array<{ productName: string; quantity: number }>
      ) => void;
      rehydrateFromStorage: () => void;
    }

    const createOrderStore = () =>
      create<OrderStoreSlice>((set) => ({
        offlineQueue: loadDurableQueue(),
        dispatchOfflineOrder: (
          tableId: string,
          items: Array<{ productName: string; quantity: number }>
        ) => {
          enqueueDurableMutation({
            hlc: 'hlc-offline-order',
            type: 'create_order',
            payload: { tableId, items },
          });
          set({ offlineQueue: loadDurableQueue() });
        },
        rehydrateFromStorage: () => {
          set({ offlineQueue: loadDurableQueue() });
        },
      }));

    it('populates offlineQueue from durable storage upon store initialization', () => {
      enqueueDurableMutation({
        id: 'persisted-uuid-001',
        hlc: 'hlc-saved-before-reboot',
        type: 'create_order',
        payload: {
          tableId: 'tbl-c2',
          tabIndex: 0,
          items: [{ productName: 'Americano', quantity: 1 }],
        },
      });

      const freshStore = createOrderStore();
      const storeQueue = freshStore.getState().offlineQueue;
      expect(storeQueue).toHaveLength(1);
      expect(storeQueue[0]!.id).toBe('persisted-uuid-001');
      expect(
        (storeQueue[0]!.payload as { items: Array<{ productName: string }> }).items[0]!.productName
      ).toBe('Americano');
    });
  });

  describe('Seam D: Backoff Engine & Retry Tracking', () => {
    it('computes exponential backoff with upper cap', () => {
      const delay0 = computeBackoffDelay(0);
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(2500);

      const delay3 = computeBackoffDelay(3);
      expect(delay3).toBeGreaterThanOrEqual(8000);

      const delay10 = computeBackoffDelay(10);
      expect(delay10).toBeLessThanOrEqual(37500);
    });

    it('tracks retry backoff window correctly via isItemReadyForRetry', () => {
      const item = enqueueDurableMutation({
        hlc: 'hlc-backoff-test',
        type: 'create_order',
        payload: {},
      });

      const now = Date.now();
      expect(isItemReadyForRetry(item, now)).toBe(true);

      recordMutationFailure(item.id, 'Connection timeout', now);
      const queueAfterFail = loadDurableQueue();
      const failedItem = queueAfterFail[0]!;
      expect(failedItem.retryCount).toBe(1);
      expect(failedItem.lastError).toBe('Connection timeout');

      // Immediate check should be false (in cool-down)
      expect(isItemReadyForRetry(failedItem, now)).toBe(false);

      // Future check past nextRetryAt should be true
      expect(isItemReadyForRetry(failedItem, failedItem.nextRetryAt! + 100)).toBe(true);
    });
  });

  describe('Seam E: Sequential Replay & Draining', () => {
    it('processes ready items and skips items in cool-down', async () => {
      const processedIds: string[] = [];
      const failedIds: string[] = [];

      const mockExecutor = async (item: QueuedMutation) => {
        if ((item.payload as { shouldFail?: boolean }).shouldFail) {
          throw new Error('Simulated network failure');
        }
        processedIds.push(item.id);
      };

      const m1 = enqueueDurableMutation({
        hlc: 'hlc-drain-1',
        type: 'create_order',
        payload: { shouldFail: false },
      });
      const m2 = enqueueDurableMutation({
        hlc: 'hlc-drain-2',
        type: 'create_order',
        payload: { shouldFail: true },
      });
      const m3 = enqueueDurableMutation({
        hlc: 'hlc-drain-3',
        type: 'create_order',
        payload: { shouldFail: false },
      });

      const executeDrainingCycle = async () => {
        const queue = loadDurableQueue();
        const now = Date.now();
        for (const item of queue) {
          if (!isItemReadyForRetry(item, now)) {
            continue;
          }
          try {
            await mockExecutor(item);
            dequeueDurableMutation(item.id);
          } catch (err: unknown) {
            failedIds.push(item.id);
            recordMutationFailure(item.id, (err as Error).message, now);
          }
        }
        return loadDurableQueue();
      };

      await executeDrainingCycle();

      expect(processedIds).toEqual([m1.id, m3.id]);
      expect(failedIds).toEqual([m2.id]);

      const remaining = loadDurableQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe(m2.id);
      expect(remaining[0]!.retryCount).toBe(1);

      // Immediate second cycle: m2 is in cool-down, so it should be skipped
      processedIds.length = 0;
      failedIds.length = 0;
      await executeDrainingCycle();

      expect(processedIds).toHaveLength(0);
      expect(failedIds).toHaveLength(0);
      expect(loadDurableQueue()).toHaveLength(1);
    });
  });

  describe('Seam F: Offline Table Transfers & Bill Settlement Queuing', () => {
    it('enqueues table transfers and bill settlements with deterministic payloads', () => {
      const transferMutation = enqueueDurableMutation({
        hlc: 'hlc-transfer-01',
        type: 'transfer_table',
        payload: {
          originTableId: 'tbl-c1',
          destinationTableId: 'tbl-c2',
          tabId: 'tab-99',
        },
      });

      const settleMutation = enqueueDurableMutation({
        hlc: 'hlc-settle-01',
        type: 'settle_tab',
        payload: {
          tableId: 'tbl-c2',
          tabId: 'tab-99',
          amount: 850,
          paymentMethod: 'CASH',
        },
      });

      const queue = loadDurableQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0]!.type).toBe('transfer_table');
      expect(queue[1]!.type).toBe('settle_tab');
    });
  });

  describe('Seam G: Authoritative Venue State Snapshot & Cold Boot', () => {
    it('validates schema and version of venue snapshots strictly', () => {
      expect(isValidVenueSnapshot(null)).toBe(false);
      expect(isValidVenueSnapshot({})).toBe(false);
      expect(isValidVenueSnapshot({ version: 999, timestamp: Date.now() })).toBe(false);
      expect(
        isValidVenueSnapshot({
          version: CURRENT_SNAPSHOT_VERSION,
          timestamp: Date.now(),
          tables: [],
          takeoutOrders: [],
          onlineOrders: [],
        })
      ).toBe(false);

      const validMockSnapshot = {
        version: CURRENT_SNAPSHOT_VERSION,
        timestamp: Date.now(),
        tables: [{ id: 'tbl-1', code: 'T1', status: 'occupied' as const, tabs: [] }],
        takeoutOrders: [],
        onlineOrders: [],
      };
      expect(isValidVenueSnapshot(validMockSnapshot)).toBe(true);
    });

    it('initializes from authoritative snapshot over default seeds on cold boot', () => {
      const defaultState = getInitialVenueState();
      expect(defaultState.hasAuthoritativeSnapshot).toBe(false);
      expect(defaultState.tables.length).toBeGreaterThan(0);

      const testSnapshot = {
        version: CURRENT_SNAPSHOT_VERSION,
        timestamp: Date.now(),
        tables: [
          {
            id: 'tbl-vip-1',
            code: 'VIP1',
            status: 'occupied' as const,
            area: 'bar' as const,
            activeTabs: [1],
            guests: 4,
            tabs: [
              {
                id: 'tab-vip-001',
                tabIndex: 1,
                guestName: 'Miles Davis',
                status: 'open' as const,
                totalAmount: 1250,
                items: [
                  {
                    id: 'item-1',
                    productId: 'p-whiskey',
                    productName: 'Yamazaki 12',
                    quantity: 2,
                    unitPrice: 625,
                    status: 'served' as const,
                  },
                ],
              },
            ],
          },
        ],
        takeoutOrders: [
          {
            id: 'takeout-001',
            ticketNumber: 42,
            customerName: 'Thelonious Monk',
            total: 350,
            items: [],
            status: 'preparing' as const,
            paymentStatus: 'PAID_COUNTER' as const,
          },
        ],
        onlineOrders: [],
        drawerEntries: [],
      };

      saveAuthoritativeSnapshot(testSnapshot);

      const loaded = loadAuthoritativeSnapshot();
      expect(loaded).not.toBeNull();
      expect(loaded?.tables[0]!.code).toBe('VIP1');

      const rehydratedState = getInitialVenueState();
      expect(rehydratedState.hasAuthoritativeSnapshot).toBe(true);
      expect(rehydratedState.tables[0]!.code).toBe('VIP1');
      expect(rehydratedState.tables[0]!.tabs[0]!.guestName).toBe('Miles Davis');
      expect(rehydratedState.takeoutOrders[0]!.customerName).toBe('Thelonious Monk');
    });
  });
});
