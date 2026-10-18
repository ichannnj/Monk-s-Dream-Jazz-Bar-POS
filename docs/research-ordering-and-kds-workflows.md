# 🔬 Technical Research & System Blueprint: Complete Ordering Lifecycle & KDS Workflows

> **Repository:** Monk's Dream Jazz Bar POS  
> **Topic:** End-to-End Ordering Process, Multi-Station KDS Routing, Table Reordering (Rounds), Pre/Post-Prep Voiding, Course Pacing, Expediting, and Real-Time Kitchen Operations.  
> **Target Audience:** Systems Architects, POS & KDS Developers, Hospitality Operations.  
> **Output Location:** `docs/research-ordering-and-kds-workflows.md`  
> **Date:** October 19, 2026  
> **Primary Sources & References:**
>
> - Monk's Dream System Context: [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)
> - Database Schema & Stored Procedures: [supabase/migrations/20261017000000_init_pos_schema.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261017000000_init_pos_schema.sql), [20261018000003_billing_cancellation_and_drawer.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261018000003_billing_cancellation_and_drawer.sql)
> - POS Implementation Checklist: [phases/phase-2-realtime-gateway-depletion.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-2-realtime-gateway-depletion.md), [phases/phase-3-station-kds-tablets.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-3-station-kds-tablets.md)
> - Industry Standards: Toast POS KDS Architectural Patterns, Square for Restaurants Order Routing, Oracle MICROS Symphony Kitchen Operations.

---

## Executive Summary

The Kitchen Display System (KDS) and Floor POS at **Monk's Dream Jazz Bar** coordinate a high-tempo, dual-mode hospitality operation: high-turnover Daytime Cafe and seated Nighttime Jazz Lounge.

An order is not a static list of items; it is a **dynamic, distributed state machine** that connects Waiter tablets, Barista/Bartender workstations (`station_bar`), Kitchen Chef workstations (`station_kitchen`), the Front-of-House (FOH) Runner Expediter (`foh_runner`), and an ESC/POS Thermal Printing PC.

This research document analyzes the complete lifecycle, pinpoints architectural gaps in the current implementation, and provides a formal blueprint for:

1. **Ordering Ingestion & Category-Based Station Routing**
2. **Reordering & Add-on Orders (Sub-Order Rounds vs. Ticket Appending)**
3. **Item Voiding & Cancellation (Pre-Prep Restoral vs. Post-Prep Waste)**
4. **Course Management & Pacing (Hold vs. Fire)**
5. **Multi-Station Assembly & Runner Buzzout**
6. **Critical KDS Features Often Overlooked (Recall/Undo, All-Day Aggregator, 86ing Sync, Visual Timers)**

---

