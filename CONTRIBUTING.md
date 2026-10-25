# 🤝 CONTRIBUTING.md — Developer Setup & Collaboration Guide

> **Audience:** Human Engineers, Contributors & Code Reviewers  
> **Mission:** Clean setup, reliable local development, and uniform code quality standards across the Monk's Dream POS monorepo.

---

## 🏗️ Monorepo Structure

```
Monk-s-Dream-Jazz-Bar-POS/
├── phases/                         # Modular implementation blueprints & specs
│   ├── phase-1-data-models-and-seeding.md
│   ├── phase-2-realtime-gateway-depletion.md
│   ├── phase-3-station-kds-tablets.md
│   ├── phase-4-pos-integration.md
│   ├── phase-5-thermal-printing.md
│   └── phase-6-admin-and-analytics.md
│
├── supabase/                       # Supabase BaaS (Database, Auth, Realtime)
│   ├── config.toml                 # Local Supabase ports & service definitions
│   ├── migrations/                 # PostgreSQL schema DDL & stored procedures
│   └── seed.sql                    # Initial staff PINs, table layout, recipes & menu items
│
├── frontend/                       # React Native (Expo SDK 52) Tablet Application
│   ├── App.tsx                     # Entry point & role-based screen switcher
│   └── src/
│       ├── features/               # Feature-first domain modules (4 layers each)
│       │   ├── auth/               # screens/LoginScreen, application/useAuthStore, data/auth.api
│       │   ├── floor/              # FloorGridView, TableCard, TableFilterBar, data/resolver
│       │   ├── table-service/      # TableActionModal, TableTransferModal, OpenTabModal
│       │   ├── orders/             # OrderEntryModal, useOrderStore, data/orders.api
│       │   ├── checkout/           # BillSettlementModal, application/settlement.slice
│       │   ├── check-history/      # ChecksHistoryView, check inspection
│       │   ├── takeout/            # NewTakeoutModal, TakeoutQueueCard
│       │   ├── delivery/           # OnlineDeliveryModal, OnlineDeliveryCard
│       │   ├── cash-drawer/        # CashDrawerModalView, ledger, drawer metrics
│       │   ├── menu/               # data/menu.api, domain/menu.types, data/menu.mock
│       │   ├── kds/                # UnifiedKdsScreen, barista/, kitchen/, foh-runner/
│       │   ├── alerts/             # SharedAlertsView, station notification bells
│       │   ├── chat/               # SharedChatView, inter-station messaging
│       │   └── shared/             # ui/ConfirmationModal, navigation/Sidebar, toast/, infrastructure/
│       └── types/                  # Shared floor domain contracts & legacy type aliases
│
└── packages/                       # Shared Monorepo Packages
    ├── shared/src/index.ts         # Zod schemas, DB types (database.types.ts), HLC clocks
    └── printing/src/index.ts       # Linux USB ESC/POS driver & receipt byte generator
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v20.x or higher
- **Package Manager:** `pnpm` (v9+)
- **Supabase CLI:** `npx supabase`

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Monk-s-Dream-Jazz-Bar-POS

# Install dependencies across all workspaces
pnpm install
```

---

## 🛠️ Essential Terminal Commands

### 1. Database & Supabase BaaS

```bash
# Set up local Supabase development environment & Docker containers
pnpm supabase:setup:local

# Start / stop local Supabase containers
pnpm supabase:start
pnpm supabase:stop

# Reset database: wipe test orders/transactions and restore fresh baseline seed
pnpm supabase:reset

# Switch frontend between Local and Cloud environments
pnpm env:local
pnpm env:cloud

# Push migrations to Supabase Cloud Postgres
npx supabase db push

# Auto-generate TypeScript definitions from the database schema
pnpm supabase:types
```

### 2. Frontend Development

```bash
# Start the Expo development server (Web preview on port 8081)
pnpm --filter @monks/frontend web

# Run Expo for tablet development builds
pnpm --filter @monks/frontend start
```

### 3. Build & Quality Verification Guardrails

