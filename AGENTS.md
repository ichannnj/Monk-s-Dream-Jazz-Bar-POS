# Agent Operating Guidelines — Monk's Dream Jazz Bar POS

> **Core System Context:** [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md) · [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md) · [CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)  
> **Golden Rule:** **NEVER read large files (`REQUIREMENTS.md` [83KB], `mockData.ts` [34KB], `database.types.ts` [30KB]) in full.** Use targeted slicing (`StartLine`/`EndLine`). Target **250–350 LOC max** per file to optimize token budget.

---

## 🔑 Core Domain Invariants & Staff PIN Matrix

| Role                | PIN    | Responsibilities                                          | Station Destination  |
| ------------------- | ------ | --------------------------------------------------------- | -------------------- |
| **Admin / Manager** | `9999` | Full access, recipe builder, inventory audit, settings    | All screens          |
| **Cashier**         | `1111` | Counter intake, takeout/delivery, settlement, cash drawer | Floor POS            |
| **Floor Waiter**    | `2222` | Floor table ordering, customer tabs, table transfers      | Floor POS            |
| **Bartender**       | `3333` | Cocktails, liquor, beer, wine prep                        | `station:bar`        |
| **Barista**         | `4444` | Artisan espresso, coffee, pour-overs, teas, cold drinks   | `station:bar`        |
| **Kitchen Chef**    | `5555` | Hot food, pasta, pizza, appetizers, desserts              | `station:kitchen`    |
| **FOH Runner**      | `6666` | Expediter Buzzout tablet, tray dispatch & packaging       | `station:foh_runner` |

- **Station KDS POS Ordering:** Barista KDS (`UnifiedKdsScreen.tsx`) includes the full shared Floor POS (`FloorWorkspaceView`), Checks History, and the dedicated Bar Cash Drawer. Kitchen KDS strictly omits cash drawer and floor ordering operations (kitchen is KDS, food prep, and checks audit only: Board, Checks, Chat, Alerts). When orders are dispatched from Bar KDS, bar beverages auto-start with `status: 'preparing'`.
- **Station-Isolated Chat & Universal DMs:** Each operational role sees only their respective station channel (`#foh` for Waiter/Cashier/Runner, `#bar` for Bartender, `#cafe` for Barista, `#kitchen` for Kitchen Chef). Admin/Managers (`PIN: 9999`) have oversight across all station channels. All active staff members have universal 1-on-1 direct messaging (DM) with all colleagues regardless of role or station. Chat is universally responsive: on mobile phones (<768px), it adapts into a master-detail navigation pattern (conversations list vs. immersive active thread with `< Chats` back navigation) with full-screen KDS drawers and ≥48px quick preset chips.
- **X-Y-Z Reading Fiscal Lifecycle & Automated Closing:** Managed in Admin Back-Office under Reports & Transactions (`PIN: 9999`). Supports Consolidated Venue, Main Floor Till, and Bar Station Till. Sourced directly from PostgreSQL: 1. **X-Reading:** Interim non-destructive snapshot (`get_current_x_reading`). 2. **Y-Reading (Shift Handover):** Closes individual staff/cashier shifts (`close_shift_and_generate_y_reading`), scoped strictly since the last shift handover (`p_scope = 'shift'`) to isolate cashier accountability, prompts with 1-click "Match Expected" quick fill, bill/coin denomination calculator (`CashDenominationCounter.tsx`), open tabs safety guard (`check_unsettled_tabs`), records variance, saves permanent Y-record in `pos_y_readings`, and formats handover signature lines without resetting daily sales accumulators. 3. **Z-Reading (End of Day):** Final fiscal closeout (`close_shift_and_generate_z_reading`), locks the business day (`p_scope = 'day'`), checks open tabs guard, advances sequential `z_number`, resets daily sales accumulators, and auto-enqueues 80mm thermal print jobs with auto-cut (`printReadingSlip`). Output supports dedicated CSS `@media print` A4 document layout (`window.print()`), 80mm thermal driver, single-shift executive Excel workbooks, and full multi-row historical archive ledgers (`readingExcelExport.ts`).
- **Atomic Settlement Cascade & Active Ticket Invariant:** In `settle_tab_and_record_payment`, tab settlement atomically sets `tabs.status = 'BILLED'`, cascades `orders.status = 'COMPLETED'`, and updates un-served items to `'SERVED'`. Active tickets across KDS boards and Admin Telemetry strictly require `tabs.status = 'OPEN'` and `orders.status IN ('OPEN', 'IN_PREPARATION')`. When a station preparation queue is 0, speed displays `'Idle'`.
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

