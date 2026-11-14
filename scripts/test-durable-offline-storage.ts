/**
 * Automated Unit & Integration Test Suite for Durable Offline Storage & Queue
 * Monk's Dream Jazz Bar POS
 * Run via: node --experimental-strip-types scripts/test-durable-offline-storage.ts
 */

import assert from 'node:assert/strict';
import { safeStorage } from '../frontend/src/features/shared/infrastructure/storage/safeStorage.ts';

console.log('🧪 Running Durable Offline Storage & Queue Tests...\n');

// -------------------------------------------------------------
// Seam A: safeStorage Storage Adapter
// -------------------------------------------------------------

console.log('--- Seam A: safeStorage Storage Adapter ---');

// Test 1: In-memory fallback and JSON serialization in non-browser environment
{
  safeStorage.clear();
  const testData = { venueId: 'monks-jazz-01', mode: 'CAFE', timestamp: 1700000000 };
  const saved = safeStorage.setItem('test_venue', testData);
  assert.equal(saved, true, 'setItem should return true on success');

  const retrieved = safeStorage.getItem('test_venue', null);
  assert.deepEqual(
    retrieved,
    testData,
    'getItem should return serialized object deep equal to original'
  );

  // Fallback check on missing key
  const fallbackResult = safeStorage.getItem('missing_key', { fallback: true });
  assert.deepEqual(
    fallbackResult,
    { fallback: true },
    'getItem should return fallback value for non-existent key'
  );

  // Removal
  const removed = safeStorage.removeItem('test_venue');
  assert.equal(removed, true, 'removeItem should return true');
  const afterRemoval = safeStorage.getItem('test_venue', null);
  assert.equal(afterRemoval, null, 'getItem should return fallback after key is removed');

  console.log('  ✅ [PASS] safeStorage handles set, get, remove with memory fallback');
}

// Test 2: safeStorage handles malformed values safely without throwing
{
  safeStorage.clear();
  // Simulate corrupted JSON in memory/storage
  safeStorage.setRaw('corrupted_key', '{ invalid json: [unclosed');
  // getItem should not throw, should return fallback
  const fallbackVal = { safe: true };
  const res = safeStorage.getItem('corrupted_key', fallbackVal);
  assert.deepEqual(
    res,
    fallbackVal,
    'Corrupted JSON should cleanly return fallback without throwing'
  );

  console.log('  ✅ [PASS] safeStorage recovers from malformed data gracefully');
}

console.log('\n🎉 Seam A tests completed!');

// -------------------------------------------------------------
// Seam B: durableQueue Domain Queue Manager
// -------------------------------------------------------------

import {
  loadDurableQueue,
  saveDurableQueue,
  enqueueDurableMutation,
  dequeueDurableMutation,
  clearDurableQueue,
} from '../frontend/src/features/orders/data/durableQueue.ts';

console.log('\n--- Seam B: durableQueue Domain Queue Manager ---');

// Test 3: Enqueue mutation attaches UUID and timestamp, and persists to storage
{
  clearDurableQueue();
  assert.deepEqual(loadDurableQueue(), [], 'Queue should be empty after clear');

  const mutation = enqueueDurableMutation({
    hlc: 'hlc-test-01',
    type: 'create_order',
    payload: { tableId: 'tbl-c1', tabIndex: 0, items: [{ productId: 'p1', quantity: 2 }] },
  });

  assert.ok(mutation.id, 'Mutation should be assigned an id');
  assert.ok(
    typeof mutation.id === 'string' && mutation.id.length > 10,
    'Id should be a valid UUID string'
  );
  assert.ok(mutation.timestamp > 0, 'Mutation should have a valid timestamp');
  assert.equal(mutation.type, 'create_order');

  // Verify persistence
  const loaded = loadDurableQueue();
  assert.equal(loaded.length, 1, 'Persisted queue should contain 1 item');
  assert.deepEqual(loaded[0], mutation, 'Loaded mutation should match enqueued mutation');

  console.log('  ✅ [PASS] enqueueDurableMutation attaches UUID/timestamp and persists');
}

