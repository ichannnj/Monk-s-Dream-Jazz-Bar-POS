# 📦 Phase 1: Durable Offline Storage & Resilient Mutation Replay Engine

> **Status:** Pending Execution  
> **Target:** Zero data loss during tablet network drops, browser refreshes, or low-battery shutdowns.

---

## 🎯 Objectives

1. Persist the Zustand `offlineQueue` to durable client storage (`localStorage` with safe memory fallback).
2. Attach deterministic idempotency keys (`uuidv4` + timestamp) to each queued mutation to prevent duplicate order submissions or double payments upon reconnect.
3. Automatically load stored mutations on tablet boot and trigger queue draining with exponential backoff and retry tracking.
4. Replace static mock fallback (`SEED_TABLES`, `SEED_TAKEOUT_ORDERS`) with local authoritative snapshots so offline tablets show real venue state rather than fictitious orders.

---

## 🛠️ Implementation Checklist

- [ ] **Step 1.1: Storage Adapter Implementation**
  - Create `frontend/src/features/shared/infrastructure/storage/safeStorage.ts`:
    - Synchronous, SSR-safe `localStorage` wrapper with JSON serialization and memory fallback.
- [ ] **Step 1.2: Durable Offline Queue Manager**
  - Create `frontend/src/features/orders/data/durableQueue.ts`:
    - `loadDurableQueue()`: Read persisted mutations.
    - `saveDurableQueue(queue: QueuedMutation[])`: Save mutations to storage.
    - `enqueueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>)`: Enqueue with UUID idempotency key.
    - `dequeueMutation(id: string)`: Remove executed mutation.
- [ ] **Step 1.3: Update Hydration Slice & Store**
  - Update `frontend/src/features/orders/application/hydration.slice.ts`:
    - On `hydrateFromSupabase()`, load pending mutations from storage.
    - In `drainOfflineQueue()`, iterate over items with retry counter and exponential backoff.
  - In `tableTab.slice.ts` and `settlement.slice.ts`, persist queued actions immediately before dispatching network requests.
- [ ] **Step 1.4: Cached Authoritative Snapshot Hydration**
  - Update `useOrderStore.ts` to cache active tables and tabs into local snapshot upon successful Supabase sync.
  - On cold offline boot, populate initial state from this snapshot instead of static seed constants.

---

## 🧪 Verification Plan

- [ ] Unit test: Verify `enqueueMutation` and `saveDurableQueue` persist mutations and reload accurately.
- [ ] Manual test: Disconnect Wi-Fi in DevTools $\rightarrow$ dispatch order $\rightarrow$ reload browser $\rightarrow$ confirm order remains in queue $\rightarrow$ reconnect Wi-Fi $\rightarrow$ confirm order successfully posts to Supabase.
