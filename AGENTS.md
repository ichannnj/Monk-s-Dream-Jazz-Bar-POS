# Agent Operating Guidelines — Monk's Dream Jazz Bar POS

> **Core System Context:** [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md) · [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md) · [CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)  
> **Golden Rule:** **NEVER read large files (`REQUIREMENTS.md` [83KB], `mockData.ts` [34KB], `database.types.ts` [30KB]) in full.** Use targeted slicing (`StartLine`/`EndLine`). Target **250–350 LOC max** per file to optimize token budget.

---

## 🔑 Core Domain Invariants & Staff PIN Matrix

| Role                | PIN / Override                                             | Responsibilities                                          | Station Destination  |
| ------------------- | ---------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| **Admin / Manager** | `MonksDream9999!` (Password) / `9999` (Floor Override PIN) | Full access, recipe builder, inventory audit, settings    | All screens          |
| **Cashier**         | `1111`                                                     | Counter intake, takeout/delivery, settlement, cash drawer | Floor POS            |
| **Floor Waiter**    | `2222`                                                     | Floor table ordering, customer tabs, table transfers      | Floor POS            |
| **Bartender**       | `3333`                                                     | Cocktails, liquor, beer, wine prep                        | `station:bar`        |
| **Barista**         | `4444`                                                     | Artisan espresso, coffee, pour-overs, teas, cold drinks   | `station:bar`        |
| **Kitchen Chef**    | `5555`                                                     | Hot food, pasta, pizza, appetizers, desserts              | `station:kitchen`    |
| **FOH Runner**      | `6666`                                                     | Expediter Buzzout tablet, tray dispatch & packaging       | `station:foh_runner` |