// Test 4: Multiple mutations maintain FIFO ordering and dequeue removes by ID
{
  clearDurableQueue();
  const m1 = enqueueDurableMutation({
    hlc: 'hlc-test-01',
    type: 'create_order',
    payload: { orderNum: 1 },
  });
  const m2 = enqueueDurableMutation({
    hlc: 'hlc-test-02',
    type: 'create_order',
    payload: { orderNum: 2 },
  });
  const m3 = enqueueDurableMutation({
    hlc: 'hlc-test-03',
    type: 'create_order',
    payload: { orderNum: 3 },
  });

  let queue = loadDurableQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].id, m1.id, 'First item must be m1 (FIFO)');
  assert.equal(queue[1].id, m2.id, 'Second item must be m2 (FIFO)');
  assert.equal(queue[2].id, m3.id, 'Third item must be m3 (FIFO)');

  // Dequeue middle item
  const updatedQueue = dequeueDurableMutation(m2.id);
  assert.equal(updatedQueue.length, 2);
  assert.equal(updatedQueue[0].id, m1.id);
  assert.equal(updatedQueue[1].id, m3.id);

  // Reload to verify durable persistence of dequeue
  const reloaded = loadDurableQueue();
  assert.equal(reloaded.length, 2);
  assert.equal(
    reloaded.find((item) => item.id === m2.id),
    undefined,
    'Dequeued item m2 must not exist in storage'
  );

  clearDurableQueue();
  assert.equal(loadDurableQueue().length, 0);

  console.log('  ✅ [PASS] FIFO ordering and dequeue persistence verified');
}

// -------------------------------------------------------------
// Seam C: Store Boot & Offline Order Dispatch
// -------------------------------------------------------------

import { create } from 'zustand';
import type { QueuedMutation } from '../frontend/src/features/orders/domain/order.types';

console.log('\n--- Seam C: Store Boot & Offline Order Dispatch ---');

interface OrderStoreSlice {
  offlineQueue: QueuedMutation[];
  dispatchOfflineOrder: (tableId: string, items: any[]) => void;
  rehydrateFromStorage: () => void;
}