| If your task is...                 | Read THIS file first                                                                     | DO NOT read in full         |
| :--------------------------------- | :--------------------------------------------------------------------------------------- | :-------------------------- |
| **Floor POS Main Screen**          | `frontend/src/features/floor/presentation/WaiterCashierScreen.tsx`                       | Full screen files           |
| **Floor POS Workspace (Shared)**   | `frontend/src/features/floor/presentation/FloorWorkspaceView.tsx`                        | Monolithic views            |
| **Floor & Waiter Workflows**       | `frontend/src/features/floor/application/useWaiterWorkflows.ts`                          | Monolithic stores           |
| **Floor Grid & Tables**            | `frontend/src/features/floor/presentation/FloorGridView.tsx`                             | `WaiterCashierScreen.tsx`   |
| **Table Actions & Tabs**           | `frontend/src/features/table-service/presentation/TableActionModal.tsx`                  | Monolithic modals           |
| **Table Transfer / Move**          | `frontend/src/features/table-service/presentation/table-transfer/TableTransferModal.tsx` | `REQUIREMENTS.md`           |
| **Order Entry & Cart**             | `frontend/src/features/orders/presentation/order-entry/OrderEntryModal.tsx`              | Monolithic modals           |
| **Order Store / State**            | `frontend/src/features/orders/application/useOrderStore.ts`                              | All slice files             |
| **Orders API & Dispatch**          | `frontend/src/features/orders/data/orders.api.ts`                                        | Monolithic APIs             |
| **Tables API & Tabs API**          | `frontend/src/features/table-service/data/tables.api.ts`                                 | Monolithic files            |
| **Checkout & Settlement**          | `frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.tsx`    | Monolithic store            |
| **Check History / Audit**          | `frontend/src/features/check-history/presentation/ChecksHistoryView.tsx`                 | Full history view           |
| **Takeout Orders**                 | `frontend/src/features/takeout/presentation/NewTakeoutModal.tsx`                         | Monolithic waiter view      |
| **Delivery Orders**                | `frontend/src/features/delivery/presentation/OnlineDeliveryModal.tsx`                    | Full screen files           |
| **Cash Drawer Operations**         | `frontend/src/features/cash-drawer/presentation/CashDrawerModalView.tsx`                 | Monolithic views            |
| **Menu & Auto-86 Catalog**         | `frontend/src/features/menu/data/menu.api.ts`                                            | Monolithic mock files       |
| **Station KDS (Bar/Kitchen)**      | `frontend/src/features/kds/presentation/common/UnifiedKdsScreen.tsx`                     | Entire KDS folder           |
| **FOH Runner Expediter**           | `frontend/src/features/kds/presentation/foh-runner/screens/FohRunnerScreen.tsx`          | Full runner views           |
| **Alerts & Call Bells**            | `frontend/src/features/alerts/presentation/SharedAlertsView.tsx`                         | Large modal trees           |
| **Inter-station Chat**             | `frontend/src/features/chat/presentation/SharedChatView.tsx`                             | Full chat view              |
| **Team Chat State / Store**        | `frontend/src/features/chat/application/useChatStore.ts`                                 | Monolithic store files      |
| **Team Chat API & Database**       | `frontend/src/features/chat/data/chat.api.ts`                                            | Monolithic mock files       |
| **Staff Auth & PINs**              | `frontend/src/features/auth/application/useAuthStore.ts`                                 | Full login views            |
| **Staff Identity & Name Helpers**  | `frontend/src/features/shared/utils/staffHelpers.ts`                                     | Monolithic utils            |
| **Shared Infrastructure**          | `frontend/src/features/shared/infrastructure/api.ts`                                     | Full client trees           |
| **Toast Notifications**            | `frontend/src/features/shared/toast/useToastStore.ts`                                    | Toast container trees       |
| **Thermal Printing Daemon**        | `packages/printing/src/daemon.ts`                                                        | `REQUIREMENTS.md` Section 6 |
| **Thermal Printing Monitor UI**    | `frontend/src/features/printer/presentation/PrinterTerminalScreen.tsx`                   | Full screen files           |
| **Admin Console & Dashboard**      | `frontend/src/features/admin/presentation/views/AdminDashboardView.tsx`                  | Full screen files           |
| **Admin Back-Office Hub**          | `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`                     | Monolithic views            |
| **Admin Mobile Drawer**            | `frontend/src/features/admin/presentation/components/AdminMobileDrawer.tsx`              | Full screen files           |
| **Admin Bottom Navigation**        | `frontend/src/features/admin/presentation/components/AdminBottomNav.tsx`                 | Full screen files           |
| **Responsive Layout Hook**         | `frontend/src/features/shared/hooks/useResponsive.ts`                                    | Monolithic hooks            |
| **Admin Modals & Styled Inputs**   | `frontend/src/features/admin/presentation/components/index.ts`                           | Monolithic components       |
| **Admin Menu Catalog & BOM**       | `frontend/src/features/admin/presentation/views/AdminRecipesView.tsx`                    | Monolithic views            |
| **Admin Inventory Hub & Ledger**   | `frontend/src/features/admin/presentation/views/AdminInventoryView.tsx`                  | Monolithic views            |
| **Admin Venue Settings & Routing** | `frontend/src/features/admin/presentation/views/AdminSettingsView.tsx`                   | Full screen files           |
| **Admin Table Layout Config**      | `frontend/src/features/admin/presentation/views/AdminTableLayoutView.tsx`                | Full screen files           |
| **Admin Telemetry & Live DB Data** | `frontend/src/features/admin/data/adminTelemetry.ts`                                     | Monolithic files            |
| **X-Y-Z Shift Readings**           | `frontend/src/features/admin/presentation/views/readings/AdminReadingsView.tsx`          | Monolithic files            |
| **Cash Denomination Counter**      | `frontend/src/features/admin/presentation/views/readings/CashDenominationCounter.tsx`    | Monolithic views            |
| **Excel Spreadsheet Generator**    | `frontend/src/features/admin/utils/readingExcelExport.ts`                                | Monolithic utils            |
| **Visual Graphs & Analytics**      | `frontend/src/features/admin/presentation/views/analytics/`                              | Full screen files           |
| **Readings API & DB Calculations** | `frontend/src/features/admin/data/readings.api.ts`                                       | Monolithic APIs             |
| **Database Migrations**            | `supabase/migrations/` (check latest migration)                                          | Full `database.types.ts`    |

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
- **Mandatory System-Wide Responsive Invariant (Phone-to-Desktop):**
  - ALL present and future screens, views, modals, cards, and navigation components MUST be strictly responsive from mobile phones (~360px+ viewport width) through tablets (~768px+) to large desktop displays (≥1024px).
  - Never use rigid fixed desktop widths (`w-64`, `w-96`, `min-w-[600px]`) without mobile responsive overrides (`w-full md:w-64`).
  - Mobile Navigation: Admin back-office must feature a hybrid mobile navigation pattern (compact header with hamburger + quick actions, bottom navigation bar for core daily routes, and slide-over navigation drawer for deep administrative destinations).
  - Data Lists & Tables: Dense multi-column tables must transform into structured, thumb-friendly cards on mobile viewports (<768px), or use horizontal scroll containers with indicators disabled.
  - Sub-Navigation Tabs: Multiple sub-tabs must wrap in `<ScrollView horizontal showsHorizontalScrollIndicator={false}>` so they slide smoothly on phones without clipping.
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