- **Dual-Mode Login & Cryptographic Secret Hashing (`pgcrypto` Bcrypt):** `LoginScreen.tsx` features a dual-mode toggle: 1. **Staff PIN Clock-In:** 4-digit PIN for operational staff (`cashier`, `waiter`, `station_bar`, `station_cafe`, `station_food`, `foh_runner`). Admin accounts are strictly blocked from logging in via PIN alone. 2. **Admin Portal (Password):** Secure Admin login requiring Username/Email and strong password (`authenticate_admin_credentials`). All secrets (`password_hash`, `pin_hash`) are cryptographically hashed in PostgreSQL using `pgcrypto` Blowfish bcrypt (`$2a$10$`, work factor 10) via trigger `trg_hash_user_secrets` and `SECURITY DEFINER` RPCs—never stored or transmitted in plaintext. Floor POS supervisor approvals (`ManagerModeSwitchModal`, `TableActionVoidModal`) verify the 4-digit Manager Override PIN against `pin_hash` via `verify_manager_override_pin`. Default initial admin password: `MonksDream9999!`, default manager override PIN: `9999`.
- **Admin Profile & Security Management (`AdminProfileView.tsx` on route `'profile'`):** Accessible from the Admin Sidebar, Mobile Drawer, and Header/Sidebar profile badges. Features 4 comprehensive cards: 1. **Personal Identity & Profile:** Edit Display Name, Username (`@username`), Job Title, Email, and Phone with live store synchronization. 2. **Admin Password Security:** Change password requiring current password re-authentication (OWASP ASVS V2.1.6) with live 4-stage strength meter and complexity checklist. 3. **Floor Manager Override PIN:** Rotate the 4-digit floor override PIN gated by current admin password verification. 4. **Security & Session Audit Snapshot:** Displays `last_login_at`, `password_updated_at`, `pin_updated_at`, encryption standard (`pgcrypto $2a$10$`), and session termination.
- **Staff Roster & Dedicated Attendance/Payroll Architecture:** Managed in Admin Back-Office under two specialized views to eliminate duplication: 1. **Staff Roster (`AdminStaffView.tsx` on route `'staff'`):** Centralized directory for POS User Accounts (`is_workflow_staff: true`) and Non-User Venue Personnel (`is_workflow_staff: false` - Dishwasher, Security, Sound Tech, Musician, Cleaner, Barback). Supports account creation (`CreateUserAccountModal`, `CreateNonWorkflowStaffModal`), profile editing (`EditStaffModal`), 4-digit PIN resets (`ResetPinModal`), soft deactivation, and direct links to the Attendance Ledger. 2. **Attendance & Payroll Ledger (`AdminAttendancePayrollView.tsx` on route `'attendance'`):** Universal attendance tracking and cost accounting for all venue personnel across any selectable timeframe (Today, Yesterday, Specific Date, This Week, Select Week, This Month, Select Month, All-Time). Surfaces daily punches, worked hours, OT / Shift Bonuses (`addon_pay`), earned wages (`total_day_pay = base_daily_pay + addon_pay`), and quick manual punch/bonus adjustments (`admin_upsert_attendance_record`). Absent/unclocked staff incur ₱0.00 payroll expense.
- **Universal Staff Timeclock Kiosk (`TimeclockKioskScreen.tsx` on `?mode=timeclock`):** Hardware/browser-independent kiosk mode running in a standalone tab or modal. Allows all active staff members—both POS terminal users and non-POS support personnel—to clock in and clock out securely using their username and 4-digit PIN via `punch_staff_timeclock`. POS workstation logins auto-punch attendance upon floor/station clock-in if not yet clocked in today. Floor POS station access remains strictly restricted to workflow staff (`is_workflow_staff: true`).
- **Station KDS POS Ordering:** Barista KDS (`UnifiedKdsScreen.tsx`) includes the full shared Floor POS (`FloorWorkspaceView`), Checks History, and the dedicated Bar Cash Drawer. Kitchen KDS strictly omits cash drawer and floor ordering operations (kitchen is KDS, food prep, and checks audit only: Board, Checks, Chat, Alerts). When orders are dispatched from Bar KDS, bar beverages auto-start with `status: 'preparing'`.
- **Functional Event Mode / Cafe Mode, Confirmation & 6:00 AM Auto-Reset:** Master venue mode switch (`venue_settings.operating_mode`: `'CAFE' | 'EVENT'`, tracked via `venue_settings.mode_switched_at`) is guarded by a confirmation dialog (`ManagerModeSwitchModal.tsx`) across both Admin Back-Office (`AdminHeader`, `AdminMobileDrawer`) and Floor POS Command Bar (requiring Manager PIN `9999` for non-admin roles). **6:00 AM Daily Auto-Revert:** Event Mode automatically reverts back to Daytime Cafe Mode (`'CAFE'`) every morning at **6:00 AM** (`Asia/Manila` local time) via PostgreSQL `reconcile_operating_mode_6am()`, tab-creation trigger `trg_reconcile_tab_mode_before_insert`, optional `pg_cron`, and live client-side 6:00 AM timers + wakeup checks in `useVenueStore`. Reactively synchronized across workstations on channel `pos_venue_settings_sync`. Open customer tabs inherit mode at creation time (`tabs.operating_mode`), persisting across shifts and cascading on settlement into `payments.operating_mode`. Dual-mode financial reporting (Cafe Net Sales vs. Event Net Sales vs. Consolidated Total Net Sales) is natively computed and visible across Admin Live Dashboard, Sales & Transactions Hub, Settled Checks History, Fiscal Shift Readings (X/Y/Z), and Excel Spreadsheets (`readingExcelExport.ts`).
- **Station-Isolated Chat & Universal DMs:** Each operational role sees only their respective station channel (`#foh` for Waiter/Cashier/Runner, `#bar` for Bartender, `#cafe` for Barista, `#kitchen` for Kitchen Chef). Admin/Managers (`PIN: 9999`) have oversight across all station channels. All active staff members have universal 1-on-1 direct messaging (DM) with all colleagues regardless of role or station. Chat is universally responsive: on mobile phones (<768px), it adapts into a master-detail navigation pattern (conversations list vs. immersive active thread with `< Chats` back navigation) with full-screen KDS drawers and ≥48px quick preset chips.
- **X-Y-Z Reading Fiscal Lifecycle & Automated Closing:** Managed in Admin Back-Office under Reports & Transactions (`PIN: 9999`). Supports Consolidated Venue, Main Floor Till, and Bar Station Till. Sourced directly from PostgreSQL: 1. **X-Reading:** Interim non-destructive snapshot (`get_current_x_reading`). 2. **Y-Reading (Shift Handover):** Closes individual staff/cashier shifts (`close_shift_and_generate_y_reading`), scoped strictly since the last shift handover (`p_scope = 'shift'`) to isolate cashier accountability, prompts with 1-click "Match Expected" quick fill, bill/coin denomination calculator (`CashDenominationCounter.tsx`), open tabs safety guard (`check_unsettled_tabs`), records variance, saves permanent Y-record in `pos_y_readings`, and formats handover signature lines without resetting daily sales accumulators. 3. **Z-Reading (End of Day):** Final fiscal closeout (`close_shift_and_generate_z_reading`), locks the business day (`p_scope = 'day'`), checks open tabs guard, advances sequential `z_number`, resets daily sales accumulators, and auto-enqueues 80mm thermal print jobs with auto-cut (`printReadingSlip`). Output supports dedicated CSS `@media print` A4 document layout (`window.print()`), 80mm thermal driver, single-shift executive Excel workbooks, and full multi-row historical archive ledgers (`readingExcelExport.ts`).
- **Atomic Settlement Cascade & Active Ticket Invariant:** In `settle_tab_and_record_payment`, tab settlement atomically sets `tabs.status = 'BILLED'`, cascades `orders.status = 'COMPLETED'`, and updates un-served items to `'SERVED'` (unless `p_keep_open_for_prep = true` for prepaid takeout orders still in preparation, which are completed upon handoff via `complete_off_premise_tab`). Active tickets across KDS boards and Admin Telemetry strictly require `tabs.status = 'OPEN'` and `orders.status IN ('OPEN', 'IN_PREPARATION')`. When a station preparation queue is 0, speed displays `'Idle'`.
- **Takeout & Off-Premise Payment Lifecycle:** Walk-in Takeout orders support two payment workflows persisted in PostgreSQL (`tabs.is_prepaid`, `tabs.ticket_number`, `tabs.notes`): 1. **Prepaid at Counter (`isPrepaid = true`):** Dispatches to KDS and immediately opens `BillSettlementModal` to collect Cash/Card/QR/Comp (recording `payments`, `cash_drawer_transactions`, and receipt `print_jobs` via `p_keep_open_for_prep = true` while keeping KDS items active until collected), or defers to `"Pay on Pickup (DUE)"`. 2. **Pay on Pickup (`isPrepaid = false` / `DUE`):** Dispatches to KDS as `DUE`; `TakeoutQueueCard` surfaces **Pay Now** during prep and **Pay & Collect** when ready, opening `BillSettlementModal` before completing handoff. Tapping an existing Takeout or Online Delivery card appends new round items (`addItemsToTakeoutOrder` / `addItemsToOnlineOrder`).
- **Event Logistics & Visual Calendar Hub (`AdminEventsView.tsx` on route `'events'` & `PublicEventCalendarScreen.tsx` on `?mode=events`):** Full-featured jazz club event management and stage logistics planner. 1. **Visual Multi-View Calendar:** Interactive Month Grid with hero poster cards, Week Schedule, and Agenda view. 2. **Run-of-Show Logistics:** Captures title, date, start/end time, artist/performer, genre, hero poster upload (stored in bucket `event-posters`), and backstage checklist (sound check, gear/backline, reserved VIP tables, rider requests). 3. **Public Read-Only Live Link (`?mode=events`):** Unauthenticated live view with Supabase Realtime synchronization, printable gig flyer layout (`window.print()`), and 1-click `.ics` iCalendar download for Google/Apple Calendar. 4. **Floor Awareness:** Live "Tonight at Monk's Dream" banner on Floor POS (`UnifiedCommandBar.tsx`) and Admin Dashboard (`AdminDashboardView.tsx`).
- **Real-Time Multi-User Synchronized Elapsed Time Engine:** All order, table, KDS, runner, and Admin station turnaround timers (`MM:SS` / `H:MM:SS`) are computed live every second from authoritative PostgreSQL `created_at` / `opened_at` ISO timestamps via the singleton ticker in `frontend/src/features/shared/utils/elapsedTime.ts` (`useLiveNow`, `useLiveElapsedTimer`, `getLiveStationTurnaround`). Cross-user state is synchronized in real time across all connected workstations via `RealtimeGateway`'s multi-listener `pos_global_sync` fan-out (`postgres_changes` + `pos_sync_broadcast`).
- **Authoritative Active-Tab Occupancy & Auto-Healing:** Physical table occupancy (`is_occupied`) is strictly driven by the presence of active `OPEN` tabs. Synchronized automatically in PostgreSQL via `trg_sync_table_occupancy` on `tabs`, self-healed dynamically in telemetry queries (`adminTelemetry.ts`), and backed by manager emergency overrides via `admin_force_release_table` (`adminApi.releaseTable`).
- **Event-Driven Real-Time Admin Telemetry:** Admin Back-Office multiplexes `pos_global_sync` via Supabase Realtime across `tables`, `tabs`, `orders`, `order_items`, `payments`, `cash_drawer_transactions`, `inventory_items`, and `waste_logs` with a 400ms debounce to quietly refresh live telemetry and sub-views without blocking spinners or manual page reloads.
- **Real Station Online Heartbeat Tracking:** Station status (`Online` vs `Offline`) is strictly driven by live PostgreSQL heartbeats in `station_status` updated via `report_station_heartbeat` from active workstations (`UnifiedKdsScreen`, `FohRunnerScreen`). Stations without an active workstation or heartbeat within 5 minutes strictly display as `Offline`. Never hardcode static "Online" badges.
- **KDS Hardware Constraint:** Zero public/overhead customer displays. Tablets mounted or handheld only.
- **Thermal Printing Workflow:** 1. Order Dispatch Slip (chit) auto-prints upon "Send Order". 2. Customer Receipt prints upon tab settlement.
- **Depletion Engine:** Stock depletes on order dispatch; voids before prep restore depleted inventory.
- **Domain Vocabulary Anchors:** _Chit_ (dispatch slip), _Tab_ (named table bill), _Auto-86_ (inventory stockout), _BOM_ (bill of materials recipe), _HLC_ (hybrid logical clock).

