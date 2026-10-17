# 🍽️ Phase 4: Full-Stack Integration of Floor POS (Supabase BaaS)

> **Phase:** 04 of 06  
> **Status:** 📋 Planned (Depends on Phase 2 & 3)  
> **Master Spec Reference:** [REQUIREMENTS.md — Section 3.1, 3.4 & 5](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)  
> **Goal:** Connect existing 20+ Waiter POS components and Zustand store ([useOrderStore.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/useOrderStore.ts)) directly to `@supabase/supabase-js` and Supabase Realtime, preserving responsive offline/optimistic updates.

---

## 🎯 Scope of Work

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Connect Zustand Store (useOrderStore) to Supabase & Realtime        │
│    • Fetch initial tables, active tabs, menu catalog from Postgres     │
│    • Listen for real-time table occupancy changes via postgres_changes │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Real-Time Floor Grid & Table Transfers (transfer_table_tab RPC)     │
│    • Live table card occupancy changes (Empty -> Occupied -> Served)   │
│    • Connect TableTransferModal to supabase.rpc('transfer_table_tab')  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Live Auto-86 Feedback in Order Entry Modal                          │
│    • Greys out depleted menu items dynamically from products Realtime  │
│    • Outside food +20% locked markup calculation                       │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Bill Settlement & Thermal Print Jobs Queue                          │
│    • Settle tab via supabase.from('tabs').update({ status: 'BILLED' }) │
│    • Inserts print job into 'print_jobs' queue for physical printer    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Implementation Checklist

### Step 4.1: Synchronize `useOrderStore` with Supabase
- [ ] Target file: [frontend/src/store/useOrderStore.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/useOrderStore.ts)
- [ ] On user login / app initialization:
  - Fetch tables with tabs: `supabase.from('tables').select('*, tabs(*)')`.
  - Fetch menu catalog: `supabase.from('products').select('*')`.
- [ ] Connect Supabase Realtime channel (`floor_tables`):
  - On `postgres_changes` on `tables` $\to$ update local table cards state.
  - On `postgres_changes` on `products` $\to$ refresh 86 disabled status.
- [ ] Maintain optimistic local state: UI updates immediately upon tap; reverts only if Supabase request fails.

### Step 4.2: Connect Table & Tab Transfer Modal to Supabase RPC
- [ ] Target file: [frontend/src/components/waiter/TableTransferModal.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/TableTransferModal.tsx)
- [ ] Connect **"Confirm Transfer"** action:
  ```ts
  const { data, error } = await supabase.rpc('transfer_table_tab', {
    p_origin_table_id: originTableId,
    p_target_table_id: targetTableId,
    p_tab_id: selectedTabId,
    p_staff_id: currentStaffId,
    p_reason: transferReason,
  });
  ```
- [ ] Verify floor grid updates:
  - Origin table turns green (`Available`) if 0 open tabs remain.
  - Target table turns amber (`Occupied`) with updated tab count.

### Step 4.3: Live Auto-86, Outside Food Markup & Visual Cards in Order Entry
- [ ] Target file: [frontend/src/components/waiter/OrderEntryModal.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/OrderEntryModal.tsx)
- [ ] Visual Menu Item Cards with Cover Image & Graceful Fallback:
  - If `item.imageUrl` is present, render top banner (`height: 110`, `borderTopLeftRadius: 10`, `borderTopRightRadius: 10`, `resizeMode: 'cover'`) using React Native `Image` with smooth fade-in and caching.
  - If `item.imageUrl` is absent or fails to load, gracefully fall back to jazz dark theme category icons (`Coffee`, `Wine`, `UtensilsCrossed`, `Pizza`, `Cake`) with station-tinted badges.
  - 86'd Sold Out overlay seamlessly dims the card and image with red ban icon and reason badge.
- [ ] Greys out any item with `auto86 === true` or insufficient inventory.
- [ ] Allergen alerts: Highlight allergen chips when viewing items with customer allergy filters.
- [ ] Resold outside food: Display locked price computed by `originalCost * 1.20`.
- [ ] Corkage toggle: Add 20% surcharge dynamically to customer tab total.

### Step 4.4: Settle & Remote Print Trigger in Bill Settlement Modal
- [ ] Target file: [frontend/src/components/waiter/BillSettlementModal.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/BillSettlementModal.tsx)
- [ ] Wire payment execution to `supabase.rpc('settle_tab_and_record_payment')`:
  ```ts
  const { data, error } = await supabase.rpc('settle_tab_and_record_payment', {
    p_tab_id: tabId,
    p_staff_id: currentStaffId,
    p_payment_method: paymentMethod, // 'CASH' | 'CARD' | 'DIGITAL_WALLET' | 'COMP'
    p_amount: totalAmountPaid,
    p_corkage_amount: corkageAmount,
    p_discount_amount: discountAmount,
    p_tip_amount: tipAmount,
  });
  ```
- [ ] Transaction automatically:
  - Records payment row with method, tip, and corkage fee.
  - Updates tab status to `BILLED` and marks table free if no other open tabs remain.
  - If cash payment, inserts sale record into `cash_drawer_transactions`.
  - Atomically enqueues a `CUSTOMER_RECEIPT` into the `print_jobs` table.
- [ ] Toast notification appears on Waiter tablet: `Receipt dispatched to printer station`.

### Step 4.5: Optimistic State & Offline Queue Resilience
- [ ] Target file: [frontend/src/store/useOrderStore.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/useOrderStore.ts)
- [ ] Local Mutation Queue:
  - When connection is offline or degraded, queue order dispatches locally.
  - Stamp events with Hybrid Logical Clock (HLC) timestamps from `@monks/shared`.
  - Reconnect listener automatically drains pending mutations and re-synchronizes with Supabase.

---

## 🔬 Verification & Validation

| Test Scenario | Action | Expected Result |
|---|---|---|
| Open Table Tab | Waiter opens Tab for "Miles" on Table 4 | Table 4 turns Amber on all connected tablets simultaneously |
| Multi-Channel Queue | Cashier inputs GrabFood order `#GF-8842` | Shows up in Online Delivery filter tab with rider name |
| Real-Time Auto-86 | Deplete coffee beans in database | Flat White immediately greys out in Order Entry Modal on all tablets |
| Remote Print Trigger | Cashier settles Table 4 bill | `settle_tab_and_record_payment` executes, drawer logs cash sale, and printer daemon receives print job |
