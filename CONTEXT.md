# 🎷 CONTEXT.md — Monk's Dream Jazz Bar System & Business Context

> **Audience:** Developers, Architects, AI Agents, and Product Stakeholders  
> **Purpose:** Authoritative reference for domain invariants, business models, hardware topology, and system architecture.

---

## 🏛️ Venue Concept & Operating Modes

**Monk's Dream Jazz Bar** operates as a dual-concept hospitality venue:

1. **☀️ Normal Cafe Mode (Daytime):**
   - High-throughput artisan espresso bar, pour-overs, pastries, and brunch.
   - Fast counter ordering, quick table turns, and takeout/delivery flow.
2. **🎷 Event Mode (Nighttime Live Jazz Lounge):**
   - Intimate seated cocktail lounge, craft spirits, wine, kitchen dining, and live musical performances.
   - Tagged event revenue sessions, table-side waiter service, tab transfers, and corkage management.

### Operating Mode Architecture & Revenue Segregation Invariant:

- **Master Venue Switch & Confirmation Dialog:** Managed via `venue_settings.operating_mode` (`'CAFE' | 'EVENT'`) and `venue_settings.mode_switched_at`. Switching modes from either Admin Back-Office (`AdminHeader`, `AdminMobileDrawer`) or Floor POS Command Bar always prompts a confirmation modal (`ManagerModeSwitchModal.tsx`, requiring Manager PIN `9999` for non-admin roles).
- **6:00 AM Daily Automatic Revert to Cafe Mode:** Event Mode automatically reverts to Daytime Cafe Mode (`'CAFE'`) every morning at **6:00 AM** via PostgreSQL `reconcile_operating_mode_6am()`, tab-creation trigger `trg_reconcile_tab_mode_before_insert`, `pg_cron`, and live `useVenueStore` 6:00 AM timers + wakeup checks.
- **Reactive Synchronization:** Client state is synchronized reactively across all workstations via `useVenueStore` listening on Supabase Realtime channel `pos_venue_settings_sync`.
- **Creation-Time Tagging:** New customer tabs inherit the active operating mode at creation time (`tabs.operating_mode`). Open tabs maintain their tagged mode across shift transitions to prevent artificial mid-service revenue reallocations.
- **Settlement Cascade:** When settled, `settle_tab_and_record_payment` atomically writes the tab's `operating_mode` into `payments.operating_mode`.
- **Three-Way Revenue Reporting:** Dashboards, Sales Overview, Settled Checks, Shift Readings (X/Y/Z), and Excel workbooks compute and display three distinct financial dimensions:
  1. **Cafe Mode Sales & Transactions**
  2. **Event Mode Sales & Transactions**
  3. **Consolidated Venue Total (Cafe + Event)**

---

## 🔑 Crucial Domain Rules & Invariants

### 1. Staff Roles & Credentials Matrix

| Role                | Login Credential / Floor Override                          | Primary Responsibilities                                                    |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Admin / Manager** | `MonksDream9999!` (Password) / `9999` (Floor Override PIN) | Full access: recipe builder, stock audit, shift payroll, system settings    |
| **Cashier**         | `1111` (PIN)                                               | Register, takeout queue, third-party delivery intake, bill settlement       |
| **Floor Waiter**    | `2222` (PIN)                                               | Floor table ordering, customer named tabs, table moves & transfers          |
| **Bartender**       | `3333` (PIN)                                               | Bar KDS tablet (`station_bar`): cocktails, liquor, wine prep                |
| **Barista**         | `4444` (PIN)                                               | Bar KDS tablet (`station_bar`): coffee, espresso, teas, daytime drinks      |
| **Kitchen Chef**    | `5555` (PIN)                                               | Kitchen KDS tablet (`station_kitchen`): hot food, pasta, pizza, prep        |
| **FOH Runner**      | `6666` (PIN)                                               | Expediter Buzzout tablet (`foh_runner`): tray dispatch & delivery packaging |

> **Dual-Mode Login & Cryptographic Secret Hashing (`pgcrypto` Bcrypt):**
>
> - **Admin Password Portal:** Administrator console sign-in strictly requires Username/Email and a secure password (`authenticate_admin_credentials`). Admin accounts are forbidden from signing in via PIN alone.
> - **Floor Manager Override PIN:** In high-speed service, floor supervisors use their 4-digit Manager Override PIN (`verify_manager_override_pin`) for rapid on-floor approvals (item voids after prep and Cafe/Event mode switches) without exposing the master back-office password.
> - **Zero Plaintext Secrets at Rest:** All passwords (`password_hash`) and staff PINs (`pin_hash`) are cryptographically hashed using PostgreSQL `pgcrypto` Blowfish bcrypt (`$2a$10$`). Plaintext PINs are automatically masked (`'****'`) upon creation.
> - **Admin Profile & Security Management (`AdminProfileView.tsx`):** Dedicated back-office view allowing managers to update their personal identity, rotate passwords (gated by current password verification and live complexity meters), rotate Floor Override PINs, and audit security timestamps (`last_login_at`, `password_updated_at`, `pin_updated_at`).

