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
> **Dual Staff Identity Model & Universal Timeclock Kiosk:**
>
> - **POS App Users (`is_workflow_staff: true`):** Operational staff who log into POS tablets with a `username` and a 4-digit numeric `pin`, assigned to one of the system terminal roles (`admin`, `cashier`, `waiter`, `station_bar`, `station_cafe`, `station_food`, `foh_runner`). Logging into a POS terminal automatically registers their daily timeclock clock-in if not yet punched.
> - **Non-User Venue Personnel (`is_workflow_staff: false`):** Venue support staff who do not use POS terminals (e.g., Dishwashers, Security, Cleaners, Sound Techs, Musicians, Barbacks, Kitchen Prep). Registered with custom `job_title`, base daily shift pay, and a 4-digit numeric PIN strictly used to clock in and out on the **Staff Timeclock Kiosk** (`?mode=timeclock` or modal). `authenticate_staff_credentials` strictly enforces `is_workflow_staff = true` to prevent non-POS staff from accessing floor or KDS ordering.
> - **Admin Accounts & Strict Payroll Exemption:** Administrators (`role: 'admin'`) hold privileged back-office access authenticated via username/email and strong password (`authenticate_admin_credentials`), with a 4-digit Floor Manager Override PIN for floor voids. Admin accounts are management/salary roles and strictly **Payroll Exempt** (`base_daily_rate = 0.00`). Their presence and shift hours are tracked in attendance ledgers for operational oversight, but their pay is strictly ₱0.00 and excluded from all staff payroll expense sums.
> - **Dedicated Attendance & Payroll Ledger (`AdminAttendancePayrollView.tsx`):** Eliminates duplication with Staff Roster. Enables managers to audit attendance and calculate payroll expenses across any arbitrary date or period (Today, Yesterday, Specific Date, This Week, Select Week, This Month, Select Month, All-Time). Payroll is authoritatively derived from actual attendance records: clocked-in staff receive their fixed daily rate (`base_daily_pay`, minimum wage baseline ₱645.00) plus any supervisor-granted OT / Shift Bonus (`addon_pay`), while unclocked staff incur ₱0.00 and Admin accounts remain Payroll Exempt. Integrates directly into Admin Dashboard executive telemetry (Total Payroll, Labor Cost %, Net Profit).

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

- **Philippine Statutory 12% VAT (Inclusive Extraction per NIRC Sec. 106/108 & BIR RR 16-2005):**  
  All menu prices at Monk's Dream are legally VAT-inclusive. The system extracts the VAT components without any surcharge:
  $$\text{VATable Sales} = \frac{\text{Gross Amount}}{1.12}$$
  $$\text{12\% VAT Amount} = \text{Gross Amount} - \text{VATable Sales}$$
  Example: An item listed at ₱150.00 yields ₱133.93 VATable Sales and ₱16.07 VAT.
- **Station-Aware & Mode-Dependent Service Charge (Dine-in Only, RA 11360):**  
  Service Charge applies exclusively to Dine-In tabs (Takeout and Delivery orders strictly incur 0% Service Charge). Configurable in Admin Back-Office Settings:
  - **☀️ Daytime Cafe Mode:** Coffee, artisan tea, and bar drinks (`stationTarget: 'bar'`) incur **0% Service Charge**. Kitchen food items (`stationTarget: 'kitchen'`) incur **10% Service Charge** (configurable via `venue_settings.cafe_food_service_charge_rate`).
  - **🎷 Event Mode:** All items (Bar and Kitchen) incur **10% Service Charge** (configurable via `venue_settings.event_service_charge_rate`).
  - **Base:** Service Charge is computed directly from gross menu prices ($\text{Gross} \times \text{Rate}$).
