# 🔬 Technical Research & Blueprint: Monorepo Development Guardrails

> **Repository:** Monk's Dream Jazz Bar POS  
> **Topic:** Comprehensive guardrails, development standards, static analysis, architectural invariants, and CI/CD pipelines across React Native, NativeWind, and Supabase BaaS.  
> **Target Audience:** Engineering Leads, POS Developers, Systems Architects.  
> **Output Location:** `docs/research-development-guardrails.md`  
> **Date:** October 18, 2026

---

## Executive Summary

The **Monk's Dream Jazz Bar POS** is a mission-critical, real-time touchscreen point-of-sale platform running on React Native (Expo SDK 52+), styled with NativeWind v4 (Tailwind CSS 3.4), and backed by a serverless PostgreSQL architecture powered directly by **Supabase BaaS**.

To ensure high velocity, zero runtime regression, and flawless tablet operation during peak service, development must be protected by **automated guardrails**. Without automated guardrails, cross-platform codebases easily suffer from:

1. **Web DOM leaks** (e.g. accidental `<div>` or `<span>` imports breaking mobile builds).
2. **Architectural violations** (e.g. introducing Expo Router when role-based routing is strictly required in `App.tsx`, or importing `mockData.ts` in production services).
3. **Styling fragmentation** (e.g. Tailwind v4 upgrades breaking NativeWind v4, or arbitrary hardcoded hex colors violating the dark jazz palette).
4. **Database-Client drift** (e.g. Supabase migrations drifting from `packages/shared/src/database.types.ts`, missing RLS on newly created tables, or untracked schema changes).

This research paper lays out the primary-source-backed guardrail architecture, rule definitions, toolchain selections, and implementation roadmap.

---

## 1. Architectural Guardrail Framework

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MONK'S DREAM POS GUARDRAIL MATRIX                               │
├───────────────────┬───────────────────────────────┬────────────────────────────────────┤
│ Domain Layer      │ Guardrail Mechanism           │ Primary Invariants Enforced        │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ 1. Monorepo & Dev │ • Root TypeScript References  │ • Typecheck across all workspaces  │
│    Setup          │ • ESLint Flat Config          │ • Zero circular workspace deps     │
│                   │ • Prettier + lint-staged      │ • Automated pre-commit formatting  │
│                   │ • Turborepo pipelines         │ • Deterministic task cache         │
│                   │ • GitHub Actions CI           │ • Zero broken commits in `main`    │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ 2. React Native   │ • ESLint React Native Plugin  │ • No web DOM primitives (`<div>`)  │
│    (Expo SDK 52)  │ • Strict Import Boundaries    │ • No Expo Router / `src/app/`      │
│                   │ • Minimum Touch Target Rule   │ • Min 44px/48px touch targets      │
│                   │ • Zustand Isolation Rule      │ • No mock data in prod services    │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ 3. Styling        │ • NativeWind v4 Invariant     │ • Lock Tailwind to 3.4.x           │
│    (NativeWind v4)│ • ESLint Tailwind Rules       │ • Restrict to `jazz-*`/`wine-*`    │
│                   │ • Design Token Linter         │ • No arbitrary inline styling      │
├───────────────────┼───────────────────────────────┼────────────────────────────────────┤
│ 4. Supabase BaaS  │ • CI Type-Sync Check          │ • `database.types.ts` matches SQL  │
│    & Database     │ • Supabase CLI Linter (splint)│ • 100% RLS enabled on all tables   │
│                   │ • Stored Procedure Contracts  │ • `SECURITY DEFINER` + search_path │
│                   │ • Migration Hygiene           │ • Pure Git-based migrations only   │
└───────────────────┴───────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Pillar 1: Monorepo & Toolchain Guardrails

### 2.1 Workspace Orchestration with Turborepo & pnpm