```bash
# 1. Static Analysis & Linting (ESLint 9 Flat Config)
pnpm lint                    # Check entire monorepo
pnpm lint:fix                # Auto-fix linting issues

# 2. Type Checking (Turborepo)
pnpm typecheck               # Verify TypeScript types across all workspaces

# 3. Code Formatting (Prettier)
pnpm format:check            # Verify formatting
pnpm format                  # Auto-format all code and markdown

# 4. Supabase BaaS & Database Guardrails
pnpm db:lint                 # Validate SQL migrations (mandatory RLS & search_path)
pnpm db:types:check          # Ensure database.types.ts matches migrations

# 5. Monorepo Build Verification
pnpm build                   # Turbo cached build across all packages
```

---

## 📐 Architecture Invariants & Standards

1. **Strict TypeScript Types & Feature-First Imports:**
   - Always import domain models and schemas directly from canonical `features/<domain>` or `@monks/shared`.
   - Never re-create barrel facade layers outside of `src/features/`.
2. **React Native & NativeWind v4 Mandate:**
   - The frontend is built for touchscreen tablets using React Native primitives (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`).
   - Web DOM elements (`<div>`, `<span>`, `<button>`, `<input>`) are **strictly prohibited** and blocked by ESLint.
   - Styling uses NativeWind v4 (`className="..."`). Typography floor: all text must be $\ge$ 16px (`text-base` or larger). Touch targets must be min 48px (`min-h-[48px] min-w-[48px]`).
3. **Role-Based Conditional Navigation:**
   - Navigation is handled through role-based conditional switching inside [frontend/App.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/App.tsx) based on `currentUser.role` in `useAuthStore`.
   - **DO NOT** introduce Expo Router or create a `src/app/` directory.
4. **Supabase BaaS & Database Guardrails:**
   - Every `CREATE TABLE` migration must have `ENABLE ROW LEVEL SECURITY;`.
   - Every `SECURITY DEFINER` function must explicitly set `SET search_path = public;`.
   - Client credentials in `frontend/src/features/shared/infrastructure/supabase.ts` are validated at startup with Zod.
5. **Git Hooks & CI Automation:**
   - **Pre-commit:** Husky runs `lint-staged` (Prettier + ESLint fix on staged files).
   - **Pre-push:** Runs `pnpm typecheck`, `pnpm build`, and `pnpm db:lint`.
   - **CI:** GitHub Actions validates all checks in parallel on PRs and pushes to `main`.
6. **Preserve Documentation & Comments:**
   - Maintain all existing comments, docstrings, and Diátaxis documentation structure across all commits.
7. **Feature-First 4-Layer Taxonomy & 250–350 LOC Standard:**
   - To preserve token efficiency and ensure clean separation of concerns, all logic under `frontend/src/features/<domain>/` is organized into 4 explicit layers:
     - `presentation/`: React Native screens, modals, components, and local UI state hooks.
     - `application/`: Workflow coordinators, Zustand store slices (`*.slice.ts`), and optimistic updates.
     - `domain/`: Business rules, formulas, calculations, and local domain types.
     - `data/`: Supabase queries/RPCs (`*.api.ts`), database resolvers, and realtime handlers.
   - All source files strictly target **250–350 lines of code max**.
   - Refer to [AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md) for the active Repository Architecture & Task-to-File Fast Router.

---

## 🌿 Git & Pull Request Guidelines

- **Branch Naming:** `feat/<phase-or-feature>`, `fix/<issue-name>`, `refactor/<scope>`.
- **Commit Messages:** Follow conventional commits:
  - `feat(kds): add station buzzout timer badge`
  - `fix(depletion): prevent double decrement on order update`
  - `docs(context): document corkage fee calculation`
- **Pre-PR / Pre-Commit Verification Steps:**
  - [ ] `pnpm typecheck` passes with zero errors across all workspaces.
  - [ ] `pnpm lint:quiet` passes with zero errors.
  - [ ] `pnpm db:lint` passes all migration security checks.
  - [ ] `pnpm build` completes successfully.
  - [ ] `pnpm format:check` reports all files formatted.

---

## 📚 Cross References

- Business Domain & Venue Rules: [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)
- Agent Operating Guidelines & Router: [AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)
- Phased Implementation Blueprint: [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md)
- Master Venue Requirements: [REQUIREMENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)