const createOrderStore = () =>
  create<OrderStoreSlice>((set) => ({
    offlineQueue: loadDurableQueue(),
    dispatchOfflineOrder: (tableId: string, items: any[]) => {
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

// Test 5: Initial store offlineQueue is loaded from durable client storage on boot
{
  clearDurableQueue();

  // Enqueue a mutation directly to durable storage (simulating previous session before reload)
  enqueueDurableMutation({
    id: 'persisted-uuid-001',
    hlc: 'hlc-saved-before-reboot',
    type: 'create_order',
    payload: { tableId: 'tbl-c2', tabIndex: 0, items: [{ productName: 'Americano', quantity: 1 }] },
  });

  // Verify that loadDurableQueue returns it
  const durableItems = loadDurableQueue();
  assert.equal(durableItems.length, 1);
  assert.equal(durableItems[0].id, 'persisted-uuid-001');

  // Verify that a newly booted store populates offlineQueue from durable storage
  const freshStore = createOrderStore();
  const storeQueue = freshStore.getState().offlineQueue;
  assert.equal(storeQueue.length, 1);
  assert.equal(storeQueue[0].id, 'persisted-uuid-001');
  assert.equal(storeQueue[0].payload.items[0].productName, 'Americano');

  console.log('  ✅ [PASS] Store populates offlineQueue from durable storage on restart');
}

// Test 6: Offline enqueue preserves order mutations with idempotency keys
{
  clearDurableQueue();
  const store = createOrderStore();
  assert.equal(store.getState().offlineQueue.length, 0);

  // Dispatch offline order
  store.getState().dispatchOfflineOrder('tbl-c5', [{ productName: 'Espresso', quantity: 2 }]);

  const currentQueue = store.getState().offlineQueue;
  assert.equal(currentQueue.length, 1);
  assert.ok(currentQueue[0].id, 'Idempotency key must be generated');
  assert.equal(currentQueue[0].type, 'create_order');

  // Simulate browser reload by reading fresh from storage into a newly instantiated store
  const reloadedStore = createOrderStore();
  assert.equal(reloadedStore.getState().offlineQueue.length, 1);
  assert.equal(reloadedStore.getState().offlineQueue[0].id, currentQueue[0].id);

  clearDurableQueue();

  console.log('  ✅ [PASS] Offline orders persist with idempotency keys and survive reloads');
}

// -------------------------------------------------------------
// Seam D: Backoff Engine & Retry Tracking (Issue #2)
// -------------------------------------------------------------

import {
  computeBackoffDelay,
  isItemReadyForRetry,
  recordMutationFailure,
} from '../frontend/src/features/orders/data/durableQueue.ts';

console.log('\n--- Seam D: Backoff Engine & Retry Tracking ---');

// Test 7: Exponential backoff with jitter calculation
{
  // retry 0 -> ~1000ms
  const d0 = computeBackoffDelay(0, 1000, 30000);
  assert.ok(d0 >= 1000 && d0 <= 1250, `d0 should be in [1000, 1250], got ${d0}`);

  // retry 1 -> ~2000ms
  const d1 = computeBackoffDelay(1, 1000, 30000);
  assert.ok(d1 >= 2000 && d1 <= 2500, `d1 should be in [2000, 2500], got ${d1}`);

  // retry 2 -> ~4000ms
  const d2 = computeBackoffDelay(2, 1000, 30000);
  assert.ok(d2 >= 4000 && d2 <= 5000, `d2 should be in [4000, 5000], got ${d2}`);

  // capped at maxDelay (e.g. 30000)
  const d10 = computeBackoffDelay(10, 1000, 30000);
  assert.ok(d10 <= 37500, `d10 should cap at maxDelay + jitter, got ${d10}`);

  console.log('  ✅ [PASS] computeBackoffDelay scales exponentially with jitter');
}

// Test 8: Retry eligibility check and failure recording
{
  clearDurableQueue();
  const mutation = enqueueDurableMutation({
    hlc: 'hlc-backoff-1',
    type: 'create_order',
    payload: { tableId: 't1' },
  });

  const now = Date.now();
  // Fresh mutation with 0 retries is immediately ready
  assert.equal(isItemReadyForRetry(mutation, now), true);

  // Record failure
  const updated = recordMutationFailure(mutation.id, 'Network timeout', now);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].retryCount, 1);
  assert.equal(updated[0].lastError, 'Network timeout');
  assert.equal(updated[0].lastAttemptAt, now);

  // 100ms later, should NOT be ready because backoff is >= 1000ms
  assert.equal(isItemReadyForRetry(updated[0], now + 100), false);

  // 2000ms later, should be ready
  assert.equal(isItemReadyForRetry(updated[0], now + 2000), true);

  console.log('  ✅ [PASS] isItemReadyForRetry and recordMutationFailure track backoff window');
}

// -------------------------------------------------------------
// Seam E: Sequential Replay & Atomic Draining (Issue #2)
// -------------------------------------------------------------

console.log('\n--- Seam E: Sequential Replay & Atomic Draining ---');

// Test 9: Sequential drain skips cool-down items, processes ready items, and decrements queue
{
  clearDurableQueue();
  const processedIds: string[] = [];
  const failedIds: string[] = [];

  // Mock executor
  const mockExecutor = async (item: QueuedMutation) => {
    if (item.payload.shouldFail) {
      throw new Error('Simulated network failure');
    }
    processedIds.push(item.id);
  };

  // Enqueue 3 mutations
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

  assert.equal(loadDurableQueue().length, 3);

  // Define drainer algorithm
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
      } catch (err: any) {
        failedIds.push(item.id);
        recordMutationFailure(item.id, err.message, now);
      }
    }
    return loadDurableQueue();
  };

  // First cycle: m1 succeeds, m2 fails & backs off, m3 succeeds
  await executeDrainingCycle();

  assert.deepEqual(processedIds, [m1.id, m3.id]);
  assert.deepEqual(failedIds, [m2.id]);

  let remaining = loadDurableQueue();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, m2.id);
  assert.equal(remaining[0].retryCount, 1);

  // Immediate second cycle: m2 is in backoff cool-down, so it should be skipped
  processedIds.length = 0;
  failedIds.length = 0;
  await executeDrainingCycle();

  assert.equal(processedIds.length, 0, 'No items should be processed while in cool-down');
  assert.equal(failedIds.length, 0, 'No retry attempts should occur while in cool-down');
  assert.equal(loadDurableQueue().length, 1);

  clearDurableQueue();
  console.log('  ✅ [PASS] Sequential draining processes ready items and honors cool-down');
}

