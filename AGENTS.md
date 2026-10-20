# Agent Operating Guidelines — Monk's Dream Jazz Bar POS

> **Core System Context:** Read **[CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)** for domain invariants, PIN matrix, and business rules.  
> **Developer Setup & Commands:** Read **[CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)**.  
> **Golden Rule:** **NEVER read large files (`REQUIREMENTS.md` [83KB], `mockData.ts` [34KB], or `database.types.ts` [30KB]) in full.** Use targeted pointers and slicing (`StartLine`/`EndLine`). Keep all codebase files between **250–350 lines of code max** to preserve token budget.

---

## 🗺️ Repository Architecture & Modular File Tree

Every core domain layer is decomposed into sub-modules (strictly ≤ 350 LOC). When modifying or reading code, navigate directly to the specific slice or sub-module:

```text
frontend/src/
├── store/
│   ├── useOrderStore.ts                 # [34 LOC] Root facade combining slices; 100% backward-compatible
│   ├── useAuthStore.ts                  # [44 LOC] User role, active staff, 4-digit PIN authentication
│   ├── useToastStore.ts                 # [114 LOC] Interactive alerts and ephemeral notifications
│   └── order/                           # Modular Order State Engine (each file ≤ 350 LOC)
│       ├── order.types.ts               # [119 LOC] State interfaces, mutation payloads, slice creators
│       ├── order.helpers.ts             # [32 LOC] HLC clock, deriveTabTotal, deriveTableStatus
│       └── slices/
│           ├── tableTab.slice.ts        # [270 LOC] openTableTab, addItemsToTab, closeEmptyTab
│           ├── transfer.slice.ts        # [247 LOC] transferTableOrTab (entire table or specific tab)
│           ├── settlement.slice.ts      # [198 LOC] settleTab, settleTableGroup, checkout checks
│           ├── itemStatus.slice.ts      # [301 LOC] updateOrderItemStatus, markServed, voidOrderItem
│           ├── channels.slice.ts        # [168 LOC] createTakeoutOrder, createOnlineOrder, drawer, chat
│           ├── hydration.slice.ts       # [305 LOC] hydrateFromSupabase, drainOfflineQueue
│           └── realtime.slice.ts        # [193 LOC] initRealtimeSync (Supabase channels & events)
├── services/
│   ├── tables.api.ts                    # [7 LOC] Facade re-exporting ./tables
│   ├── tables/                          # Modular Tables API (each file ≤ 350 LOC)
│   │   ├── index.ts                     # [25 LOC] TablesApi class aggregating sub-modules
│   │   ├── resolver.ts                  # [83 LOC] resolveTableUuid, cache, fuzzy slug resolution
│   │   ├── tabs.api.ts                  # [136 LOC] openTab, createTab, settleTabAndRecordPayment
│   │   └── transfer.api.ts              # [164 LOC] getTables, transferTableTab stored proc RPC
│   ├── orders.api.ts                    # [7 LOC] Facade re-exporting ./orders
│   ├── orders/                          # Modular Orders API (each file ≤ 350 LOC)
│   │   ├── index.ts                     # [36 LOC] OrdersApi class aggregating sub-modules
│   │   ├── depletion.api.ts             # [69 LOC] dispatchOrderWithDepletion, cancelOrderItem
│   │   └── dispatch.api.ts              # [323 LOC] createOrderWithItems, updateOrderItemStatus
│   ├── menu.api.ts                      # [236 LOC] Products, categories, recipe queries
│   ├── realtime.ts                      # [289 LOC] Centralized broadcast channel management
│   ├── auth.api.ts                      # [97 LOC] Supabase staff PIN verification
│   └── api.ts                           # [66 LOC] Core base API client
├── components/
│   ├── waiter/                          # Waiter & Cashier Floor POS Views
│   │   ├── order-entry/                 # Modular Order Entry catalog, cart, and item notes
│   │   ├── bill-settlement/             # Modular Checkout, payment splitting, discount dialogs
│   │   ├── table-transfer/              # Modular Table & Tab relocation modal
│   │   └── admin-item-image/            # Modal for item images and visual catalog
│   ├── kds/                             # Kitchen Display System (Barista, Kitchen, Runner)
│   └── navigation/                      # Role-aware Sidebar and status bars
└── types/floor.ts                       # Core POS domain models, tabs, checks, and orders
```

