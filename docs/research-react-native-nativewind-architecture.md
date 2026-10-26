# 🔬 Technical Research: React Native & NativeWind v4 Architecture Best Practices

> **Repository:** Monk's Dream Jazz Bar POS  
> **Topic:** Industry standard file structuring, feature-first Clean Architecture, NativeWind v4 design systems, and enterprise monorepo organization for tablet POS systems.  
> **Output Location:** `docs/research-react-native-nativewind-architecture.md`  
> **Date:** October 27, 2026  
> **Author:** Antigravity Research Subsystem

---

## 1. Executive Summary

In enterprise React Native applications—particularly mission-critical POS and kiosk applications—file organization directly governs developer velocity, runtime performance, build times (Metro bundler graph resolution), and AI agent navigation.

This codebase currently exhibits a half-migrated architecture:

1. A modern **Feature-First Clean Architecture** (`frontend/src/features/<domain>/` with `presentation/`, `application/`, `domain/`, `data/`) was partially implemented.
2. A legacy **Component-First / Flat Structure** (`frontend/src/components/`, `frontend/src/auth/`, `frontend/src/mock/`) remains in the tree, containing dozens of redundant re-export barrels, dead duplicate code, and several active screens and workflow hooks that were never moved into canonical feature directories.
3. This creates circular import dependencies (e.g., `features/floor/` importing from `components/waiter/` which re-exports from `features/takeout/`), split ownership, and confusion for both human developers and LLM agents reading `AGENTS.md`.

This research synthesizes primary guidelines from **React Native Core**, **Expo Engineering**, **NativeWind v4 Specification**, and **Vercel React Native Architecture Standards** to establish a clean, production-ready directory structure without modifying application functionality or styling.

---

## 2. Industry Architecture Patterns for React Native

### 2.1 Feature-First (Domain-Driven) Layering

