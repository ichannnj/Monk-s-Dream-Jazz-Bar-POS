# ⚡ Phase 2: Supabase Realtime, Table Transfers, Depletion & Billing Engine

> **Phase:** 02 of 06  
> **Status:** 📋 Planned (Depends on Phase 1)  
> **Master Spec Reference:** [REQUIREMENTS.md — Section 3.2, 3.5 & 7.2](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)  
> **Goal:** Implement the order-driven recipe depletion engine (`dispatch_order_with_depletion`), cancellation restoral (`cancel_order_item_with_restoral`), atomic tab billing (`settle_tab_and_record_payment`), table transfers (`transfer_table_tab`), and Supabase Realtime broadcast channels (`station:bar`, `station:kitchen`, `foh:buzzout`).

---

## 🎯 Scope of Work

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Atomic In-Database Recipe Depletion (PL/pgSQL RPC)                 │
│    • Executed at Send Order (zero network latency & ACID row locks)   │
│    • Unit conversion & immutable stock_movements ledger entries       │
│    • Auto-86 trigger immediately disabling depleted products          │
│    • Void / Cancel item restoral (CANCEL_RESTORE vs waste_logs)       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Supabase Realtime Channels & Station Routing                        │
│    • postgres_changes for table occupancy, orders, and Auto-86       │
│    • Real-time FOH buzzout broadcast when ALL ticket items reach READY│
├────────────────────────────────────────────────────────────────────────┤
│ 3. Live Table & Tab Transfer Procedure (transfer_table_tab)           │
│    • Full table relocation vs single named tab moves                  │
│    • Broadcasts table_transferred to all staff tablets                │
│    • Active KDS tickets display visual re-routing badge               │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Atomic Bill Settlement & Drawer Procedure (settle_tab)             │
│    • Records payment (cash, card, wallet, comp) & corkage surcharge   │
│    • Updates cash_drawer_transactions on cash sales                   │
│    • Sets table is_occupied = false when all tabs on table are closed │
│    • Atomically enqueues CUSTOMER_RECEIPT into print_jobs queue       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Implementation Checklist

### Step 2.1: Atomic Recipe Depletion & Cancellation Procedures

- [x] Target file: [supabase/migrations/20261017000000_init_pos_schema.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261017000000_init_pos_schema.sql)
- [x] Implemented `dispatch_order_with_depletion(p_order_id uuid)`:
  - Deducts raw stock based on recipe BOMs with row-level locks (`FOR UPDATE`).
  - Writes immutable `stock_movements` rows with `movement_type: SALE_DEPLETION`.
  - Automatically updates `products.auto_86 = true` if ingredient drops to 0 or below.
- [x] Implement void/cancellation procedure `cancel_order_item_with_restoral`:
  ```sql
  CREATE OR REPLACE FUNCTION public.cancel_order_item_with_restoral(
    p_order_item_id UUID,
    p_staff_id UUID,
    p_reason TEXT
  ) RETURNS JSONB;
  ```
  - If item status is `PENDING` (not yet prepared): restores stock via `CANCEL_RESTORE` in `stock_movements`, resets `products.auto_86 = false` if stock rises above threshold.
  - If item status is `PREPARING` or `READY`: marks item `CANCELLED` and writes a loss record to `waste_logs` (does not restore spoiled ingredients).

### Step 2.2: Supabase Realtime Subscriptions & Station Routing

- [x] Target file: `frontend/src/store/useOrderStore.ts` & `frontend/src/services/realtime.ts`
- [x] Connect Supabase Realtime channels:
  - `station_bar`: Subscribes to `order_items` where `station_target = 'bar'`.
  - `station_kitchen`: Subscribes to `order_items` where `station_target = 'kitchen'`.
  - `foh_runner`: Subscribes to broadcast channel for `foh:buzzout` and `order_items` status updates.
  - `floor_tables`: Subscribes to `tables` and `tabs` for occupancy status.
