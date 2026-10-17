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
│       ├── auth/                   # 4-digit PIN login screen & keypad
│       ├── components/waiter/      # Floor POS modals, table grid cards, cart
│       ├── components/kds/         # Barista & Kitchen station tablet screens
│       ├── components/printer/     # USB thermal print listener & testing
│       ├── components/admin/       # Recipe BOM editor, stock ledger & shift payroll
│       ├── store/                  # Zustand stores (useOrderStore, useAuthStore)
│       └── services/               # Supabase client & API services
│
└── packages/                       # Shared Monorepo Packages
    ├── shared/src/index.ts         # Zod schemas, DB types, Staff User types
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
# Push migrations to Supabase Cloud Postgres
npx supabase db push

# Reset local/cloud database and re-apply migrations and seed.sql
npx supabase db reset

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

### 3. Build & Quality Verification
```bash
# Lint the frontend package
pnpm --filter @monks/frontend lint

# Typecheck and build all packages & apps
pnpm build
```

---

## 📐 Architecture Invariants & Standards

1. **Strict TypeScript Types:**
   - Always import domain models and schemas from `@monks/shared` or `packages/shared/src/index.ts`.
   - Never import types from mock data files (`mockData.ts`).
2. **React Native & NativeWind v4:**
   - The frontend is built for touchscreen tablets using React Native primitives (`View`, `Text`, `Pressable`).
   - Styling uses NativeWind v4 (Tailwind 3.4). **Do NOT** install Tailwind v4 or web CSS frameworks.
3. **Role-Based Conditional Navigation:**
   - Navigation is handled through role-based conditional switching inside [frontend/App.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/App.tsx) based on `currentUser.role` in `useAuthStore`.
   - **DO NOT** introduce Expo Router or create a `src/app/` directory.
4. **Preserve Documentation & Comments:**
   - Maintain all existing comments, docstrings, and Diátaxis documentation structure across all commits.

---

## 🌿 Git & Pull Request Guidelines

- **Branch Naming:** `feat/<phase-or-feature>`, `fix/<issue-name>`, `refactor/<scope>`.
- **Commit Messages:** Follow conventional commits:
  - `feat(kds): add station buzzout timer badge`
  - `fix(depletion): prevent double decrement on order update`
  - `docs(context): document corkage fee calculation`
- **Pre-PR Checklist:**
  - [ ] `pnpm build` passes with zero TypeScript errors.
  - [ ] `pnpm --filter @monks/frontend lint` passes with zero warnings.
  - [ ] No large mock files or extraneous logs committed.

---

## 📚 Cross References
- Business Domain & Venue Rules: [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)
- Agent Operating Guidelines: [AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)
- Gemini & Antigravity Workflow: [GEMINI.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/GEMINI.md)
- Phased Implementation Blueprint: [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md)