- **Primary Source:** [Turborepo Configuration Docs](https://turbo.build/repo/docs/core-concepts/monorepos/task-pipelines) & [pnpm Workspaces](https://pnpm.io/workspaces).
- **Current State:** Root `package.json` has `turbo` and `prettier`, but `turbo.json` lacks explicit `typecheck` pipelines, and `frontend/package.json` does not expose a `build` or `typecheck` script.
- **Guardrail Specification:**
  - Standardize script names across `@monks/frontend`, `@monks/shared`, and `@monks/printing`:
    - `build`: compile / bundle packages.
    - `typecheck`: run `tsc --noEmit`.
    - `lint`: run ESLint across source files.
    - `test`: execute unit/integration test suites.
  - Turborepo Pipeline in `turbo.json`:
    ```json
    {
      "$schema": "https://turbo.build/schema.json",
      "tasks": {
        "build": {
          "dependsOn": ["^build"],
          "outputs": ["dist/**"]
        },
        "typecheck": {
          "dependsOn": ["^build"]
        },
        "lint": {},
        "test": {
          "dependsOn": ["build"]
        },
        "dev": {
          "cache": false,
          "persistent": true
        }
      }
    }
    ```

### 2.2 Root & Project TypeScript Strictness

- **Primary Source:** [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html).
- **Guardrail Specification:**
  - Root `tsconfig.base.json` shared across packages.
  - Flags enforced:
    - `"strict": true`
    - `"noImplicitAny": true`
    - `"strictNullChecks": true`
    - `"noUncheckedIndexedAccess": true`
    - `"isolatedModules": true`

---

## 3. Pillar 2: React Native (Expo) Architecture Guardrails

### 3.1 Banning Web DOM Elements & Enforcing Native Primitives

- **Primary Source:** [React Native Architecture](https://reactnative.dev/docs/intro-react-native-components).
- **Risk:** Developers or AI subagents writing web React might introduce `<div>`, `<span>`, `<button>`, `<input>`, or HTML attributes like `style="color:red"`. In React Native Web these might render with quirks, but on iOS/Android native tablets they cause immediate fatal red screens (`Unrecognized tag <DIV>`).
- **Guardrail Specification:**
  - Configure ESLint with `eslint-plugin-react-native`:
    - Banning `react-dom` primitives in `src/components/**` and `src/auth/**`.
    - Enforcing native touchables: `<Pressable>`, `<TouchableOpacity>`, `<View>`, `<Text>`.

### 3.2 Navigation & Routing Invariant: Role-Based `App.tsx`

- **Invariant:** Navigation is role-based conditional switching inside `frontend/App.tsx`.
- **Guardrail Specification:**
  - ESLint `no-restricted-imports` restricting `expo-router`, `@react-navigation/native`, or `react-router-dom`.
  - Directory ban: Any file created in `frontend/src/app/` fails lint check.

### 3.3 Touch Target & Tablet Ergonomics

- **Primary Source:** [Material Design & Apple HIG Touch Targets](https://developer.apple.com/design/human-interface-guidelines/inputs).
- **Standard:** High-pressure jazz bar environment with fast order entry requires minimum touch targets of 44×44px (preferably 48×48px for keypad/PIN buttons).
- **Guardrail Specification:**
  - Preset classes in `tailwind.config.js`: `min-h-touch` (44px), `min-h-touch-md` (48px), `min-h-touch-lg` (56px).
  - Code review and component linting ensuring all buttons/tiles satisfy minimum touch bounds.

### 3.4 Data & Mock Layer Isolation

- **Invariant:** Production components and services must NEVER import from `mockData.ts` or `src/mock/*`.
- **Guardrail Specification:**
  - ESLint rule `no-restricted-imports`: Disallow importing from `../mock/*` or `../mockData` in `src/services/*`, `src/store/*`, and production UI screens. Mock data is permitted strictly in test files (`*.test.ts`, `*.spec.tsx`) and designated demo sandbox routes.

---

## 4. Pillar 3: Tailwind CSS & NativeWind v4 Guardrails

### 4.1 NativeWind v4 & Tailwind 3.4 Pinning

- **Primary Source:** [NativeWind v4 Documentation](https://www.nativewind.dev/v4/overview).
- **Risk:** Tailwind CSS v4 introduced a completely rewritten engine without JS config files (`tailwind.config.js`), moving to CSS-first `@theme` directives. Upgrading Tailwind to v4 breaks NativeWind v4.
- **Guardrail Specification:**
  - Lock `tailwindcss` strictly to `~3.4.17` / `^3.4.19` in `frontend/package.json`.
  - Block accidental installation of `@tailwindcss/vite` or Tailwind v4 packages.

### 4.2 Centralized Palette Enforcement

- **Invariant:** The Monk's Dream Jazz Bar identity relies on a specific velvet/gold/brass noir palette:
  - Backgrounds: `bg-jazz-950` (`#07090e`), `bg-jazz-900` (`#0d1117`), `bg-jazz-850` (`#131822`).
  - Accents: `text-jazz-gold` (`#f59e0b`), `bg-wine-900` (`#210c14`), `bg-stage-card`.
- **Guardrail Specification:**
  - Enforce `eslint-plugin-tailwindcss` with `tailwindcss/no-custom-classname` (or custom regex) to discourage arbitrary uncalibrated hex color classes (e.g. `bg-[#123456]`).

---

## 5. Pillar 4: Supabase BaaS & Database Guardrails

### 5.1 Automated Type Synchronization Check

- **Primary Source:** [Supabase CLI Types Generation](https://supabase.com/docs/guides/database/typescript-support).
- **Current Command:** `pnpm supabase:types` outputting to `packages/shared/src/database.types.ts`.
- **Guardrail Specification:**
  - Implement CI check script `pnpm supabase:types:check`:
    1. Spin up local Supabase or use linked database schema.
    2. Generate types to a temporary file.
    3. Run `git diff --exit-code packages/shared/src/database.types.ts`.
    4. If there is a diff, CI fails with: _"Database types are out of sync with migrations! Run `pnpm supabase:types` and commit the updated file."_

### 5.2 Mandatory Row Level Security (RLS) & Policy Checks

- **Primary Source:** [Supabase Hardening & RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security).
- **Risk:** Creating a table without RLS exposes customer tabs, revenue totals, or staff PIN hashes to any anonymous client connecting with `anon` public key.
- **Guardrail Specification:**
  - Supabase CLI Database Linter: `supabase db lint` checks for:
    - Tables without RLS enabled.
    - Security definer functions without explicit `search_path`.
  - Migration Checklist: All new migration files must include:
    ```sql
    ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
    ```

### 5.3 Stored Procedure Invariants

- **Rules for Stored Procedures (`SECURITY DEFINER`):**
  - Must explicitly declare `SET search_path = public, pg_temp;` to prevent search-path injection.
  - Must validate input parameters (e.g. 4-digit PIN format, quantity > 0).
  - Must use atomic transactions with explicit row locking (`SELECT ... FOR UPDATE`) when modifying inventory or table status.

---

## 6. Implementation Roadmap: 4 Planned Milestones

1. **Milestone A — Toolchain & Static Analysis Baseline:**
   - Add ESLint 9 / flat config with TypeScript, React Native, and Tailwind plugins.
   - Configure Prettier, `.prettierrc`, and `.prettierignore`.
   - Add `typecheck`, `lint`, and `build` scripts across all monorepo packages.
   - Update `turbo.json` with pipeline dependencies.
2. **Milestone B — Architectural Boundary Rules:**
   - Configure ESLint `no-restricted-imports` and `no-restricted-syntax` (banning web DOM tags, Expo Router, and leaking mock data).
   - Enforce tablet touch target constants.
3. **Milestone C — Supabase Type & Schema Drift Guards:**
   - Implement `scripts/verify-supabase-types.sh` / typecheck diff guard.
   - Add Supabase DB linting guidelines to migration workflow.
4. **Milestone D — Pre-commit Hook & GitHub Actions CI:**
   - Set up Husky / `lint-staged` for staged file validation.
   - Create `.github/workflows/ci.yml` running lint, typecheck, and build on PRs.

---

## 7. Primary Source References

- Expo SDK 52 Architecture: [https://docs.expo.dev](https://docs.expo.dev)
- NativeWind v4 Setup & Best Practices: [https://www.nativewind.dev/v4/overview](https://www.nativewind.dev/v4/overview)
- Supabase Database TypeScript Guide: [https://supabase.com/docs/guides/database/typescript-support](https://supabase.com/docs/guides/database/typescript-support)
- Turborepo Monorepo Pipelines: [https://turbo.build/repo/docs](https://turbo.build/repo/docs)