- [x] Automated FOH Buzzout Evaluation:
  - Trigger or RPC emits broadcast `foh:buzzout` when the count of unready items for an order drops to zero.
- [x] Listen for live Auto-86 updates:
  - When `products` row is updated with `auto_86 = true`, order entry cards immediately grey out across all floor tablets.

### Step 2.3: Live Table Transfer Procedure

- [x] Target file: [supabase/migrations/20261017000000_init_pos_schema.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261017000000_init_pos_schema.sql)
- [x] Implemented `transfer_table_tab`:
  - Reassigns tab to target table.
  - Updates table occupancy (`is_occupied`) dynamically.
  - Inserts audit record into `table_transfer_logs`.
  - Broadcasts Realtime notification `table_transferred` across floor and KDS screens.
  - Active KDS tickets dynamically display re-routed table banner without interrupting prep timers.

### Step 2.4: Atomic Tab Settlement Stored Procedure

- [x] Target file: `supabase/migrations/20261018000003_billing_cancellation_and_drawer.sql`
- [x] Implement `settle_tab_and_record_payment`:
  ```sql
  CREATE OR REPLACE FUNCTION public.settle_tab_and_record_payment(
    p_tab_id UUID,
    p_staff_id UUID,
    p_payment_method public.payment_method,
    p_amount NUMERIC,
    p_corkage_amount NUMERIC DEFAULT 0.00,
    p_discount_amount NUMERIC DEFAULT 0.00,
    p_tip_amount NUMERIC DEFAULT 0.00
  ) RETURNS JSONB;
  ```
  - Inserts row into `payments` table.
  - Updates `tabs.status = 'BILLED'`, sets `closed_at = now()`.
  - If `p_payment_method = 'CASH'`, writes an entry into `cash_drawer_transactions` (`type = 'SALE'`).
  - Checks if origin table has any remaining `OPEN` tabs. If 0 remaining open tabs, marks `tables.is_occupied = false`.
  - Enqueues `CUSTOMER_RECEIPT` into `print_jobs` table (which automatically signals the printer station to print and kick the cash drawer).

### Step 2.5: Tabs & Order Intake via Supabase Client

- [x] Direct `@supabase/supabase-js` table operations:
  - Open Tab: `supabase.from('tabs').insert(...)` for Dine-In (tableId & guestName), Takeout (#T-105), or Online Delivery (Grab/Foodpanda).
  - Submit Orders: `supabase.from('orders').insert(...)` and `order_items.insert(...)` $\to$ call `rpc('dispatch_order_with_depletion')`.
  - Item Status: `supabase.from('order_items').update({ status: 'READY' }).eq('id', itemId)` $\to$ emits Realtime CDC update to Runner.
  - Settle Tab: Call `supabase.rpc('settle_tab_and_record_payment', { ... })`.

---

## 🔬 Verification & Validation

| Test Case               | Method                               | Expected Outcome                                                                 |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| Recipe Depletion Math   | Order 2x Flat White                  | `COF-001` decrements exactly 36g (0.036kg), `DRY-010` decrements 400ml (0.4L)    |
| Auto-86 Alert           | Reduce espresso stock to 10g         | Flat White immediately receives `auto86 = true` and emits `product:86`           |
| Pre-Prep Void Restoral  | Cancel Flat White while PENDING      | Stock movement `CANCEL_RESTORE` created, stock returned to inventory             |
| Post-Prep Void Loss     | Cancel Pasta while PREPARING         | Order item marked CANCELLED, loss written to `waste_logs`                        |
| Category Routing        | Order 1 Pasta + 1 Espresso Martini   | Pasta card routes to `kitchen`; Espresso Martini card routes to `bar`            |
| Table Transfer Re-Route | Move Tab from Table 2 to Table 5     | Bar and Kitchen active cards flash `🔁 RE-ROUTED: Table 2 ➔ Table 5`             |
| Atomic Tab Settlement   | Call `settle_tab_and_record_payment` | Tab closed, cash drawer updated, table freed, and receipt queued in `print_jobs` |