// -------------------------------------------------------------
// Seam F: Offline Table Transfers & Bill Settlement Queuing (Issue #3)
// -------------------------------------------------------------

console.log('\n--- Seam F: Offline Table Transfers & Bill Settlement Queuing ---');

// Test 10: Enqueuing table transfer & settlements persists mutations with idempotency keys
{
  clearDurableQueue();

  const transferMutation = enqueueDurableMutation({
    hlc: 'hlc-transfer-01',
    type: 'transfer_table',
    payload: {
      originTableId: 'tbl-c1',
      targetTableId: 'tbl-c2',
      originTableCode: 'C1',
      targetTableCode: 'C2',
      staffId: 'staff-waiter-01',
      reason: 'Guest moved to window table',
    },
  });

  const settleTabMutation = enqueueDurableMutation({
    hlc: 'hlc-settle-01',
    type: 'settle_tab',
    payload: {
      tabId: '22222222-2222-2222-2222-222222222222',
      paymentMethod: 'CASH',
      amount: 450,
      notes: 'Cash settlement by cashier',
      drawerTarget: 'main',
    },
  });

  const queue = loadDurableQueue();
  assert.equal(queue.length, 2, 'Queue should hold 2 enqueued mutations');
  assert.equal(queue[0].type, 'transfer_table');
  assert.equal(queue[1].type, 'settle_tab');
  assert.equal(queue[0].id, transferMutation.id);
  assert.equal(queue[1].id, settleTabMutation.id);

  console.log('  ✅ [PASS] Transfer and settlement mutations enqueue with deterministic UUIDs');
}

// Test 11: Sequential replay drains transfers and settlements in order
{
  const executedActions: string[] = [];
  const queue = loadDurableQueue();

  for (const item of queue) {
    if (item.type === 'transfer_table') {
      executedActions.push(
        `TRANSFERRED: ${item.payload.originTableCode}->${item.payload.targetTableCode}`
      );
      dequeueDurableMutation(item.id);
    } else if (item.type === 'settle_tab') {
      executedActions.push(
        `SETTLED: ${item.payload.tabId} (${item.payload.paymentMethod} ₱${item.payload.amount})`
      );
      dequeueDurableMutation(item.id);
    }
  }

  assert.deepEqual(executedActions, [
    'TRANSFERRED: C1->C2',
    'SETTLED: 22222222-2222-2222-2222-222222222222 (CASH ₱450)',
  ]);
  assert.equal(loadDurableQueue().length, 0, 'Durable queue should be fully drained');

  clearDurableQueue();
  console.log('  ✅ [PASS] Sequential replay drains transfers and settlements in strict order');
}

console.log('\n============================================================');
console.log('🎉 ALL DURABLE OFFLINE STORAGE & QUEUE TESTS PASSED');
console.log('============================================================\n');
