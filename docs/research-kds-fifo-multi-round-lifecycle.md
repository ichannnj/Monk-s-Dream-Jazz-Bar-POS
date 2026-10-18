# KDS Multi-Round Lifecycle, FIFO Queue Management & Runner Handoff Research

> **Primary Source References:**
>
> - Toast POS Restaurant Operating Guide: Multi-Round & Course Pacing Architecture (2024)
> - Square for Restaurants KDS & Expediter Screen Documentation (2024)
> - Micros Simphony KDS Dispatcher & Order Status Specifications (Oracle Hospitality)
> - Monk's Dream Jazz Bar Technical Requirements (`REQUIREMENTS.md` Section 3.2, 3.4 & 4.1)
> - High-Trust POS Architecture Patterns: Single Source of Truth in Real-Time Touchscreen KDS

---

## 1. Executive Summary & Problem Framing

In high-volume hospitality environments like jazz bars and bistros, guests rarely order all drinks and food in a single transaction. Instead, tables order in **rounds**:

1. **Round 1 (Opening/Aperitifs):** Cocktails, wine, and appetizers.
2. **Round 2 (Mains & Refreshments):** Entrees, beers, coffee, and water.
3. **Round 3+ (Dessert & Digestifs):** Dessert, digestif cocktails, espresso.

When multiple rounds are placed on the same table or tab:

- **Station Filtering:** Items must route strictly to their preparation stations (`bar` or `kitchen`). A kitchen line cook should never see drink tickets, and a bartender should never see pasta orders.
- **Initial Status Invariant:** New rounds sent by the server must land in the **NEW** column (`PENDING` status). They must never skip directly to `PREPARING`.
- **FIFO / FCFS Queueing:** Tickets in all columns (`NEW`, `PREPARING`, `READY`) must strictly follow First-Come First-Served (FCFS) / First-In First-Out (FIFO) ordering based on order submission timestamp. Oldest orders stay at the top/front of the queue to prevent kitchen blind spots.
- **Round-Level Card Atomicity:** Collapsing all items across rounds into a single table card destroys operational clarity. Each round must act as an independent ticket with its own timer, station items, and progression lifecycle (`Start` $\to$ `Ready` $\to$ `Delivered/Served`).
- **Clearing the Ready Queue upon Delivery:** Once items or rounds are delivered to the guest table (confirmed by FOH Runner or Floor Server), they must be marked `SERVED` and immediately pruned from the `READY` column on both the prep station KDS and the FOH Expediter screen.

---

## 2. Industry Best Practices & Architecture Patterns

### 2.1 Multi-Round Order Structure: The "Sub-Order Round" Model

Commercial KDS platforms (such as Toast POS and Square KDS) model rounds as discrete sub-orders attached to an active parent tab:

- **Parent Tab:** Holds the running balance, customer identity, and table association (`Table 4 · Tab 1`).
- **Child Round Tickets:** Each dispatch generates a sub-order record (`Order #T4-1-R1`, `#T4-1-R2`, `#T4-1-R3`) with a distinct timestamp (`created_at`) and round number (`round_number`).
- **Station Decomposition:** At the station level, the round ticket displays **only** the items belonging to that station. If Round 2 contains 2 Negronis (`bar`) and 1 Pizza (`kitchen`):
  - Bar KDS receives: `Table 4 · Tab 1 (Round 2)` with 2 Negronis.
  - Kitchen KDS receives: `Table 4 · Tab 1 (Round 2)` with 1 Pizza.
  - FOH Expo receives: `Table 4 · Tab 1 (Round 2)` showing both items with consolidated readiness tracking.

### 2.2 FIFO / FCFS Scheduling

In professional kitchens, FIFO order processing prevents ticket starvation (where old tickets sit unnoticed while new tickets are grabbed).

- **Sort Key:** `created_at ASC` (oldest order first).
- **Elapsed Timer:** Dynamically computes duration since ticket dispatch.
  - `< 5 mins`: Green / Normal.
  - `5 - 10 mins`: Yellow / Alert.
  - `> 10 mins`: Red / Urgent flashing alert.
- **Column Invariance:** Within each column (`NEW`, `PREPARING`, `READY`), tickets remain sorted strictly by timestamp ascending.

### 2.3 Ready Queue Removal & The Expediter Hand-Off

A common bug in custom KDS implementations is tickets "sticking" in the `READY` column forever after preparation is done.

- **Prep Station Responsibilities:** The cook/bartender hits **Ready** when the dish is on the pass window. This moves the ticket to `READY` on their station and triggers an audio chime / buzzout on the FOH Expediter screen.
- **Expediter / Server Responsibilities:** The runner picks up the tray, carries it to the guest table, and taps **Mark Served** (or **Handoff**).
- **Immediate Pruning:** Marking an item or round `SERVED` updates the database item status (`status = 'SERVED'`).
- **Reactive Derivation:** Prep KDS screens and FOH Expo screens must derive their active ticket lists reactively. Once a ticket's items are all `SERVED` (or `CANCELLED`), the ticket is excluded from the active board and vanishes from the `READY` column.