> **Unified Floor & Counter Intake Role:** Floor staff perform both table ordering and checkout/billing on handheld tablets without needing role-switching or manager overrides. Counter staff (Baristas/Bartenders on `station_bar`) also have access to the full shared Floor POS (`FloorWorkspaceView`), Checks History, and Cash Drawer directly from their KDS tablet for customers ordering walk-up at the bar.
>
> **Dual Staff Identity Model (POS Users vs. Non-User Venue Staff):**
>
> - **POS App Users (`is_workflow_staff: true`):** Operational staff who log into POS tablets with a `username` and a 4-digit numeric `pin`, assigned to one of the system terminal roles (`admin`, `cashier`, `waiter`, `station_bar`, `station_cafe`, `station_food`, `foh_runner`).
> - **Non-User Venue Personnel (`is_workflow_staff: false`):** Venue support staff who do not use POS terminals (e.g., Dishwashers, Security, Cleaners, Sound Techs, Musicians, Barbacks, Kitchen Prep). They are registered in `public.users` with a custom `job_title` and `pin = NULL` for daily shift payroll and discretionary bonuses, while `authenticate_staff_credentials` strictly blocks non-workflow staff from logging into POS terminals.

### 2. Category-Based Station Routing (Not Location-Based)

Item preparation destination is determined solely by product category, **never** by physical seating area:

- **Beverages & Bar:** Coffee, tea, soft drinks, cocktails, beer, wine $\rightarrow$ routes to **Bar Tablet KDS** (`station:bar`).
- **Food & Kitchen:** Pasta, pizza, appetizers, desserts $\rightarrow$ routes to **Kitchen Tablet KDS** (`station:kitchen`).
- **Station Auto-Start Invariant:** When an order is entered and dispatched directly from the Bar KDS (`station:bar`), the barista's own drink items automatically start in `preparing` status on the Bar KDS board, while food items route to Kitchen KDS in `new` (`pending`) status.
- _Note:_ Table Grid Filters (e.g., "Cafe Area" vs. "Bar Area") organize physical floor tables and never alter kitchen/bar station routing.

### 3. KDS Hardware Constraint (Strict Architectural Rule)

- **Zero Public Screens:** Overhead TV displays, public queue monitors, and customer-facing buzz screens are **strictly forbidden**.
- **Tablet Workstations:** All KDS interfaces run on authenticated staff tablets mounted at counters (`station:bar`, `station:kitchen`) or handheld (`foh_runner`).

### 4. Financial & Pricing Calculations

- **Resold Outside Food Rule:**  
  $$\text{Base Price} = \text{Original Cost} \times 1.20 \quad (\text{fixed locked } +20\% \text{ margin})$$
- **Corkage Fee Rule:**  
  Fixed 20% surcharge toggle applied to customer tabs when outside wine/liquor is consumed.
- **Split Billing by Customer Name:**  
  Tables support multiple independent customer tabs (e.g., Table 4 $\rightarrow$ `Tab: Alice`, `Tab: Bob`). Guests can transfer or settle their own tabs independently.

### 5. Inventory Depletion, Supply Chain & Recipe BOM Engine

- **Trigger Point:** Depletion occurs at **Order Dispatch** (when staff taps "Send Order").
- **Cancellation Restoral:** If an order item is cancelled before preparation starts, depleted stock is automatically restored to the active inventory ledger (`CANCEL_RESTORE`).
- **Auto-86 Safeguard:** POS menu items automatically grey out when required raw ingredient stocks breach critical minimum thresholds.
- **Recipe BOM Units:** Precise measurements (`g`, `ml`, `pcs`, `shots`) defined per menu item in `product_ingredients` with conversion factors to stocking units.
- **Hierarchical Modifier Groups:** Reusable and product-level modifier groups enforce `min_selections`, `max_selections`, and `is_required` constraints. Modifiers declare explicit inventory deltas (e.g., Oat Milk Swap deducts +200ml oat milk).
- **Dual Packaging Depletion:** Packaging goods (`PACKAGING` inventory category) can be bound to item recipes or automatically decremented on Takeout/Online Delivery orders.
- **Suppliers & Moving Average Cost (MAC):** Shipments update item stock and recalculate unit cost via the Weighted Moving Average Cost formula.
- **Physical Stocktake & Variance Auditing:** Cycle counts record Expected vs Actual quantities, calculate financial loss, and post atomic adjustments (`STOCKTAKE_ADJUST`) to the immutable ledger.
- **Waste & Spillage Logging:** Losses due to drops, expired ingredients, prep errors, or customer returns are logged to overhead expenses with standard reason codes.

