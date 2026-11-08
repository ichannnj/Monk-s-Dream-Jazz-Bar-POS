# Blueprint 12: Checks History & Cashless Views Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/check-history/presentation/ChecksHistoryView.tsx` (775 LOC)
  - `frontend/src/features/admin/presentation/views/transactions/AdminCashlessTransactionsView.tsx` (623 LOC)
  - `frontend/src/features/check-history/data/checks.api.ts` (359 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/check-history/data/checkMapper.ts` (`~155 LOC`)
   - Database row to settled check model transformation and fiscal date helpers.
2. `frontend/src/features/check-history/data/checks.api.ts` (`~215 LOC` Facade)
   - Checks fetch, search query filters, thermal receipt reprint job creation.
3. `frontend/src/features/check-history/presentation/components/ChecksFilterToolbar.tsx` (`~220 LOC`)
   - Search input, payment channel filter chips, operating mode filter, date selector, export button.
4. `frontend/src/features/check-history/presentation/components/CheckDetailReceiptModal.tsx` (`~275 LOC`)
   - Receipt modal preview with thermal reprint and browser print options.
5. `frontend/src/features/check-history/presentation/ChecksHistoryView.tsx` (`~275 LOC` Facade)
   - Composes toolbar, checks table/list, and receipt preview modal.
6. `frontend/src/features/admin/presentation/views/transactions/cashless/CashlessChannelSummaryRow.tsx` (`~215 LOC`)
   - Totals per digital channel (GCash, Maya, Bank Transfer, QRPH) with transaction count and amount.
7. `frontend/src/features/admin/presentation/views/transactions/cashless/CashlessReceiptModal.tsx` (`~195 LOC`)
   - Dedicated cashless receipt inspection modal with 4-digit reference emphasis.
8. `frontend/src/features/admin/presentation/views/transactions/AdminCashlessTransactionsView.tsx` (`~245 LOC` Facade)
   - Cashless register layout coordinating channel summary cards and transaction table.

## Execution Steps

1. Decompose `checks.api.ts` into mapper and API facade.
2. Extract components from `ChecksHistoryView.tsx`.
3. Extract cashless summary and receipt components from `AdminCashlessTransactionsView.tsx`.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/check-history/data/*.ts \
     frontend/src/features/check-history/presentation/ChecksHistoryView.tsx \
     frontend/src/features/check-history/presentation/components/* \
     frontend/src/features/admin/presentation/views/transactions/AdminCashlessTransactionsView.tsx \
     frontend/src/features/admin/presentation/views/transactions/cashless/*
pnpm sync:knowledge
```