- **Senior Citizen & PWD Statutory Discounts (RA 9994, RA 10754, BIR RR 7-2010):**  
  Mandatory 2-step statutory formula for eligible food and beverage items:
  1. **VAT Exemption Step:** Back out the 12% VAT to determine the VAT-exempt selling price:
     $$\text{VAT-Exempt Base} = \frac{\text{Item Gross Price}}{1.12}$$
  2. **20% Discount Step:** Apply the statutory 20% discount on the VAT-exempt base:
     $$\text{Discount Amount} = \text{VAT-Exempt Base} \times 0.20$$
     $$\text{Discounted Item Net} = \text{VAT-Exempt Base} - \text{Discount Amount} = \text{VAT-Exempt Base} \times 0.80$$
  - **Service Charge on Senior Food (BIR RMC 38-2012):** Service Charge is not discounted by 20% and is retained in full for staff tip distribution.
  - **Mandatory Identification:** Applying a Senior or PWD discount strictly requires entering the customer's OSCA / PWD ID number and Cardholder Full Name in `BillSettlementModal`.
  - **Receipt & ESC/POS Audit:** Customer receipts explicitly print VATable Sales, VAT Amount (12%), VAT-Exempt Sales, Senior/PWD 20% Discount, Net Service Charge, Cardholder Details, and an official customer signature acknowledgment line.
- **Tab Item Transfer & Split Tab Architecture (`TableItemTransferModal.tsx`):**  
  To handle tables where only certain diners are Senior Citizens / PWDs, waitstaff can either:
  1. **Transfer Items to a Dedicated Tab:** Open `TableActionModal` $\rightarrow$ "Move Items", select lines and quantities, and transfer them in 1 tap to an existing tab or create a new dedicated tab (e.g. "Senior Citizen Tab") via atomic PostgreSQL RPC `transfer_order_items_to_tab`.
  2. **In-Modal Settlement Item Checklist:** In `BillSettlementModal`, toggle "Select specific items for discount" to check off only the senior guest's items, automatically computing the statutory discount on the selected lines while keeping remaining lines at standard VAT-inclusive pricing.
- **Beverage Temperature & Size Combination Matrix Pricing (`public.product_variants`):**  
  Specialty coffee and beverages support multi-attribute matrix pricing across Temperatures (`HOT`, `COLD`) and Sizes (`8oz`, `12oz`, `16oz`, `Regular`, `Large`, `Single`, `Double`, or custom labels). Each valid combination carries an explicit selling price. Single-size items without temperature choices fall back cleanly to `products.base_price`. Ordering opens the Unified Drink Customizer modal (`OrderModifierModal.tsx`) showing visual temperature pills (🔥 Hot / ❄️ Iced), cup size buttons with live price calculation, recipe modifiers, and barista notes. Active lines format as `Drink Name (Hot · 12oz)` across Cart, Receipts, and Checks, while Barista KDS (`BaristaTicketCard.tsx`) highlights color-coded badges (orange for `HOT`, cyan for `ICED`). Granular Variant Recipe BOM in `product_ingredients` (`variant_id`) allows size/temp-specific ingredient depletion upon KDS `READY`, falling back to base product BOM when no variant BOM is defined.
- **Resold Outside Food Rule:**  
  $$\text{Base Price} = \text{Original Cost} \times 1.20 \quad (\text{fixed locked } +20\% \text{ margin})$$
- **Corkage Fee Rule:**  
  Fixed 20% surcharge toggle applied to customer tabs when outside wine/liquor is consumed.
- **Split Billing by Customer Name:**  
  Tables support multiple independent customer tabs (e.g., Table 4 $\rightarrow$ `Tab: Alice`, `Tab: Bob`). Guests can transfer or settle their own tabs independently.

### 5. Inventory Depletion, Supply Chain & Recipe BOM Engine