### 6. Two-Print Thermal Printing Workflow

Printing is handled via a dedicated Linux PC running ESC/POS USB drivers:

1. **Order Dispatch Slip (Runner Chit):** Auto-prints upon tapping "Send Order" (checklist, customer name, destination table/tag) to clip to the serving tray.
2. **Customer Payment Receipt:** Prints upon payment settlement (itemized breakdown, taxes, payment method).
3. **Sales & Transactions Executive Reporting Suite:**
   - **Tab 1 (Financial Overview):** Real database analytics filtered by dynamic timeframe (Daily/Today, WTD, MTD, YTD, Specific Day) and fulfillment station (`ALL`, `CAFE_AREA`, `BAR_AREA`, `TAKEOUT_COUNTER`, `GRAB_FOOD`), powered by live `HourlySalesVelocityChart` (day-part revenue pacing & peak hour tracking), `PaymentTenderMixBar` (Cash, Card, Digital Wallet, Delivery mix), multi-channel revenue distribution, and 1-click executive Excel workbook generation (`exportFinancialOverviewToExcel`) & publication-grade A4 document printing.
   - **Tab 2 (Checks & Reprints):** Live database audit trail (`checksApi.fetchSettledChecks`) joining `payments`, `tabs`, `tables`, and `order_items`, with channel filter pills (All, Dine-In, Takeout, Online Delivery), instant search query, itemized check inspector with full line-item tax/service charge breakdown, dual-mode reprint (ESC/POS thermal print queue + browser print/PDF receipt), and full checks register spreadsheet export (`exportChecksRegisterToExcel`).
   - **Tab 3 (X-Y-Z Shift Readings):** Interim mid-shift non-destructive audit (X-Reading), cashier shift handover with denomination counter & staff signature blocks (Y-Reading), and official end-of-day fiscal settlement with sequential Z-number counter (Z-Reading) in Admin Back-Office (`PIN: 9999`), supported by drawer waterfall, variance trend graphs, searchable & till-filtered historical archives, 80mm ESC/POS thermal printing, and publication-ready A4 document layout.

---

### 7. Feature-First Modular Architecture (250–350 LOC Invariant)

To ensure token efficiency and prevent maintenance degradation:

- **Feature-First Organization:** Capabilities are organized under `frontend/src/features/<capability>/` with explicit folder responsibilities (`presentation/`, `application/`, `domain/`, `data/`).
- **Feature-Owned Application Stores:** State stores and API clients are directly owned and exported by their respective feature modules (e.g., `frontend/src/features/orders/application/useOrderStore.ts`), eliminating redundant facade layers.
- **250–350 LOC Standard:** Maintain a target ceiling of 250–350 physical lines per file, separating views, state, and domain logic cleanly.
- **Admin Console & Operations Command Center:** Manager console (`role: 'admin'`, PIN `9999`) provides real-time telemetry (sales in ₱, hourly curve, best sellers, station ticket turnarounds, and needs-attention alerts) with full sidebar access to Inventory MAC Hub & restock intake, Recipe BOM (+20% outside food rule), Staff attendance & bonuses, Station KDS monitoring, Checks history, and interactive slide-over Team Chat.
- **Tablet Team Chats & Inter-Station Comms:** Unified 2-column communication workspace (`features/chat`) directly persisted to Supabase PostgreSQL (`chat_conversations`, `chat_participants`, `chat_messages`), featuring zero mock data at runtime, Supabase Realtime synchronization across all stations, Messenger-style auto-scrolling with smart bottom anchoring and jump pills, 1-on-1 staff Direct Messages, pinned shift announcements (allergies/briefings), and POS system alert card streaming across Floor POS, KDS tablets, and Admin.
- **Dropdown-First Visual Declutter & Phone-to-Desktop Responsiveness:** Every operational screen (`WaiterCashierScreen`, `FloorWorkspaceView`, `UnifiedKdsScreen`, `FohRunnerScreen`), modal (`OrderEntryModal`, `TableActionModal`, `BillSettlementModal`), and Admin Back-Office view uses the shared `PosDropdown` primitive (`features/shared/ui/PosDropdown.tsx`) to consolidate sub-tab bars, category/channel/status filter pill walls, and multi-button action bars into clean 48px+ dropdown triggers, scaling smoothly down to ~360px mobile viewports.