In accordance with modern React Native patterns (and Vercel's component composition guidelines), business capabilities are partitioned by domain rather than UI widget type.

Each feature is organized into 4 strict layers:

- **`presentation/`**: React Native views, screen coordinators, local modals, and pure UI components.
  - Must use React Native primitives (`View`, `Text`, `Pressable`, `ScrollView`).
  - Min touch target: 48×48px.
  - Min typography: 16px (`text-base`).
- **`application/`**: Workflow state machines, custom workflow hooks (`useWaiterWorkflows`), and Zustand slice stores.
- **`domain/`**: Business contracts, domain interfaces, state transitions, validation schemas, and calculation utilities (discounts, splits, round increments).
- **`data/`**: Supabase client callers, RPCs, real-time channel subscriptions, and offline sync handlers.

```text
features/<feature-name>/
├── presentation/
│   ├── components/      # Feature-specific UI components
│   ├── modals/          # Feature dialogs & modals
│   └── screens/         # Top-level screen views (if applicable)
├── application/         # Zustand store slices & workflow hooks
├── domain/              # Pure domain types, calculation rules
├── data/                # Supabase queries, RPCs, mock seeds
└── index.ts             # Public API boundary for the feature
```

### 2.2 Eliminating the "Ghost Monolith" & Proxy Barrels

An anti-pattern common during progressive refactorings is the **Proxy Barrel Tree**: leaving old directories (`src/components/`, `src/auth/`) filled with 1-line re-exports:

```ts
// Anti-Pattern: src/components/waiter/FloorGridView.tsx
export * from '../../features/floor/presentation/FloorGridView';
```

**Why this degrades codebases:**

1. **Metro Bundler Overhead**: Metro traces every re-export file, parsing multiple hops of AST before resolving module boundaries.
2. **Circular Dependencies**: When `features/floor` imports `components/waiter/TakeoutQueueCard`, which imports `features/takeout`, circular reference hazards emerge.
3. **Cognitive & Agent Confusion**: Agents and engineers find two paths to the same file (`@/components/waiter/...` vs `@/features/floor/...`), violating the **Single Source of Truth** principle.

**Industry Standard Solution**:

- Relocate all stranded active files (e.g. `WaiterCashierScreen`, `useWaiterWorkflows`, `WaiterModalsCluster`) into their rightful canonical feature (`features/floor/`).
- Update all consumers to import directly from canonical feature barrels (`@/features/floor`, `@/features/shared`, etc.).
- Safely delete the legacy `src/components/`, `src/auth/`, and `src/mock/` directories.

---

## 3. NativeWind v4 Best Practices

NativeWind v4 utilizes `react-native-css-interop` to compile Tailwind utility classes into React Native styles ahead-of-time (or just-in-time in development) without a runtime JS style parser.

### 3.1 Content Configuration

The `tailwind.config.js` `content` array must strictly cover all files containing utility classes:

```js
content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'];
```

Consolidating files under `src/features/` ensures zero missed files during Tailwind class extraction.

### 3.2 Design System Cohesion

- **Shared Tokens**: Colors (`jazz-*`, `wine-*`, `stage-*`) must be referenced via Tailwind utility classes (e.g., `bg-jazz-900`, `text-jazz-gold`).
- **Shared UI Primitives**: Common UI elements (`ConfirmationModal`, `Header`, `Sidebar`, `ToastContainer`) belong strictly in `features/shared/`.
- **Hybrid Preservation Rule**: Existing working `StyleSheet.create` blocks (such as in `WaiterCashierScreen.styles.ts` or `TableTransferModal.styles.ts`) must be preserved as-is to avoid visual regressions, while new views use 100% NativeWind v4.

---

## 4. State Management & Real-Time Sync Invariants

1. **Feature-Sliced Zustand Stores**:
   - `useOrderStore` composes slices: `channels.slice`, `hydration.slice`, `itemStatus.slice`, `realtime.slice`.
   - `useAuthStore` manages authentication and staff roles.
   - Slices must reside in `application/` folders.
2. **Offline-First & Hybrid Logical Clocks**:
   - Monorepo package `@monks/shared` supplies `hlc.ts` and `database.types.ts`.
   - Real-time mutations queue optimistic updates before Supabase RPC sync.

---

## 5. Clean Structure Blueprint for Monk's Dream POS

```text
frontend/src/
├── features/
│   ├── alerts/
│   │   ├── presentation/      # SharedAlertsView
│   │   └── index.ts
│   ├── auth/
│   │   ├── application/       # useAuthStore
│   │   ├── data/              # auth.api, staff.mock
│   │   ├── presentation/      # LoginScreen, PinCodeInput, etc.
│   │   └── index.ts
│   ├── cash-drawer/
│   │   ├── presentation/      # CashDrawerModalView, metrics, ledger, audit modals
│   │   └── index.ts
│   ├── chat/
│   │   ├── presentation/      # SharedChatView
│   │   └── index.ts
│   ├── check-history/
│   │   ├── presentation/      # ChecksHistoryView
│   │   └── index.ts
│   ├── checkout/
│   │   ├── presentation/      # BillSettlementModal
│   │   └── index.ts
│   ├── delivery/
│   │   ├── presentation/      # OnlineDeliveryModal, OnlineDeliveryCard
│   │   └── index.ts
│   ├── floor/
│   │   ├── application/       # useWaiterWorkflows, useOrderEntryFlow
│   │   ├── data/              # resolver, tables.mock
│   │   ├── domain/            # workflow.types, floor contracts
│   │   ├── presentation/      # WaiterCashierScreen, FloorGridView, TableCard, TableFilterBar, etc.
│   │   └── index.ts
│   ├── kds/
│   │   ├── domain/            # kds types
│   │   ├── presentation/      # barista/, kitchen/, foh-runner/, common/
│   │   └── index.ts
│   ├── menu/
│   │   ├── data/              # menu.api, menu.mock
│   │   └── index.ts
│   ├── orders/
│   │   ├── application/       # useOrderStore, slices
│   │   ├── data/              # orders.api, dispatch.api, depletion.api
│   │   ├── domain/            # order.types
│   │   ├── presentation/      # order-entry/, admin-item-image/
│   │   └── index.ts
│   ├── shared/
│   │   ├── infrastructure/    # supabase, realtime, audio, api
│   │   ├── navigation/        # Sidebar
│   │   ├── toast/             # useToastStore, ToastContainer, ToastCard
│   │   ├── ui/                # ConfirmationModal, Header
│   │   └── index.ts
│   ├── table-service/
│   │   ├── application/       # tableTab.slice, transfer.slice
│   │   ├── data/              # tables.api, tabs.api, transfer.api
│   │   ├── presentation/      # TableActionModal, TableTransferModal, OpenTableTabModal
│   │   └── index.ts
│   └── takeout/
│       ├── presentation/      # NewTakeoutModal, TakeoutQueueCard
│       └── index.ts
├── types/
│   └── floor.ts               # Shared contracts & legacy domain types
└── global.css
```

---

## 6. Actionable Migration Steps

1. **Step 1: Move Stranded Waiter/Floor Files**:
   - Relocate `WaiterCashierScreen.tsx`, `WaiterCashierScreen.styles.ts`, `WaiterModalsCluster.tsx`, `ShiftSettingsModal.tsx`, `useWaiterWorkflows.ts`, `useOrderEntryFlow.ts`, and `workflow.types.ts` into canonical `frontend/src/features/floor/`.
2. **Step 2: Clean Tangled Imports**:
   - Replace any relative imports pointing to `src/components/` with imports from `@/features/floor`, `@/features/shared`, `@/features/takeout`, `@/features/delivery`.
   - Update `frontend/App.tsx` to import `WaiterCashierScreen` from `./src/features/floor`.
3. **Step 3: Remove Dead Trees**:
   - Safely remove redundant legacy folders `frontend/src/components/`, `frontend/src/auth/`, and `frontend/src/mock/`.
4. **Step 4: Update Documentation**:
   - Fully update `AGENTS.md` file tree and Task-to-File router to reflect the clean structure.
5. **Step 5: Verification**:
   - Run `pnpm typecheck`, `pnpm lint:quiet`, and verify build stability.