- **Trigger Point:** Depletion occurs when an item is marked **READY** in KDS (or **SERVED**) via PostgreSQL trigger `trg_deplete_inventory_on_item_ready` on `public.order_items`. This ensures stock drops precisely when kitchen/bar stations fulfill preparation rather than at initial dispatch, guarded by `is_depleted = false` to strictly prevent double-depletion.
- **Cancellation Restoral:** If an order item is cancelled before preparation starts, depleted stock is automatically restored to the active inventory ledger (`CANCEL_RESTORE`).
- **Non-Blocking Orders Invariant & Soft Alerts:** When required raw ingredient stocks drop to or below minimum par alert levels (`min_alert_level`) or reach 0/negative, the system displays soft visual warnings (amber for low stock, red for depleted) on POS cards and fires real-time alerts across terminals and the Buzzout feed without blocking server orders (allowing negative inventory tracking until shipments are checked in).
- **Executive Inventory Hub:** Features live KPI cards (Total Valuation ₱, In-Par, Below-Par, Depleted), stock health ratio progress bars, 1-tap in-line Quick Stock Count adjustments (`QuickAdjustStockModal.tsx`), and rapid par threshold editing.
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
   - **Tab 4 (Online & Cashless Payments):** Dedicated digital tender reconciliation ledger (`AdminCashlessTransactionsView.tsx`) tracking GCash, Maya, QRPH, Card, and Bank Transfers. Surfaces 4-digit reference numbers with 1-tap clipboard copying, channel breakdown KPIs, live Supabase Realtime synchronization, line-item order inspector, thermal receipt reprint triggers, and 1-click executive Excel workbook export (`exportCashlessRegisterToExcel`).
4. **Dedicated Hardware Print & Cash Drawer Station (`?mode=printer`):** Standalone browser tab running on the counter PC physically connected to the 80mm USB thermal printer and RJ11 cash drawer. Listens to all venue print jobs in real-time via Supabase Realtime CDC, translates payloads to raw binary ESC/POS streams (`escposBuilder.ts`) with high-contrast 288×255 1-bit monochrome raster graphic logo (`GS v 0`) from `Monks Dream Logo files-02.png`, full business header (`MONK'S DREAM JAZZ BAR AND CAFE`), rich 48-column item lines with beverage variant specs (`Hot · 12oz`), modifiers, prep notes, Philippine 12% VAT breakdown (VATable Sales, VAT Amount, VAT-Exempt Sales), Senior/PWD acknowledgment block, and statutory `"THIS IS NOT AN OFFICIAL RECEIPT"` notice. Communicates via direct WebUSB device fetching (`webSerialPrinter.ts`) without OS print dialogs, automatically pops the physical cash drawer solenoid on cash payments and till operations, and uses Web Locks leader election to prevent duplicate printing across duplicate tabs.

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
- **Event-Driven Real-Time Multi-Subscriber Sync & 3-Tier Zero-Manual-Refresh Engine:** `RealtimeGateway` (`features/shared/infrastructure/realtime.ts`) multiplexes `pos_global_sync` (`postgres_changes` + `pos_sync_broadcast` with `broadcast: { self: true }`) across `useOrderStore`, Floor POS (`FloorWorkspaceView`), and all Admin Back-Office hubs (`AdminBackOfficeScreen`, `AdminTableLayoutView`, `AdminStaffView`, `AdminAttendancePayrollView`, `AdminRecipesView`, `AdminInventoryView`). Supported by a 3-tier resilient sync engine: 1. Sub-second WebSocket CDC push; 2. Instant tab wake / focus revalidation (`useWindowVisibilitySync`); 3. Silent 10-second background self-healing heartbeat polling loop. All order, table, KDS ticket, runner card, and Admin station turnaround timers (`MM:SS` / `H:MM:SS`) tick live every second from server `created_at` / `opened_at` ISO timestamps via `features/shared/utils/elapsedTime.ts`.
- **Station Telemetry Metrics & Offline Station Invariants:** Station fulfillment turnaround time (`avgTicketTime`) strictly reflects the average duration of completed/fulfilled orders during the current operating shift (or `'Idle'` when 0 fulfilled orders exist), never conflating in-flight queue wait times with historical fulfillment. When active tickets exist on an **Online** station, in-flight queue elapsed times tick live every second under the active queue (`Live: MM:SS`). When a station is **Offline** (no staff clocked in or workstation heartbeat within 5 minutes), live timers are strictly halted, queued items display as standby (`Queued (Offline)`), and `useLiveNow` avoids unnecessary CPU ticking. Stale unbilled orders and tabs from prior operating days are automatically reconciled and cancelled during the 6:00 AM operating reset via `reconcile_stale_open_orders()`, preventing prior-day tickets from polluting live shift metrics.

### 8. Event Logistics & Visual Calendar Hub

