# Blueprint 02: Admin Transactions View (`AdminTransactionsView.tsx`) Decomposition

## Target & Metrics

- **Current Target**: `frontend/src/features/admin/presentation/views/AdminTransactionsView.tsx` (1,679 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/presentation/views/transactions/AdminTransactionsView.styles.ts` (`~230 LOC`)
   - Shared styled components and layout styles for transactions view.
2. `frontend/src/features/admin/presentation/views/transactions/useTransactionsController.ts` (`~260 LOC`)
   - State management: `subTab` (`overview`, `checks`, `cashless`, `readings`, `trends`), timeframe state, calendar date/month pickers.
   - Handlers: fetch sales overview data, print report handler, export financial excel trigger.
3. `frontend/src/features/admin/presentation/views/transactions/TransactionsFilterHeader.tsx` (`~230 LOC`)
   - Sub-tab navigation bar, timeframe filter pills, custom date/month picker triggers, and export action buttons.
4. `frontend/src/features/admin/presentation/views/transactions/FinancialOverviewSubTab.tsx` (`~275 LOC`)
   - Net sales hero cards (Cafe vs Event vs Consolidated), payment method breakdown, VAT / Service Charge / Discount summaries.
5. `frontend/src/features/admin/presentation/views/transactions/TransactionsLedgerTable.tsx` (`~265 LOC`)
   - Settled transactions list, status pills, payment channel tags, and receipt modal triggers.
6. `frontend/src/features/admin/presentation/views/transactions/PrintableFinancialReport.tsx` (`~225 LOC`)
   - A4 `@media print` executive statement container with element ID `#monks-financial-report-printable`.
7. `frontend/src/features/admin/presentation/views/AdminTransactionsView.tsx` (`~195 LOC` Facade/View Shell)
   - Imports `useTransactionsController` and renders header, sub-tab switches, and sub-views.

## Execution Steps

1. Create `AdminTransactionsView.styles.ts`.
2. Extract controller logic into `useTransactionsController.ts`.
3. Extract `TransactionsFilterHeader.tsx`, `FinancialOverviewSubTab.tsx`, `TransactionsLedgerTable.tsx`, and `PrintableFinancialReport.tsx`.
4. Refactor `AdminTransactionsView.tsx` down to <200 LOC.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/presentation/views/AdminTransactionsView.tsx frontend/src/features/admin/presentation/views/transactions/*
pnpm sync:knowledge
```
