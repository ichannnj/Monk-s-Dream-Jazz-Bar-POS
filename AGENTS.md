# Agent Operating Guidelines — Monk's Dream Jazz Bar POS

> **Core System Context:** Read **[CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)** for domain invariants, PIN matrix, and business rules.  
> **Developer Setup & Commands:** Read **[CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)**.  
> **Golden Rule:** **NEVER read large files (`REQUIREMENTS.md` [83KB], `mockData.ts` [34KB], or `database.types.ts` [30KB]) in full.** Use targeted pointers and slicing (`StartLine`/`EndLine`).

---

## 🎯 Task-to-File Fast Router (Look Here, Not Everywhere)

| If your task is...                    | Read THIS file first                                                                                                                                                                                                                                                                                                       | DO NOT read this (too large)                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database, Schema, or Migration**    | [supabase/migrations/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/)                                                                                                                                                                                                          | `REQUIREMENTS.md`                                                                                                                             |
| **Database Types & Supabase Schemas** | Import from `@monks/shared` or slice specific tables via `grep_search`                                                                                                                                                                                                                                                     | Entire [database.types.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/shared/src/database.types.ts) [30KB] |
| **Menu Items, Recipes or Seed Data**  | [supabase/seed.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/seed.sql) or [frontend/src/mock/menu.mock.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/mock/menu.mock.ts)                                                                       | Monolithic `mockData.ts` (use `src/mock/` domain files)                                                                                       |
| **Depletion Math & Inventory Rules**  | [phases/phase-2-realtime-gateway-depletion.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-2-realtime-gateway-depletion.md#L35-L65)                                                                                                                                                  | `REQUIREMENTS.md` Section 7                                                                                                                   |
| **Order Entry & Menu Catalog**        | [frontend/src/components/waiter/order-entry/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/order-entry/)                                                                                                                                                            | Entire monolithic modal                                                                                                                       |
| **Floor POS UI, Modals & Table Grid** | [frontend/src/components/waiter/FloorGridView.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/FloorGridView.tsx) and [useFloorFilters.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/useFloorFilters.ts) | Entire `WaiterCashierScreen.tsx`                                                                                                              |
| **Bill Settlement & Checkout**        | [frontend/src/components/waiter/bill-settlement/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/bill-settlement/)                                                                                                                                                    | Entire monolithic modal                                                                                                                       |
| **Split Tabs or Table Transfers**     | [frontend/src/components/waiter/table-transfer/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/table-transfer/)                                                                                                                                                      | `REQUIREMENTS.md`                                                                                                                             |
| **Admin Item Image Management**       | [frontend/src/components/waiter/admin-item-image/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/admin-item-image/)                                                                                                                                                  | Monolithic modals                                                                                                                             |
| **Backend API Services**              | [frontend/src/services/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/services/) (`auth.api`, `orders.api`, `tables.api`, `menu.api`)                                                                                                                                                 | Old monolithic client                                                                                                                         |
| **Takeout or Online Delivery**        | [NewTakeoutModal.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/NewTakeoutModal.tsx) or [OnlineDeliveryModal.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/components/waiter/OnlineDeliveryModal.tsx)                   | `REQUIREMENTS.md` Section 3.4                                                                                                                 |
| **Thermal Printing & ESC/POS**        | [packages/printing/src/index.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/printing/src/index.ts)                                                                                                                                                                                      | `REQUIREMENTS.md` Section 6                                                                                                                   |
| **Staff Roles & 4-Digit PINs**        | [packages/shared/src/index.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/shared/src/index.ts) or [frontend/src/mock/staff.mock.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/src/mock/staff.mock.ts)                                               | Old `mockData.ts`                                                                                                                             |
| **Phase Roadmap & Progress**          | [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md) or [phases/README.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/README.md)                                                                                                                   | Entire spec                                                                                                                                   |

---

## 🛡️ Rules of Engagement & Token Efficiency

- **Token Efficiency (Slicing):** Slice files by line numbers using `StartLine` and `EndLine`; avoid dumping entire files over 300 lines into context.
- **Single Source of Truth:** Rely on the active `phases/` blueprints and [CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md) for implementation details.
- **Preserve Documentation Integrity:** Maintain all existing comments, docstrings, and Diátaxis documentation structure intact.
- **Frontend Architecture Invariants:**
  - Platform: React Native (Expo SDK 52+) targeting touchscreen tablets.
  - Styling: NativeWind v4 (`tailwindcss` 3.4). Do NOT install Tailwind v4 or web CSS.
  - Component Purity: Web DOM primitives (`<div>`, `<span>`, `<button>`, `<input>`) are strictly forbidden; use React Native primitives (`View`, `Text`, `Pressable`).
  - Routing: Role-based conditional switching in [frontend/App.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/App.tsx). Never introduce Expo Router or `src/app/`.
  - State: Zustand stores in `src/store/`.
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
