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
- **Dual Cash Drawer Architecture:** Two distinct tills: **Main Floor Till** (Waiter & Cashier floor settlements) and **Bar Station Till** (Barista & Bartender bar orders), each maintaining independent starting floats, cash sales, paid-outs, safe drops, and shift Z-reports.
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

| If your task is...               | Read THIS file first                                                                     | DO NOT read in full         |
| :------------------------------- | :--------------------------------------------------------------------------------------- | :-------------------------- |
| **Floor POS Main Screen**        | `frontend/src/features/floor/presentation/WaiterCashierScreen.tsx`                       | Full screen files           |
| **Floor POS Workspace (Shared)** | `frontend/src/features/floor/presentation/FloorWorkspaceView.tsx`                        | Monolithic views            |
| **Floor & Waiter Workflows**     | `frontend/src/features/floor/application/useWaiterWorkflows.ts`                          | Monolithic stores           |
| **Floor Grid & Tables**          | `frontend/src/features/floor/presentation/FloorGridView.tsx`                             | `WaiterCashierScreen.tsx`   |
| **Table Actions & Tabs**         | `frontend/src/features/table-service/presentation/TableActionModal.tsx`                  | Monolithic modals           |
| **Table Transfer / Move**        | `frontend/src/features/table-service/presentation/table-transfer/TableTransferModal.tsx` | `REQUIREMENTS.md`           |
| **Order Entry & Cart**           | `frontend/src/features/orders/presentation/order-entry/OrderEntryModal.tsx`              | Monolithic modals           |
| **Order Store / State**          | `frontend/src/features/orders/application/useOrderStore.ts`                              | All slice files             |
| **Orders API & Dispatch**        | `frontend/src/features/orders/data/orders.api.ts`                                        | Monolithic APIs             |
| **Tables API & Tabs API**        | `frontend/src/features/table-service/data/tables.api.ts`                                 | Monolithic files            |
| **Checkout & Settlement**        | `frontend/src/features/checkout/presentation/bill-settlement/BillSettlementModal.tsx`    | Monolithic store            |
| **Check History / Audit**        | `frontend/src/features/check-history/presentation/ChecksHistoryView.tsx`                 | Full history view           |
| **Takeout Orders**               | `frontend/src/features/takeout/presentation/NewTakeoutModal.tsx`                         | Monolithic waiter view      |
| **Delivery Orders**              | `frontend/src/features/delivery/presentation/OnlineDeliveryModal.tsx`                    | Full screen files           |
| **Cash Drawer Operations**       | `frontend/src/features/cash-drawer/presentation/CashDrawerModalView.tsx`                 | Monolithic views            |
| **Menu & Auto-86 Catalog**       | `frontend/src/features/menu/data/menu.api.ts`                                            | Monolithic mock files       |
| **Station KDS (Bar/Kitchen)**    | `frontend/src/features/kds/presentation/common/UnifiedKdsScreen.tsx`                     | Entire KDS folder           |
| **FOH Runner Expediter**         | `frontend/src/features/kds/presentation/foh-runner/screens/FohRunnerScreen.tsx`          | Full runner views           |
| **Alerts & Call Bells**          | `frontend/src/features/alerts/presentation/SharedAlertsView.tsx`                         | Large modal trees           |
| **Inter-station Chat**           | `frontend/src/features/chat/presentation/SharedChatView.tsx`                             | Full chat view              |
| **Staff Auth & PINs**            | `frontend/src/features/auth/application/useAuthStore.ts`                                 | Full login views            |
| **Shared Infrastructure**        | `frontend/src/features/shared/infrastructure/api.ts`                                     | Full client trees           |
| **Toast Notifications**          | `frontend/src/features/shared/toast/useToastStore.ts`                                    | Toast container trees       |
| **Thermal Printing Daemon**      | `packages/printing/src/daemon.ts`                                                        | `REQUIREMENTS.md` Section 6 |
| **Thermal Printing Monitor UI**  | `frontend/src/features/printer/presentation/PrinterTerminalScreen.tsx`                   | Full screen files           |
| **Database Migrations**          | `supabase/migrations/` (check latest migration)                                          | Full `database.types.ts`    |

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
