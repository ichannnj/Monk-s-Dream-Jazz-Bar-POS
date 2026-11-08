# Blueprint 07: Menu Item Modal (`MenuItemModal.tsx`) Decomposition

## Target & Metrics

- **Current Target**: `frontend/src/features/admin/presentation/views/menu/MenuItemModal.tsx` (1,329 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/presentation/views/menu/item-modal/MenuItemModal.styles.ts` (`~210 LOC`)
   - Modal layout, form sections, and matrix grid styles.
2. `frontend/src/features/admin/presentation/views/menu/item-modal/useMenuItemModalController.ts` (`~280 LOC`)
   - Product form state (name, category, station, base price, outside food supplier/cost).
   - Drink temperature (HOT/COLD) and size matrix price generation.
   - Modifiers selection, price overrides, custom modifier creator.
   - Image upload lifecycle, form submission, and validation.
3. `frontend/src/features/admin/presentation/views/menu/item-modal/MenuItemBasicInfoSection.tsx` (`~240 LOC`)
   - Basic details, station target selector, image picker/preview, outside food toggle & cost.
4. `frontend/src/features/admin/presentation/views/menu/item-modal/MenuItemVariantMatrixSection.tsx` (`~255 LOC`)
   - Temperature toggle buttons, size selection pills, custom size input, matrix price/availability table.
5. `frontend/src/features/admin/presentation/views/menu/item-modal/MenuItemModifiersSection.tsx` (`~275 LOC`)
   - Grouped modifier options, select all/clear category buttons, price overrides, and custom option builder.
6. `frontend/src/features/admin/presentation/views/menu/MenuItemModal.tsx` (`~175 LOC` Facade/Modal Shell)
   - Coordinates controller and sections in modal container.

## Execution Steps

1. Create `item-modal/MenuItemModal.styles.ts`.
2. Extract controller logic into `item-modal/useMenuItemModalController.ts`.
3. Extract `MenuItemBasicInfoSection.tsx`, `MenuItemVariantMatrixSection.tsx`, and `MenuItemModifiersSection.tsx`.
4. Refactor `MenuItemModal.tsx` to under 200 LOC.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/presentation/views/menu/MenuItemModal.tsx \
     frontend/src/features/admin/presentation/views/menu/item-modal/*
pnpm sync:knowledge
```
