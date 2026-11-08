# Blueprint 10: Order Entry & Item Image Modals Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/orders/presentation/order-entry/OrderEntryModal.styles.ts` (812 LOC)
  - `frontend/src/features/orders/presentation/order-entry/OrderEntryModal.tsx` (552 LOC)
  - `frontend/src/features/orders/presentation/admin-item-image/AdminItemImageModal.tsx` (491 LOC)
  - `frontend/src/features/menu/data/imageUpload.service.ts` (357 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/menu/data/imageCompression.utils.ts` (`~180 LOC`)
   - Browser canvas image compression, format checking, file size guardrails.
2. `frontend/src/features/menu/data/imageUpload.service.ts` (`~195 LOC` Facade)
   - Re-exports validation and Supabase storage upload/delete functions.
3. `frontend/src/features/orders/presentation/admin-item-image/useAdminItemImageController.ts` (`~210 LOC`)
   - Image file picker, preview state, upload progress, RPC trigger for menu item image update.
4. `frontend/src/features/orders/presentation/admin-item-image/AdminItemImageModal.tsx` (`~260 LOC`)
   - Refactored modal shell and upload dropzone.
5. `frontend/src/features/orders/presentation/order-entry/OrderEntryModal.styles.ts` (`~230 LOC`)
   - Base modal container and grid styles.
6. `frontend/src/features/orders/presentation/order-entry/useOrderEntryController.ts` (`~240 LOC`)
   - Category filtering, item selection, round management, cart modifications, order dispatch triggers.
7. `frontend/src/features/orders/presentation/order-entry/components/OrderEntryHeaderAndCategories.tsx` (`~215 LOC`)
   - Search bar, category pill tabs, station target chips.
8. `frontend/src/features/orders/presentation/order-entry/components/OrderTicketSummaryDrawer.tsx` (`~265 LOC`)
   - Order round summary, item modifier display, round dispatch actions.
9. `frontend/src/features/orders/presentation/order-entry/OrderEntryModal.tsx` (`~190 LOC` View Shell)
   - Coordinates controller and extracted sections.

## Execution Steps

1. Decompose `imageUpload.service.ts` into core compression and upload methods.
2. Refactor `AdminItemImageModal.tsx` with its dedicated controller.
3. Trim `OrderEntryModal.styles.ts` and extract sub-components for order entry.
4. Refactor `OrderEntryModal.tsx` down to shell layout.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/orders/presentation/order-entry/OrderEntryModal.tsx \
     frontend/src/features/orders/presentation/order-entry/OrderEntryModal.styles.ts \
     frontend/src/features/orders/presentation/order-entry/useOrderEntryController.ts \
     frontend/src/features/orders/presentation/order-entry/components/* \
     frontend/src/features/orders/presentation/admin-item-image/* \
     frontend/src/features/menu/data/imageUpload.service.ts \
     frontend/src/features/menu/data/imageCompression.utils.ts
pnpm sync:knowledge
```