---

## 🗺️ Feature-First Repository Architecture & File Tree

All frontend business logic, views, stores, and API clients live strictly under `frontend/src/features/<domain>/` across four explicit layers:

- `presentation/`: React Native screens, modals, components, and local UI state hooks.
- `application/`: Workflow coordinators, Zustand store slices, and optimistic state.
- `domain/`: Business rules, formulas, calculations, and local domain types.
- `data/`: Supabase queries/RPCs, database mapping, and realtime event handlers.

> **Graphify Navigation:**  
> The file tree and symbol dependency graph are managed dynamically by **Graphify**.
>
> - Visual hierarchy & interactive tree: [GRAPH_TREE.html](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/graphify-out/GRAPH_TREE.html)
> - Knowledge graph visualization: [graph.html](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/graphify-out/graph.html)
> - Full query graph model: [graph.json](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/graphify-out/graph.json)
> - Query CLI: `graphify query "<question>"` or `graphify path "<A>" "<B>"`

---

## 🎯 Task-to-File Fast Router

| If your task is...                    | Read THIS file first                                                                     | DO NOT read in full         |
| :------------------------------------ | :--------------------------------------------------------------------------------------- | :-------------------------- |
| **Floor POS Main Screen**             | `frontend/src/features/floor/presentation/WaiterCashierScreen.tsx`                       | Full screen files           |
| **Floor POS Workspace (Shared)**      | `frontend/src/features/floor/presentation/FloorWorkspaceView.tsx`                        | Monolithic views            |
| **Floor & Waiter Workflows**          | `frontend/src/features/floor/application/useWaiterWorkflows.ts`                          | Monolithic stores           |
| **Floor Grid & Tables**               | `frontend/src/features/floor/presentation/FloorGridView.tsx`                             | `WaiterCashierScreen.tsx`   |
| **Table Actions & Tabs**              | `frontend/src/features/table-service/presentation/TableActionModal.tsx`                  | Monolithic modals           |
| **Table Transfer / Move**             | `frontend/src/features/table-service/presentation/table-transfer/TableTransferModal.tsx` | `REQUIREMENTS.md`           |
| **Order Entry & Cart**                | `frontend/src/features/orders/presentation/order-entry/OrderEntryModal.tsx`              | Monolithic modals           |
| **Order Store / State**               | `frontend/src/features/orders/application/useOrderStore.ts`                              | All slice files             |
| **Orders API & Dispatch**             | `frontend/src/features/orders/data/orders.api.ts`                                        | Monolithic APIs             |
| **Tables API & Tabs API**             | `frontend/src/features/table-service/data/tables.api.ts`                                 | Monolithic files            |
| **Checkout & Settlement**             | `frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.tsx`    | Monolithic store            |
| **Check History / Audit**             | `frontend/src/features/check-history/presentation/ChecksHistoryView.tsx`                 | Full history view           |
| **Checks API & Database**             | `frontend/src/features/check-history/data/checks.api.ts`                                 | Monolithic files            |
| **Checks Domain Types**               | `frontend/src/features/check-history/domain/check.types.ts`                              | Full types files            |
| **Takeout Orders**                    | `frontend/src/features/takeout/presentation/NewTakeoutModal.tsx`                         | Monolithic waiter view      |
| **Delivery Orders**                   | `frontend/src/features/delivery/presentation/OnlineDeliveryModal.tsx`                    | Full screen files           |
| **Cash Drawer Operations**            | `frontend/src/features/cash-drawer/presentation/CashDrawerModalView.tsx`                 | Monolithic views            |
| **Menu & Auto-86 Catalog**            | `frontend/src/features/menu/data/menu.api.ts`                                            | Monolithic mock files       |
| **Menu Image Upload & Storage**       | `frontend/src/features/menu/data/imageUpload.service.ts`                                 | Monolithic services         |
| **Menu Image Field & Live Preview**   | `frontend/src/features/admin/presentation/components/MenuImageUploadField.tsx`           | Monolithic components       |
| **Station KDS (Bar/Kitchen)**         | `frontend/src/features/kds/presentation/common/UnifiedKdsScreen.tsx`                     | Entire KDS folder           |
| **FOH Runner Expediter**              | `frontend/src/features/kds/presentation/foh-runner/screens/FohRunnerScreen.tsx`          | Full runner views           |
| **Alerts & Call Bells**               | `frontend/src/features/alerts/presentation/SharedAlertsView.tsx`                         | Large modal trees           |
| **Inter-station Chat**                | `frontend/src/features/chat/presentation/SharedChatView.tsx`                             | Full chat view              |
| **Team Chat State / Store**           | `frontend/src/features/chat/application/useChatStore.ts`                                 | Monolithic store files      |
| **Team Chat API & Database**          | `frontend/src/features/chat/data/chat.api.ts`                                            | Monolithic mock files       |
| **Staff Auth & PINs**                 | `frontend/src/features/auth/application/useAuthStore.ts`                                 | Full login views            |
| **Staff Identity & Name Helpers**     | `frontend/src/features/shared/utils/staffHelpers.ts`                                     | Monolithic utils            |
| **Real-Time Elapsed Timer Engine**    | `frontend/src/features/shared/utils/elapsedTime.ts`                                      | Monolithic utils            |
| **Realtime Gateway & Multi-Sync**     | `frontend/src/features/shared/infrastructure/realtime.ts`                                | Full client trees           |
| **Shared Infrastructure**             | `frontend/src/features/shared/infrastructure/api.ts`                                     | Full client trees           |
| **Toast Notifications**               | `frontend/src/features/shared/toast/useToastStore.ts`                                    | Toast container trees       |
| **Thermal Printing Daemon**           | `packages/printing/src/daemon.ts`                                                        | `REQUIREMENTS.md` Section 6 |
| **Thermal Printing Monitor UI**       | `frontend/src/features/printer/presentation/PrinterTerminalScreen.tsx`                   | Full screen files           |
| **Admin Console & Dashboard**         | `frontend/src/features/admin/presentation/views/AdminDashboardView.tsx`                  | Full screen files           |
| **Admin Back-Office Hub**             | `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`                     | Monolithic views            |
| **Admin Mobile Drawer**               | `frontend/src/features/admin/presentation/components/AdminMobileDrawer.tsx`              | Full screen files           |
| **Admin Bottom Navigation**           | `frontend/src/features/admin/presentation/components/AdminBottomNav.tsx`                 | Full screen files           |
| **Responsive Layout Hook**            | `frontend/src/features/shared/hooks/useResponsive.ts`                                    | Monolithic hooks            |
| **Universal POS Dropdown UI**         | `frontend/src/features/shared/ui/PosDropdown.tsx`                                        | Monolithic UI trees         |
| **Operational Sidebar / Top Bar**     | `frontend/src/features/shared/navigation/Sidebar.tsx`                                    | Full screen files           |
| **Admin Modals & Styled Inputs**      | `frontend/src/features/admin/presentation/components/index.ts`                           | Monolithic components       |
| **Admin Menu Catalog & BOM**          | `frontend/src/features/admin/presentation/views/AdminRecipesView.tsx`                    | Monolithic views            |
| **Admin Inventory Hub & Ledger**      | `frontend/src/features/admin/presentation/views/AdminInventoryView.tsx`                  | Monolithic views            |
| **Event Logistics & Calendar View**   | `frontend/src/features/events/presentation/views/AdminEventsView.tsx`                    | Monolithic views            |
| **Public Live Event Calendar**        | `frontend/src/features/events/presentation/screens/PublicEventCalendarScreen.tsx`        | Full screen files           |
| **Event State & Realtime Store**      | `frontend/src/features/events/application/useEventStore.ts`                              | Monolithic stores           |
| **Event API & Poster Storage**        | `frontend/src/features/events/data/events.api.ts`                                        | Monolithic APIs             |
| **Venue Store & Mode State**          | `frontend/src/features/shared/stores/useVenueStore.ts`                                   | Full store files            |
| **Floor Manager Mode Modal**          | `frontend/src/features/floor/presentation/ManagerModeSwitchModal.tsx`                    | Monolithic modals           |
| **Admin Venue Settings & Routing**    | `frontend/src/features/admin/presentation/views/AdminSettingsView.tsx`                   | Full screen files           |
| **Admin Profile & Security View**     | `frontend/src/features/admin/presentation/views/AdminProfileView.tsx`                    | Full screen files           |
| **Admin Staff Directory & Roster**    | `frontend/src/features/admin/presentation/views/AdminStaffView.tsx`                      | Monolithic views            |
| **Admin Attendance & Payroll Ledger** | `frontend/src/features/admin/presentation/views/AdminAttendancePayrollView.tsx`          | Monolithic views            |
| **Universal Staff Timeclock Kiosk**   | `frontend/src/features/auth/presentation/screens/TimeclockKioskScreen.tsx`               | Full screen files           |
| **Admin Staff Creation Modals**       | `frontend/src/features/admin/presentation/views/staff/`                                  | Full modal trees            |
| **Admin Table Layout Config**         | `frontend/src/features/admin/presentation/views/AdminTableLayoutView.tsx`                | Full screen files           |
| **Sales & Transactions View**         | `frontend/src/features/admin/presentation/views/AdminTransactionsView.tsx`               | Monolithic views            |
| **Admin Telemetry & Live DB Data**    | `frontend/src/features/admin/data/adminTelemetry.ts`                                     | Monolithic files            |
| **X-Y-Z Shift Readings**              | `frontend/src/features/admin/presentation/views/readings/AdminReadingsView.tsx`          | Monolithic files            |
| **Cash Denomination Counter**         | `frontend/src/features/admin/presentation/views/readings/CashDenominationCounter.tsx`    | Monolithic views            |
| **Excel Spreadsheet Generator**       | `frontend/src/features/admin/utils/readingExcelExport.ts`                                | Monolithic utils            |
| **Visual Graphs & Analytics**         | `frontend/src/features/admin/presentation/views/analytics/`                              | Full screen files           |
| **Readings API & DB Calculations**    | `frontend/src/features/admin/data/readings.api.ts`                                       | Monolithic APIs             |
| **Database Migrations**               | `supabase/migrations/` (check latest migration)                                          | Full `database.types.ts`    |