- **Visual Multi-View Calendar:** Administrators can schedule and manage live performances, guest musicians, and tasting events across Month Grid (with visual hero poster thumbnail cards and showtimes inside day cells), Week Schedule (with hourly timeslots, sound check blocks, and performance banners), and chronological Agenda list view.
- **Stage Run-of-Show & Logistics Checklist:** Captures event title, date, start/end time, artist/band lineup, genre, hero poster upload (stored in bucket `event-posters`), and backstage checklist (sound check schedule, backline/audio gear requirements, reserved VIP tables, and hospitality rider requests).
- **Public Read-Only Live Link (`?mode=events`):** Standalone web route for musicians, staff, and guests allowing real-time calendar viewing without POS login. Synchronized reactively via Supabase Realtime (`venue_events`), with 1-click `.ics` iCalendar download and dedicated `@media print` layout for high-contrast printable gig sheets.
- **Floor & Back-Office Awareness:** Floor POS command bar (`UnifiedCommandBar.tsx`) and Admin Dashboard (`AdminDashboardView.tsx`) render a live "Tonight at Monk's Dream" banner with artist details, showtime, and sound check status when an event is scheduled today.

### 9. Cashless QR Payment Lifecycle & 4-Digit Reference Tracking

- **Dynamic Multi-Channel QR Management:** Managed in Admin Back-Office (`AdminSettingsView.tsx` -> `AdminQrPaymentManager.tsx`) backed by `public.venue_qr_payment_channels` and Supabase Storage bucket `payment-qr-codes`. Administrators can upload custom QR codes, enter Account Name and Account/Mobile Number, and toggle channels active/inactive for GCash, Maya, Bank Transfer (BPI, BDO, UnionBank), and QRPH.
- **Tablet Floor Checkout UX (`BillSettlementModal.tsx` & `FullscreenQrModal.tsx`):** When selecting "GCash / Maya QR Wallet", the modal renders horizontal channel selector pills, a high-contrast scannable QR card, and a 1-tap **"Show to Guest (Full Screen)"** expander that opens a dedicated, high-contrast modal displaying the exact amount due and scannable QR code for guest phones.
- **Strict 4-Digit Reference Verification:** Settlement requires inputting the last 4 digits of the payment confirmation reference number (`/^\d{4}$/`). The "Confirm Payment" button remains strictly disabled until exactly 4 digits are entered.
- **End-to-End Downstream Audit & Receipts:** The payment channel and reference number are saved in `payments` (`payment_channel`, `reference_number`), printed on ESC/POS thermal chits (`GCash (Ref: #8921)`), and indexed in Checks History (`ChecksHistoryView.tsx`) with instant reference search.

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

### 8. Real Station Turnaround & Table Turnover Hub (`AdminStationsView.tsx`)

- **Authoritative Turnaround Timing:** Station fulfillment turnaround time is tracked from order placement (`created_at`) until items are marked delivered to the table (`order_items.delivered_at` set via `trg_set_order_item_delivered_at` upon runner handoff / "Deliver to Table"). If unserved at billing, tab settlement (`settle_tab_and_record_payment`) atomically freezes timing via `delivered_at = now()`.
- **Table Turnover Dwell Tracking:** Measures guest table dwell duration from tab opening (`tabs.created_at`) to settlement (`tabs.updated_at` / `payments.created_at`).
- **Timeframe Filtering:** Switchable between **Today (Daily)**, **Yesterday**, **This Week**, and **This Month**.
- **Manager Shift Baseline Reset:** Gated by 4-digit Manager PIN `9999` (`reset_station_turnaround_metrics`). Stores `station_metrics_reset_at` in `venue_settings` so counters restart fresh for the active service rush while preserving all historical data in PostgreSQL, complete with a "Show Full Day" / "Clear Baseline" toggle.
- **Executive Overview Header:** Displays Average Table Turnover Time, Total Tables Turned, Overall On-Time Fulfillment SLA %, and Total Completed Orders alongside active in-flight tickets.

---

## 📚 Related Documentation

- Architecture & File Tree Map: [AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)
- Implementation Roadmap: [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md)
- Developer Onboarding & Commands: [CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)