### 2.4 Single Source of Truth vs. Local Component State

In React Native / Web tablet apps, storing ticket arrays in local component `useState` causes state divergence:

1. If the waiter dispatches Round 2, the local state of KDS may not incorporate it or may lose timer references.
2. If another tablet marks an item `SERVED` or `VOIDED`, local component state retains stale data unless elaborate synchronization is maintained.
3. **Recommended Architecture:** Derive KDS tickets directly from the global Zustand store (`useOrderStore`) via pure `useMemo` selectors. The store is kept synchronized with PostgreSQL via Supabase Realtime (`postgres_changes` on `order_items`, `orders`, and `tabs`).

---

## 3. Gap Analysis in Current Implementation

| Requirement Area          | Current Codebase State                                                                                                                                                                            | Root Cause                                                                                                                                           | Proposed Solution                                                                                                                                   |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New Round Status**      | Order items in newly dispatched rounds were previously mutated to `PREPARING` by DB procedure. (Fixed via migration `20261019000003_preserve_pending_status_on_dispatch.sql` pushed to local DB). | `dispatch_order_with_depletion` updated items to `PREPARING` instead of preserving `PENDING`.                                                        | Migration now keeps items `PENDING`. Frontend also ensures initial state is `pending`.                                                              |
| **Station Routing**       | Filtered by `item.stationTarget === stationTarget`, but tab items hydration sometimes mapped products with missing fallback station targets.                                                      | Non-UUID product IDs in mock or seed data fell back to defaults without checking product catalog.                                                    | Standardize product resolution and enforce strict `'bar' \| 'kitchen'` tagging in menu items and line items.                                        |
| **Ready Queue Pruning**   | Completed tickets remained stuck in `READY` column on `UnifiedKdsScreen.tsx` even after runner marked them served.                                                                                | `UnifiedKdsScreen.tsx` maintained an internal `useState` that only appended new tickets and never pruned tickets whose items reached `served`.       | Replace internal `tickets` state with reactive `useMemo` derived from `useOrderStore` where items with `status === 'served'` are pruned.            |
| **FOH Runner KDS Rounds** | `FohRunnerScreen.tsx` grouped all items of a table across all rounds into one monolithic card.                                                                                                    | `FohRunnerScreen.tsx` looped `table.tabs` and accumulated all items into `list.push({ id: `tbl-${table.id}-${tab.id}` })` without grouping by round. | Refactor `FohRunnerScreen.tsx` to group items by `roundNumber`, producing atomic round cards (`Round 1`, `Round 2`, `Round 3`).                     |
| **FIFO / FCFS Sorting**   | Inconsistent sorting; `UnifiedKdsScreen` prepended new tickets (`[...liveNewTickets, ...prev]`), causing LIFO order in some columns.                                                              | Lack of explicit timestamp sort comparator.                                                                                                          | Implement strict FIFO sort comparator `(a, b) => a.createdAt - b.createdAt` (or `minutesElapsed DESC` / creation timestamp ASC) across all columns. |

---

## 4. Architectural Blueprint for Monk's Dream Jazz Bar

```mermaid
graph TD
    A[Floor POS: Waiter takes Round N] -->|Dispatches with roundNumber: N| B[Zustand useOrderStore]
    B -->|ordersApi.createOrderWithItems| C[(PostgreSQL Database)]
    C -->|dispatch_order_with_depletion| C
    C -.->|Realtime postgres_changes| B

    B -->|Reactive Selector: stationTarget = bar| D[Bar KDS: UnifiedKdsScreen]
    B -->|Reactive Selector: stationTarget = kitchen| E[Kitchen KDS: UnifiedKdsScreen]
    B -->|Reactive Selector: all stations grouped by round| F[FOH Runner KDS: FohRunnerScreen]

    subgraph KDS Kanban Stages (FIFO Sorted)
        D1[NEW Column: PENDING] -->|Tap 'Start'| D2[PREPARING Column]
        D2 -->|Tap 'Ready'| D3[READY Column]
        D3 -->|FOH Runner / Server delivers to table| D4[SERVED: Pruned from Ready Queue]
    end
```

---

## 5. Verification Checklist

- [x] Local Postgres stored procedure `dispatch_order_with_depletion` keeps item status `PENDING`.
- [ ] Round 1, Round 2, Round 3+ items land strictly in their station KDS in the `NEW` column.
- [ ] FOH Runner KDS presents cards segmented strictly per-round with distinct `Round 1`, `Round 2` badges.
- [ ] Both Prep KDS and FOH KDS sort tickets strictly by FIFO (oldest first).
- [ ] Delivering / serving items or rounds removes the ticket from the `READY` column immediately.