---

## 🛡️ Coding Standards & Token Efficiency Invariants

- **Surgical File Reads:** Never call `view_file` without `StartLine`/`EndLine` on files > 100 LOC. Start with imports (lines 1–30) or targeted function ranges. Target **250–350 LOC max** per file.
- **Scoped Code Searches:** Always supply `Includes: ["*.ts", "*.tsx"]` when calling `grep_search`. Never search unconstrained root directories or `node_modules`.
- **Terminal Output Caps:** Run commands with quiet flags (`eslint . --quiet`, `tsc --noEmit`). Limit git output (`git status --short`, `git log -n 5`). Never dump unbounded terminal logs.
- **Single Source of Truth:** Import directly from canonical `features/<domain>`. Never re-create barrel facade layers outside of `features/`.
- **Mandatory KI First Step:** Always inspect relevant Knowledge Items (`<appDataDir>/knowledge`) before research.
- **NativeWind v4 Mandate:**
  - New Views/Components: 100% NativeWind v4 (`className="..."`). Never create new `*.styles.ts` or `StyleSheet.create`.
  - Preservation Rule: Never refactor existing `StyleSheet.create` in working views. Isolated hybrid additions only.
  - Typography Floor: All text must be ≥ 16px (`text-base` or larger). Never use `text-xs`, `text-sm`, `text-pos-xs`, `text-pos-sm`.
  - Touch Targets: Min 48px (`min-h-[48px] min-w-[48px]`) for all interactive elements.
