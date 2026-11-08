# Blueprint 13: Admin Readings Suite (X/Y/Z Fiscal Closings)

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/admin/presentation/views/readings/ReadingReportModal.tsx` (768 LOC)
  - `frontend/src/features/admin/presentation/views/readings/AdminReadingsView.tsx` (731 LOC)
  - `frontend/src/features/admin/data/readings.api.ts` (449 LOC)
  - `frontend/src/features/admin/presentation/views/readings/YCloseShiftModal.tsx` (410 LOC)
  - `frontend/src/features/admin/presentation/views/readings/ZCloseShiftModal.tsx` (389 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/data/readings.types.ts` (`~145 LOC`)
   - Interfaces: `ReadingData`, `ZReadingRecord`, `YReadingRecord`, `ShiftVariancePoint`.
2. `frontend/src/features/admin/data/readings.api.ts` (`~310 LOC` Facade)
   - RPC triggers: `get_current_x_reading`, `close_shift_and_generate_y_reading`, `close_shift_and_generate_z_reading`, print reading slip queue.
3. `frontend/src/features/admin/presentation/views/readings/components/ShiftCloseReconSummary.tsx` (`~195 LOC`)
   - Shared cash reconciliation summary, open tab safety warnings, expected vs actual cash variance display.
4. `frontend/src/features/admin/presentation/views/readings/YCloseShiftModal.tsx` (`~240 LOC`)
   - Cashier shift handover modal, denomination counter integration, variance signoff.
5. `frontend/src/features/admin/presentation/views/readings/ZCloseShiftModal.tsx` (`~230 LOC`)
   - End-of-day final fiscal closeout modal, sequential Z-counter preview, daily lock trigger.
6. `frontend/src/features/admin/presentation/views/readings/components/ReadingSlipThermalPreview.tsx` (`~265 LOC`)
   - 80mm thermal receipt visual preview with monospace styling and print action button.
7. `frontend/src/features/admin/presentation/views/readings/components/ReadingPrintableA4Document.tsx` (`~260 LOC`)
   - A4 executive formal statement layout for browser print.
8. `frontend/src/features/admin/presentation/views/readings/ReadingReportModal.tsx` (`~245 LOC` Facade)
   - Coordinates thermal preview and A4 printable modal panes.
9. `frontend/src/features/admin/presentation/views/readings/useAdminReadingsController.ts` (`~235 LOC`)
   - Readings history fetching, active reading modal states, Excel archive export triggers.
10. `frontend/src/features/admin/presentation/views/readings/components/ReadingsHistoryLedgerSection.tsx` (`~265 LOC`)
    - Historical Y and Z records archive table with filter tabs.
11. `frontend/src/features/admin/presentation/views/readings/AdminReadingsView.tsx` (`~250 LOC` View Shell)
    - Coordinates current shift summary cards, action buttons, and history ledger.

## Execution Steps

1. Extract types into `readings.types.ts`.
2. Extract `ShiftCloseReconSummary.tsx` to deduplicate logic between Y and Z close modals.
3. Split `ReadingReportModal.tsx` into thermal preview and A4 printable document.
4. Extract controller and history ledger from `AdminReadingsView.tsx`.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/data/readings.* \
     frontend/src/features/admin/presentation/views/readings/AdminReadingsView.tsx \
     frontend/src/features/admin/presentation/views/readings/useAdminReadingsController.ts \
     frontend/src/features/admin/presentation/views/readings/YCloseShiftModal.tsx \
     frontend/src/features/admin/presentation/views/readings/ZCloseShiftModal.tsx \
     frontend/src/features/admin/presentation/views/readings/ReadingReportModal.tsx \
     frontend/src/features/admin/presentation/views/readings/components/*
pnpm sync:knowledge
```
