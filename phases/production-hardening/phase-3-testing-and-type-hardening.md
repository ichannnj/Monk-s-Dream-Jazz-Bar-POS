# 🧪 Phase 3: Type-Level Hardening (Matt Pocock Spec) & Vitest Test Harness

> **Status:** Pending Execution  
> **Target:** Eradicate all `any` types across API layers, achieve zero ESLint errors, and establish a modern Vitest test suite.

---

## 🎯 Objectives

1. Configure `vitest` in the root workspace and packages for ultra-fast, modern ESM TypeScript testing.
2. Fix `MODULE_TYPELESS_PACKAGE_JSON` warning by adding `"type": "module"` to `frontend/package.json`.
3. Eliminate `@typescript-eslint/no-explicit-any` warnings across all API client files by binding directly to `packages/shared/src/database.types.ts`.
4. Implement rigorous unit and integration tests covering:
   - Philippine 12% VAT extraction and Station-Aware Service Charge calculations.
   - Senior Citizen / PWD 2-step statutory discount formulas (RA 9994 / RA 10754).
   - Session inactivity watchdog and midnight attendance reconciliation.
   - Split-tender balance allocation and rounding.

---

## 🛠️ Implementation Checklist

- [ ] **Step 3.1: Install Vitest & Configure Tooling**
  - Add `vitest` to `package.json` devDependencies.
  - Create `vitest.config.ts` supporting path aliases (`@/*` and `@monks/shared`).
  - Add `"type": "module"` to `frontend/package.json`.
  - Update root `"test"` script to `vitest run`.
- [ ] **Step 3.2: Matt Pocock Type-Level Hardening**
  - Audit and refactor API clients with strict types:
    - `frontend/src/features/admin/data/adminTelemetry.ts`
    - `frontend/src/features/admin/data/api/attendancePayroll.api.ts`
    - `frontend/src/features/admin/data/api/catalogModifiers.api.ts`
    - `frontend/src/features/admin/data/api/catalogProducts.api.ts`
    - `frontend/src/features/checkout/data/tables.api.ts`
    - `packages/printing/src/daemon.ts` and `index.ts`
  - Replace `any` casts with type guards, `unknown` narrowing, and `Tables<'table_name'>`.
- [ ] **Step 3.3: Vitest Test Suite Suite Implementation**
  - Port existing scripts to modern Vitest suites:
    - `frontend/src/features/checkout/__tests__/taxAndDiscountCalculator.test.ts`
    - `frontend/src/features/auth/__tests__/inactivityPolicy.test.ts`
    - `frontend/src/features/checkout/__tests__/splitTender.test.ts`
    - `frontend/src/features/orders/__tests__/durableQueue.test.ts`
- [ ] **Step 3.4: ESLint Cleanliness Check**
  - Run `pnpm lint:quiet` to verify 0 errors and drastically drop warning counts.

---

## 🧪 Verification Plan

- [ ] `pnpm test`: All Vitest tests pass cleanly in under 2 seconds.
- [ ] `pnpm typecheck`: Clean compile with zero TypeScript errors across all 4 projects.
- [ ] Node execution without typeless package warnings.
