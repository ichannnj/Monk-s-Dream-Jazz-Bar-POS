# Blueprint 15: Admin Recipes & Catalog Modals Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/admin/presentation/views/AdminRecipesView.tsx` (757 LOC)
  - `frontend/src/features/admin/presentation/views/menu/RecipeBomModal.tsx` (471 LOC)
  - `frontend/src/features/menu/data/menu.api.ts` (392 LOC)
  - `frontend/src/features/admin/presentation/views/menu/ModifierGroupModal.tsx` (365 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/menu/data/menuMapper.ts` (`~175 LOC`)
   - Product, category, and variant data mapper functions.
2. `frontend/src/features/menu/data/menu.api.ts` (`~230 LOC` Facade)
   - MenuApi service singleton delegating mapping logic to `menuMapper.ts`.
3. `frontend/src/features/admin/presentation/views/menu/useAdminRecipesController.ts` (`~235 LOC`)
   - Category selection, search filter, auto-86 toggle handler, BOM modal opening, product deletion.
4. `frontend/src/features/admin/presentation/views/menu/CatalogCategoriesAndModifiersBar.tsx` (`~240 LOC`)
   - Category pills, add category button, modifier groups manager button, export catalog button.
5. `frontend/src/features/admin/presentation/views/menu/CatalogProductCardGrid.tsx` (`~255 LOC`)
   - Product cards with recipe status (BOM configured vs missing), auto-86 badge, edit/delete actions.
6. `frontend/src/features/admin/presentation/views/AdminRecipesView.tsx` (`~185 LOC` View Shell)
   - Coordinates controller, categories bar, and product card grid.
7. `frontend/src/features/admin/presentation/views/menu/RecipeBomIngredientRow.tsx` (`~210 LOC`)
   - Ingredient selection dropdown, unit of measure indicator, quantity input, cost calculation.
8. `frontend/src/features/admin/presentation/views/menu/RecipeBomModal.tsx` (`~275 LOC` Facade)
   - Modal shell, target product summary, ingredients list, total recipe cost summary.
9. `frontend/src/features/admin/presentation/views/menu/ModifierOptionRowList.tsx` (`~155 LOC`)
   - Option row inputs (name, price adjustment, default selected switch).
10. `frontend/src/features/admin/presentation/views/menu/ModifierGroupModal.tsx` (`~225 LOC` Facade)
    - Modal shell, modifier group name, min/max selection rules, options list.

## Execution Steps

1. Decompose `menu.api.ts` with `menuMapper.ts`.
2. Extract controller and components from `AdminRecipesView.tsx`.
3. Extract row components from `RecipeBomModal.tsx` and `ModifierGroupModal.tsx`.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/menu/data/menu.* \
     frontend/src/features/admin/presentation/views/AdminRecipesView.tsx \
     frontend/src/features/admin/presentation/views/menu/*
pnpm sync:knowledge
```