---

### 8. Zero-Contradiction SSOT Architecture & Atomic Settlement Cascade

To guarantee that Floor POS, Station KDS, Cashier Settlement, and Admin Dashboard never show contradictory states or ghost tickets:

- **Single Source of Truth (SSOT):** PostgreSQL is the authoritative record. Active tickets across KDS boards and Admin Telemetry strictly require `tabs.status = 'OPEN'` and `orders.status IN ('OPEN', 'IN_PREPARATION')`.
- **Atomic Settlement Cascade & Off-Premise Handoff:** In PostgreSQL RPC `settle_tab_and_record_payment`, settling a dine-in tab atomically sets `tabs.status = 'BILLED'`, cascades `orders.status = 'COMPLETED'`, and sets un-served `order_items.status = 'SERVED'`. For prepaid Takeout orders settled at the counter before preparation finishes, `p_keep_open_for_prep = true` records the payment, cash drawer ledger entry, and receipt print job while keeping `tabs.status = 'OPEN'` and KDS items active until collected (`complete_off_premise_tab`). Unpaid (`DUE`) takeout orders enforce payment collection via `BillSettlementModal` (`Pay Now` / `Pay & Collect`) before collection.
- **Authoritative Table Occupancy & Auto-Healing:** Physical tables are occupied if and only if they have an active `OPEN` tab. The database trigger `trg_sync_table_occupancy` continuously reconciles `tables.is_occupied`, the Admin Telemetry engine auto-heals desynced tables, and managers have an emergency `admin_force_release_table` action in Floor Layout View.
- **Event-Driven Real-Time Multi-Subscriber Sync & Live Elapsed Timers:** `RealtimeGateway` (`features/shared/infrastructure/realtime.ts`) multiplexes `pos_global_sync` (`postgres_changes` + `pos_sync_broadcast`) across all active subscribers (`useOrderStore` and `AdminBackOfficeScreen`) with a 400ms debounce so all connected Floor POS, Station KDS, Runner, and Admin screens stay synchronized in real time. All order, table, KDS ticket, runner card, and Admin station turnaround timers (`MM:SS` / `H:MM:SS`) tick live every second from server `created_at` / `opened_at` ISO timestamps via `features/shared/utils/elapsedTime.ts`.
- **Station Telemetry Metrics:** When a station's active preparation queue is 0, speed strictly displays `'Idle'` instead of synthetic placeholder strings. When active tickets exist, station average turnaround (`avgTicketTime`) and overdue count (`lateTickets`) tick live every second from `activeTicketTimestamps`.

---

## 🗺️ System Topology

```
                  ┌──────────────────────────────────────────────────┐
                  │       Multi-Channel POS Intake (Tablets)         │
                  │  [Dine-In Tables]  [Takeout]  [Grab/Foodpanda]   │
                  └─────────────────────────┬────────────────────────┘
                                            │
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │            Supabase BaaS / Postgres              │
                  │   Realtime WebSockets, Row-Level Security, Auth  │
                  └─────────────┬──────────────────────┬─────────────┘
                                │                      │
                 Beverages / Bar│                      │Food / Kitchen
                                ▼                      ▼
                    ┌──────────────────────┐┌──────────────────────┐
                    │  Barista / Bartender ││ Kitchen Chef Station │
                    │   Station KDS (Tab)  ││   Station KDS (Tab)  │
                    └───────────┬──────────┘└──────────┬───────────┘
                                │                      │
                                └───────────┬──────────┘
                                            │ Items Marked READY
                                            ▼
                                ┌──────────────────────┐
                                │  FOH Runner / Buzzout │
                                │   Tablet Expediter   │
                                │   (station:foh_runner)
                                └───────────┬──────────┘
                                            │ Auto-print dispatch
                                            ▼
                                ┌──────────────────────┐
                                │ ESC/POS USB Printer  │
                                │   Thermal Station    │
                                └──────────────────────┘
```

---

## 📚 Related Documentation

- Architecture & File Tree Map: [AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)
- Implementation Roadmap: [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md)
- Developer Onboarding & Commands: [CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)