- **Mandatory System-Wide Responsive & Dropdown-First Invariant (Phone-to-Desktop):**
  - ALL present and future screens, views, modals, cards, and navigation components MUST be strictly responsive from mobile phones (~360px+ viewport width) through tablets (~768px+) to large desktop displays (≥1024px).
  - Never use rigid fixed desktop widths (`w-64`, `w-96`, `min-w-[600px]`) without mobile responsive overrides (`w-full md:w-64`).
  - **Dropdown-First Visual Declutter (`PosDropdown.tsx`):** Use `PosDropdown` (`mode="select"` for views/filters/categories/tills/scopes, `mode="action"` for grouped multi-action menus) instead of multi-row horizontal tab bars, wrapped category pill walls, or crowded button clusters across Floor POS, KDS, Modals, and Admin Back-Office.
  - **Operational & Admin Mobile Navigation:** On mobile (`<768px`), operational screens (`WaiterCashierScreen`, `UnifiedKdsScreen`) convert the 78px left rail (`Sidebar.tsx`) into a compact top Navigation Bar with a Route `PosDropdown`, live unread badges, and integrated `Admin` switch button; `UnifiedKdsScreen` shows a Stage `PosDropdown` (`New / Preparing / Ready`) to display the selected column full-width; `OrderEntryModal` provides a sticky Bottom Cart Bar to toggle between Menu Grid and Basket; Admin back-office uses its hybrid header + bottom nav + slide-over drawer.
  - **Responsive Floor Grid:** `FloorWorkspaceView` scales dynamically from 1 column (`<460px`) and 2 columns (`460–767px`) up to 3–5 columns on tablet/desktop (`≥768px`) with compact `TableCard`, `TakeoutQueueCard`, and `OnlineDeliveryCard` heights (`minHeight: 152–156`).
  - Data Lists & Tables: Dense multi-column tables must transform into structured, thumb-friendly cards on mobile viewports (<768px), or use horizontal scroll containers with indicators disabled.
- **Component Purity:** React Native primitives only (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`). No web DOM tags.
- **Routing:** Role-based conditional view switching in `frontend/App.tsx`. Never use Expo Router.
- **Database:** Mandatory RLS on every table (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`). `SECURITY DEFINER` functions must declare `SET search_path = public;`.

---

## ⚡ Antigravity IDE Directives & Slash Commands

- Slash Commands: Recommend `/grill-me` for design alignment, `/goal` for autonomous tasks, `/plan` for multi-step breakdowns, `/schedule` for timers (never shell `sleep`), `/learn` for novel patterns.
- Subagent Rules: Use surgical slices; avoid terminal dumps > 100 lines; verify before completion:
  1. `pnpm typecheck`
  2. `pnpm lint:quiet`
  3. `pnpm db:lint`
  4. `pnpm sync:knowledge` (auto-syncs `graph.json` & `GRAPH_TREE.html`)
  5. Proactively verify and keep `AGENTS.md` and `CONTEXT.md` up-to-date with any new domain models, routes, or workflows
  6. `pnpm build`
