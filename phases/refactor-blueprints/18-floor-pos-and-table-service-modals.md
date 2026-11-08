# Blueprint 18: Floor POS & Table Service Modals Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/table-service/presentation/table-transfer/TableTransferModal.tsx` (582 LOC)
  - `frontend/src/features/floor/presentation/UnifiedCommandBar.tsx` (510 LOC)
  - `frontend/src/features/floor/presentation/TableFilterBar.tsx` (464 LOC)
  - `frontend/src/features/table-service/presentation/TableItemTransferModal.tsx` (391 LOC)
  - `frontend/src/features/floor/presentation/TableCard.tsx` (381 LOC)
  - `frontend/src/features/floor/application/useWaiterWorkflows.ts` (380 LOC)
  - `frontend/src/features/table-service/presentation/OpenTableTabModal.tsx` (368 LOC)
  - `frontend/src/features/delivery/presentation/OnlineDeliveryModal.tsx` (356 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/table-service/presentation/table-transfer/useTableTransferController.ts` (`~160 LOC`)
   - Target table selection, validation, transfer execution.
2. `frontend/src/features/table-service/presentation/table-transfer/TableTransferTargetGrid.tsx` (`~230 LOC`)
   - Available tables grid, target status indicators.
3. `frontend/src/features/table-service/presentation/table-transfer/TableTransferModal.tsx` (`~265 LOC` Facade)
   - Coordinates controller and target grid.
4. `frontend/src/features/floor/presentation/CommandBarRightActions.tsx` (`~265 LOC`)
   - Floor mode switch pill, manager override trigger, quick action icons.
5. `frontend/src/features/floor/presentation/UnifiedCommandBar.tsx` (`~245 LOC` Facade)
   - Floor command bar shell composing left info and right action controls.
6. `frontend/src/features/floor/presentation/FloorStatusPillsRow.tsx` (`~235 LOC`)
   - All / Available / Occupied / Billed status pills and quick counts.
7. `frontend/src/features/floor/presentation/TableFilterBar.tsx` (`~240 LOC` Facade)
   - Composes search bar and status pills.
8. `frontend/src/features/table-service/presentation/TransferableItemChecklist.tsx` (`~175 LOC`)
   - Item checklist with quantity stepper for partial item tab transfers.
9. `frontend/src/features/table-service/presentation/TableItemTransferModal.tsx` (`~235 LOC` Facade)
   - Coordinates item checklist and target tab selector.
10. `frontend/src/features/floor/presentation/TableCard.styles.ts` (`~165 LOC`)
    - Styles for table card, occupancy badges, timer pills.
11. `frontend/src/features/floor/presentation/TableCard.tsx` (`~230 LOC` Facade)
    - Clean table card component importing co-located styles.
12. `frontend/src/features/floor/application/waiterModalState.ts` (`~170 LOC`)
    - Modal state management for waiter floor operations.
13. `frontend/src/features/floor/application/useWaiterWorkflows.ts` (`~225 LOC` Facade)
    - Workflow actions hook delegating modal state.
14. `frontend/src/features/table-service/presentation/ExistingTabsListSection.tsx` (`~160 LOC`)
    - Existing tabs list on active table.
15. `frontend/src/features/table-service/presentation/OpenTableTabModal.tsx` (`~225 LOC` Facade)
    - New tab creation modal delegating existing tabs list.
16. `frontend/src/features/delivery/presentation/DeliveryPlatformSelector.tsx` (`~150 LOC`)
    - FoodPanda / GrabFood platform buttons and fee calculation.
17. `frontend/src/features/delivery/presentation/OnlineDeliveryModal.tsx` (`~220 LOC` Facade)
    - Delivery order modal delegating platform selector.

## Execution Steps

1. Decompose `TableTransferModal.tsx` into controller and grid.
2. Split `UnifiedCommandBar.tsx` and `TableFilterBar.tsx`.
3. Extract styles from `TableCard.tsx`.
4. Decompose `useWaiterWorkflows.ts`, `TableItemTransferModal.tsx`, `OpenTableTabModal.tsx`, and `OnlineDeliveryModal.tsx`.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/table-service/presentation/* \
     frontend/src/features/table-service/presentation/table-transfer/* \
     frontend/src/features/floor/presentation/* \
     frontend/src/features/floor/application/* \
     frontend/src/features/delivery/presentation/*
pnpm sync:knowledge
```
