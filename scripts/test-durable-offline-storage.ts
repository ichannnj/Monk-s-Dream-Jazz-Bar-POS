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

console.log('\n============================================================');
console.log('🎉 ALL DURABLE OFFLINE STORAGE & QUEUE TESTS PASSED (6/6)');
console.log('============================================================\n');