## 1. Complete End-to-End Ordering Lifecycle

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 1. POS ORDER INTAKE                                    │
│   • Waiter selects Table + Guest Tab (Dine-In), Takeout (#T-105), or Online Delivery   │
│   • Waiter selects products + modifiers (e.g. Oat Milk, Extra Shot, No Onion)          │
│   • Waiter taps "Send Order" (Dispatch)                                                │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        2. ATOMIC GATEWAY & PERSISTENCE (RPC)                           │
│   • Stored Procedure: dispatch_order_with_depletion(order_id)                          │
│   • Atomically deducts raw inventory (recipe BOMs) with row locks (FOR UPDATE)         │
│   • Evaluates Auto-86 thresholds (marks products.auto_86 = true if 0 stock)            │
│   • Inserts print_jobs row (Runner Chit auto-queued for USB ESC/POS daemon)            │
│   • Emits Supabase Realtime CDC events on order_items table                            │
└───────────────────────┬────────────────────────────────────────┬───────────────────────┘
                        │                                        │
           Beverages    │                                        │ Food
       (station_target = 'bar')                    (station_target = 'kitchen')
                        ▼                                        ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│       3A. BAR KDS (station_bar)       │ │       3B. KITCHEN KDS (station_kitchen)      │
│  • Espresso, Pour-overs, Cocktails    │ │  • Pasta, Pizza, Hot Apps, Desserts          │
│  • Color-coded timer (<5m / 5-10m / >10m)│• High-contrast Allergen Warning Banners     │
│  • Status: PENDING ➔ PREPARING        │ │  • Status: PENDING ➔ PREPARING               │
│  • When ready: marks item READY       │ │  • When ready: marks item READY              │
└───────────────────────┬───────────────┘ └──────────────────────┬───────────────────────┘
                        │                                        │
                        └───────────────────┬────────────────────┘
                                            │ Items reach READY
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                    4. FOH RUNNER EXPEDITER TABLET (foh_runner)                         │
│   • Aggregates all station targets for the order / tab (e.g. 2 Bar items + 1 Food)     │
│   • Progress bar tracking: e.g. "2 of 3 ready (67%)"                                   │
│   • BUZZOUT TRIGGER: When 100% of items for the ticket are READY                       │
│     - Emerald green pulsing highlight banner                                           │
│     - Audio chime: "🔔 BUZZOUT: ORDER READY FOR TABLE 4 / RUNNER PICKUP"               │
│   • Runner inspects physical tray, checks against printed chit                         │
│   • Runner taps "Mark Served to Table" or "Hand Off to Courier"                        │
│   • Updates order_items.status = 'SERVED', order.status = 'COMPLETED'                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Station Routing Architecture: Category-Based Invariants

### 2.1 The Cardinal Routing Rule

Item routing destination is strictly driven by the product's assigned `station_target` (`bar` vs `kitchen`), **never** by physical seating location:

| Product Category                       | Station Target | Destination Tablet Role     | Realtime Channel Filter                 |
| :------------------------------------- | :------------- | :-------------------------- | :-------------------------------------- |
| **Coffee, Espresso, Tea, Soft Drinks** | `bar`          | `station_bar` / `barista`   | `order_items?station_target=eq.bar`     |
| **Cocktails, Beer, Wine, Spirits**     | `bar`          | `station_bar` / `bartender` | `order_items?station_target=eq.bar`     |
| **Mains, Pasta, Pizza, Sandwiches**    | `kitchen`      | `station_food` / `kitchen`  | `order_items?station_target=eq.kitchen` |
| **Appetizers, Sides, Salads**          | `kitchen`      | `station_food` / `kitchen`  | `order_items?station_target=eq.kitchen` |
| **Desserts & Pastries (Plated)**       | `kitchen`      | `station_food` / `kitchen`  | `order_items?station_target=eq.kitchen` |

### 2.2 Split Station Tickets

When an order contains both bar and kitchen items:

- The database creates a single `orders` record referencing the `tab_id`.
- The child `order_items` records specify their individual `station_target`.
- The Bar KDS receives a ticket card showing **only the bar items**, with a visual badge: `🏷️ Multi-Station (1 Food at Kitchen)`.
- The Kitchen KDS receives a ticket card showing **only the kitchen items**, with a visual badge: `🏷️ Multi-Station (2 Drinks at Bar)`.
- The FOH Runner screen sees the **unified composite ticket** with dual-station progress bars.

---

## 3. Reordering & Additional Rounds (Add-On Orders)

### 3.1 The "Ticket Append" Antipattern vs. "Sub-Order Rounds"

In the existing frontend implementation (`OrderEntryModal.tsx`), when a waiter re-opens an active table tab:

> **Critical Discovery:** The cart is pre-populated with `initialItems = tab.items`. When the waiter adds a new item and taps "Send Order", the POS sends the **entire accumulated history** back to the server. This causes:
>
> 1. Duplicate items appended to `tab.items`.
> 2. Re-triggering of inventory depletion on drinks/food that were already prepared 30 minutes ago.
> 3. Ghost tickets appearing on the KDS as if the entire table reordered everything.

### 3.2 The Proper Hospitality Sub-Order / Round Model

In industry-standard POS/KDS systems (Toast, MICROS):

1. **Rounds / Firing Batches:** Each dispatch generates a distinct `orders` record linked to the same `tab_id`, tagged with an incremental `round_number` (e.g., Round 1, Round 2).
2. **KDS Ticket Isolation:**
   - Round 1 ticket: Contains items ordered at 19:30 (Timer: 25m, marked `SERVED`).
   - Round 2 ticket: Contains items ordered at 19:55 (Timer: 01m, marked `NEW` / `PREPARING`).
   - The KDS displays a prominent badge: `🔁 ROUND 2 (ADD-ON)`.
   - The station timer starts at `00:00` for Round 2, without resetting or distorting Round 1 metrics.
3. **Bill Aggregation:** The customer tab (`tabs`) aggregates all line items across all rounds for transparent settlement.

---

## 4. Voiding, Cancellations, and Restoral Engine

Voiding is a high-risk operational action that impacts inventory, food waste, KDS displays, and financial audit trails.

### 4.1 Two Distinct Cancellation Paths

```
                               ┌─────────────────────────────┐
                               │  Waiter Initiates Item Void │
                               └──────────────┬──────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         Item Status: PENDING (Pre-Prep)               Item Status: PREPARING or READY (Post-Prep)
                      │                                               │
                      ▼                                               ▼
     ┌─────────────────────────────────┐             ┌──────────────────────────────────┐
     │      PRE-PREP RESTORAL          │             │         POST-PREP WASTE          │
     │ • Ingredients not physically used│             │ • Food/drink already poured/made │
     │ • Stored Proc: cancel_order_item│             │ • Stored Proc: cancel_order_item │
     │ • Writes stock_movements:       │             │ • Ingredients cannot be restored │
     │   type = 'CANCEL_RESTORE'       │             │ • Writes waste_logs record with: │
     │ • If item had auto_86, checks if│             │   reason (SPOILAGE, ERROR, etc.) │
     │   stock > min and clears 86     │             │ • Requires Manager PIN override  │
     │ • Ticket removed/struck out KDS │             │ • Card flashes red VOID banner   │
     └─────────────────────────────────┘             └──────────────────────────────────┘
```

### 4.2 KDS Void Notification (Preventing Ghost Cooking)

When an item is voided from the floor POS:

1. If the station has not yet started (ticket is `PENDING`), the line item is removed or struck through with a red strikethrough: `~~1x Craft IPA~~ (VOIDED)`.
2. If the station is actively `PREPARING`:
   - An audible alert triggers on the KDS.
   - A pulsing red alert banner appears on the ticket: `🚨 ITEM CANCELLED BY WAITER — DO NOT PREPARE`.
   - The chef/bartender taps "Acknowledge Void" to clear the item from their prep queue.

---

## 5. Course Management & Pacing (Hold & Fire)

In high-end jazz lounges and full-service dining, guests do not want their main entrees arriving simultaneously with their appetizers.

### 5.1 Course Definitions

- **Course 1 (Drinks / Starters):** "FIRE IMMEDIATELY" (Bar & Cold/Hot Apps).
- **Course 2 (Entrees / Mains):** "HOLD" or "FIRE WITH STARTERS".
- **Course 3 (Dessert / Digestif):** "HOLD".

### 5.2 KDS Representation of Held Items

1. **POS Control:** Waiter assigns items to courses (`Drinks`, `Starters`, `Mains`, `Dessert`).
2. **KDS "HELD" State:**
   - Items set to "HOLD" appear dimmed or in a collapsible "HELD" section on the kitchen screen with a pause icon: `⏸️ HELD (Waiting for Waiter Fire)`.
   - The station timer does not tick for held items.
3. **Waiter Fire Action:** When the waiter sees guests finishing appetizers, they tap "Fire Mains for Table 4" on their handheld tablet.
4. **KDS Fire Event:** The held items instantly transition to `PENDING`, chime on the kitchen KDS, and their timers begin at `00:00`.

---

## 6. Real-Time Operational Features Often Overlooked

Hospitality research reveals several crucial operational failure points in standard KDS designs:

### 6.1 The "Accidental Bump" & The Recall Buffer

- **Problem:** In a fast-paced kitchen, greasy or wet fingers accidentally tap "Done" / bump a ticket off the screen. Without a recovery mechanism, the chef forgets what was on the ticket and orders get lost.
- **Solution:** A **Recall / Undo Buffer** on the KDS header. A "Recall Last Ticket" button reopens the most recently completed ticket within 10 minutes and places it back in `PREPARING` or `READY`.

### 6.2 All-Day / Batch Preparation Aggregator

- **Problem:** During a rush, a bartender has 6 tickets waiting with a combined 11 Flat Whites, 4 Negronis, and 5 Old Fashioneds. Looking at individual tickets forces mental arithmetic and causes inefficient single-drink preparation.
- **Solution:** An **"All-Day Summary" Drawer / Header Pill** that sums pending quantities across all active tickets:
  `[ Summary: 11x Flat White | 5x Old Fashioned | 4x Negroni ]`. The bartender can pull 4 shots simultaneously or batch cocktails.

### 6.3 Urgency Aging & Flashing Thresholds

- Standard 3-stage visual aging:
  - **Normal (0 - 5 mins):** Neutral / Green badge.
  - **Warning (5 - 10 mins):** Amber badge with subtle alert.
  - **Critical (> 10 mins):** Red pulsing border, bold elapsed timer (`12:45`), elevated to the leftmost position on the board.

### 6.4 Bi-Directional 86ing (Out-of-Stock Sync)

- **Automatic:** Triggered when `inventory_items.current_stock <= 0` during order dispatch.
- **Manual (KDS Direct):** If the kitchen runs out of Sea Bass during service, the chef shouldn't have to walk to the cashier. They tap "86 Item" on the Kitchen KDS. Supabase Realtime pushes `products.auto_86 = true` to all floor tablets, disabling the item immediately so waiters cannot submit new orders for it.

### 6.5 Live Table Transfers & Tab Re-Routing

- When a party moves from `Table 2` to `Table 5`:
- The ticket currently being prepped on the KDS must **not** disappear or reset its timer.
- It displays a prominent animated amber banner: `🔁 RE-ROUTED: Table 2 ➔ Table 5 (Guest: Miles)`.
- When the runner buzzout triggers, the destination says `Deliver to Table 5`.

---

## 7. Comparative Industry Standards Matrix

| Capability            | Basic MVP / POS                | Toast / MICROS Enterprise                 | Monk's Dream Target Architecture                                                      |
| :-------------------- | :----------------------------- | :---------------------------------------- | :------------------------------------------------------------------------------------ |
| **Routing Mechanism** | Table area or manual print     | Category-based auto-split                 | **Category-based station routing (`bar` vs `kitchen`) via Supabase CDC**              |
| **Reorder Handling**  | Overwrites or duplicates cart  | Sub-order rounds with round badges        | **Incremental sub-orders (`orders` per round), shared `tab_id`, empty new cart**      |
| **Voiding Mechanism** | Delete from local memory       | Pre-prep restoral vs. Post-prep waste log | **Atomic stored proc `cancel_order_item_with_restoral`, auto-86 restoral, waste log** |
| **Expediting**        | Waiter checks counter manually | Dedicated Expediter screen with buzzout   | **FOH Runner tablet (`foh_runner`) with multi-station aggregation & buzzout chime**   |
| **Accidental Bump**   | Lost ticket                    | Recall buffer                             | **10-ticket sliding Recall tray on all KDS stations**                                 |
| **Prep Aggregator**   | None                           | All-Day quantity totals                   | **Live "All-Day" batching counter on Barista & Chef headers**                         |
| **86 Coordination**   | Manual whiteboard              | Bi-directional cloud sync                 | **Realtime CDC broadcast of Auto-86 & KDS manual 86 toggle**                          |

---

## 8. Summary of Codebase Architecture Gaps to Address

1. **Cart Reordering Bug in `OrderEntryModal.tsx` & `useOrderStore.ts`:**
   - Must decouple existing items on an open tab from new round items being ordered.
   - The modal must open with an empty new round basket, with a collapsible "Tab History" panel.
2. **Item Voiding UI Missing in Waiter Floor Screens:**
   - Waiter currently cannot cancel or void an ordered item from `TableActionModal.tsx`.
   - Must wire a "Void / Cancel Item" modal with reason selection (`Guest Cancelled`, `Wrong Entry`, `Spill`) and manager PIN authorization if already in prep.
3. **KDS Ticket Actions & Realtime Sync:**
   - Ensure line items can be updated individually (`PENDING` -> `PREPARING` -> `READY`) via `ordersApi.updateOrderItemStatus`.
   - Wire the "Recall" button to un-bump recently cleared tickets.
   - Provide an "All-Day Summary" view for quick batching on `BaristaKdsHeader` and `KitchenKdsHeader`.
