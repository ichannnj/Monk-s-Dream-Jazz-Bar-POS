# Blueprint 05: Admin Inventory View (`AdminInventoryView.tsx`) Decomposition

## Target & Metrics

- **Current Target**: `frontend/src/features/admin/presentation/views/AdminInventoryView.tsx` (1,427 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/presentation/views/inventory/useInventoryViewController.ts` (`~265 LOC`)
   - Inventory sub-tab switching (`stock`, `movements`, `audit`, `suppliers`), search query, category filtering, low-stock filter.
   - Handlers: Restock delivery, quick adjust, log waste, submit stocktake audit, delete item/supplier.
2. `frontend/src/features/admin/presentation/views/inventory/InventoryStockGridSection.tsx` (`~275 LOC`)
   - Valuation summary cards, low stock alerts, search/filter bar, ingredient table with status badges and quick restock actions.
3. `frontend/src/features/admin/presentation/views/inventory/InventoryMovementsAndAuditSection.tsx` (`~250 LOC`)
   - Stock movement ledger table (reasons, variance, timestamps) and interactive physical count stocktake worksheet.
4. `frontend/src/features/admin/presentation/views/inventory/InventorySuppliersSection.tsx` (`~215 LOC`)
   - Suppliers directory cards, contact info, lead time, and add/edit supplier modal trigger.
5. `frontend/src/features/admin/presentation/views/inventory/InventoryActionModals.tsx` (`~270 LOC`)
   - Modals: Create/Edit Ingredient, Restock Inbound Delivery, Waste Log / Quick Adjustment.
6. `frontend/src/features/admin/presentation/views/AdminInventoryView.tsx` (`~185 LOC` View Shell)
   - Coordinates controller and section views.

## Execution Steps

1. Create `useInventoryViewController.ts`.
2. Extract sections into `InventoryStockGridSection.tsx`, `InventoryMovementsAndAuditSection.tsx`, `InventorySuppliersSection.tsx`, and `InventoryActionModals.tsx`.
3. Refactor `AdminInventoryView.tsx` into an orchestrator view shell.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/presentation/views/AdminInventoryView.tsx frontend/src/features/admin/presentation/views/inventory/*
pnpm sync:knowledge
```