---

## 🎯 Task-to-File Fast Router (Look Here, Not Everywhere)

| If your task is...                      | Read THIS file first                                                                                                                                                                                                                                                                                                       | DO NOT read this (too large)                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open Tab / Add Items to Tab**         | [frontend/src/store/order/slices/tableTab.slice.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/order/slices/tableTab.slice.ts)                                                                                                                                                | Entire `useOrderStore.ts`                                                                                                                     |
| **Split Tab / Transfer Table**          | [frontend/src/store/order/slices/transfer.slice.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/order/slices/transfer.slice.ts)                                                                                                                                                | `REQUIREMENTS.md`                                                                                                                             |
| **Bill Settlement / Checkout**          | [frontend/src/store/order/slices/settlement.slice.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/order/slices/settlement.slice.ts)                                                                                                                                            | Entire monolithic store                                                                                                                       |
| **Item Status / Voids / Waste**         | [frontend/src/store/order/slices/itemStatus.slice.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/order/slices/itemStatus.slice.ts)                                                                                                                                            | Entire monolithic store                                                                                                                       |
| **Takeout / Delivery / Drawer / Chat**  | [frontend/src/store/order/slices/channels.slice.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/order/slices/channels.slice.ts)                                                                                                                                                | Entire monolithic store                                                                                                                       |
| **Supabase Hydration & Offline Replay** | [frontend/src/store/order/slices/hydration.slice.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/order/slices/hydration.slice.ts)                                                                                                                                              | Entire monolithic store                                                                                                                       |
| **Realtime Sync & Subscriptions**       | [frontend/src/store/order/slices/realtime.slice.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/store/order/slices/realtime.slice.ts)                                                                                                                                                | Entire monolithic store                                                                                                                       |
| **Table UUID Resolution & Caching**     | [frontend/src/services/tables/resolver.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/services/tables/resolver.ts)                                                                                                                                                                  | Entire `tables.api.ts`                                                                                                                        |
| **Tables & Tabs Backend API**           | [frontend/src/services/tables/tabs.api.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/services/tables/tabs.api.ts) & [transfer.api.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/services/tables/transfer.api.ts)                           | Entire monolithic service                                                                                                                     |
| **Orders Dispatch & Depletion API**     | [frontend/src/services/orders/depletion.api.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/services/orders/depletion.api.ts) & [dispatch.api.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/services/orders/dispatch.api.ts)                 | Entire monolithic service                                                                                                                     |
| **Database, Schema, or Migration**      | [supabase/migrations/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/)                                                                                                                                                                                                          | `REQUIREMENTS.md`                                                                                                                             |
| **Database Types & Supabase Schemas**   | Import from `@monks/shared` or slice specific tables via `grep_search`                                                                                                                                                                                                                                                     | Entire [database.types.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/shared/src/database.types.ts) [30KB] |
| **Menu Items, Recipes or Seed Data**    | [supabase/seed.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/seed.sql) or [frontend/src/mock/menu.mock.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/mock/menu.mock.ts)                                                                       | Monolithic `mockData.ts` (use `src/mock/` domain files)                                                                                       |
| **Depletion Math & Inventory Rules**    | [phases/phase-2-realtime-gateway-depletion.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-2-realtime-gateway-depletion.md#L35-L65)                                                                                                                                                  | `REQUIREMENTS.md` Section 7                                                                                                                   |
| **Order Entry & Menu Catalog**          | [frontend/src/components/waiter/order-entry/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/order-entry/)                                                                                                                                                            | Entire monolithic modal                                                                                                                       |
| **Floor POS UI, Modals & Table Grid**   | [frontend/src/components/waiter/FloorGridView.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/FloorGridView.tsx) and [useFloorFilters.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/useFloorFilters.ts) | Entire `WaiterCashierScreen.tsx`                                                                                                              |
| **Split Tabs or Table Transfers UI**    | [frontend/src/components/waiter/table-transfer/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/table-transfer/)                                                                                                                                                      | `REQUIREMENTS.md`                                                                                                                             |
| **Admin Item Image Management**         | [frontend/src/components/waiter/admin-item-image/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/admin-item-image/)                                                                                                                                                  | Monolithic modals                                                                                                                             |
| **Takeout or Online Delivery UI**       | [NewTakeoutModal.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/NewTakeoutModal.tsx) or [OnlineDeliveryModal.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/OnlineDeliveryModal.tsx)                   | `REQUIREMENTS.md` Section 3.4                                                                                                                 |
| **Thermal Printing & ESC/POS**          | [packages/printing/src/index.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/printing/src/index.ts)                                                                                                                                                                                      | `REQUIREMENTS.md` Section 6                                                                                                                   |
| **Staff Roles & 4-Digit PINs**          | [packages/shared/src/index.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/shared/src/index.ts) or [frontend/src/mock/staff.mock.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/mock/staff.mock.ts)                                               | Old `mockData.ts`                                                                                                                             |
| **Phase Roadmap & Progress**            | [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md) or [phases/README.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/README.md)                                                                                                                   | Entire spec                                                                                                                                   |

---

## 🛡️ Rules of Engagement & Token Efficiency

- **Token Efficiency & File Size Ceiling (250–350 LOC Standard):**
  - Every file in `frontend/src/` should strictly target **250–350 lines of code max**.
  - Never introduce new monolithic files. If a service or store grows beyond 350 LOC, split it into modular slices or dedicated sub-files within a domain directory (e.g., `store/order/slices/`, `services/tables/`).
  - Slice files by line numbers using `StartLine` and `EndLine`; avoid dumping entire files over 300 lines into context.
- **Single Source of Truth:** Rely on the active `phases/` blueprints and [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md) for implementation details.
- **Preserve Documentation Integrity:** Maintain all existing comments, docstrings, and Diátaxis documentation structure intact.
- **Frontend Architecture Invariants:**
  - Platform: React Native (Expo SDK 52+) targeting touchscreen tablets.
  - Styling Mandate (NativeWind v4):
    - New Views & Components: Must use 100% NativeWind v4 (`className="..."`). Do NOT create new `*.styles.ts` or new `StyleSheet.create` blocks.
    - Preservation Rule (Zero Regressions): Never convert, refactor, or delete existing `StyleSheet.create` code in already-built views. For existing views, apply NativeWind `className` strictly to newly added elements/subcomponents (Isolated Hybrid). See **[.agents/rules/nativewind-tablet-standards.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/.agents/rules/nativewind-tablet-standards.md)**.
  - Typography Standards (≥ 16px Floor): Every text element (body, buttons, inputs, status badges, chips, timestamps) must be at least 16px (`text-base` / `text-pos-base` or larger). Never use `text-xs`, `text-sm`, `text-pos-xs` (14px), or `text-pos-sm` (15px).
  - Tablet Ergonomics & Touch Targets: Minimum 48px touch targets (`min-h-[48px] min-w-[48px]`) on all interactive controls with responsive layouts (`tablet:` ≥768px, `pos:` ≥1024px).
  - Component Purity: Web DOM primitives (`<div>`, `<span>`, `<button>`, `<input>`) are strictly forbidden; use React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`).
  - Routing: Role-based conditional switching in [frontend/App.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/App.tsx). Never introduce Expo Router or `src/app/`.
  - State: Zustand modular stores in `src/store/` with slices in dedicated directories.
  - Domain Types: Strict TypeScript from `@monks/shared`, never from mock data.
  - Data Boundaries: Never import `mockData.ts` or `src/mock/*` in production services (`src/services/*`).
- **Database & Supabase Invariants:**
  - Mandatory RLS: Every `CREATE TABLE` must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
  - Security Definer: Functions must declare `SET search_path = public;`.

---

## 🤖 Rules for Subagents

- **Targeted Slicing:** Request line ranges when viewing large files instead of retrieving unbounded content blocks.
- **Strict Adherence to Standards:** Do not refactor components with unnecessary abstractions or add third-party styling packages without instruction.
- **Verification Before Completion:** Always confirm code integrity with:
  1. `pnpm typecheck` (TypeScript types across all workspaces)
  2. `pnpm lint` (ESLint 9 Flat Config)
  3. `pnpm db:lint` (SQL migrations & RLS)
  4. `pnpm build` (Turbo builds)
