# Blueprint 08: Admin Dashboard View & Telemetry Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/admin/presentation/views/AdminDashboardView.tsx` (1,131 LOC)
  - `frontend/src/features/admin/data/adminTelemetry.ts` (886 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/data/telemetry/timeframeBounds.ts` (`~145 LOC`)
   - Timeframe filter bounds for Manila 6AM cutoff.
2. `frontend/src/features/admin/data/telemetry/stationAndTableTelemetry.ts` (`~265 LOC`)
   - Table occupancy reconciler, 5-minute station heartbeat checker, live KDS turnaround aggregation.
3. `frontend/src/features/admin/data/telemetry/salesAndVelocityTelemetry.ts` (`~285 LOC`)
   - Dual-mode revenue totals (Cafe vs Event), hourly sales velocity buckets, category mix, top products.
4. `frontend/src/features/admin/data/adminTelemetry.ts` (`~195 LOC` Facade)
   - Re-exports `getTimeframeBounds`, `adminTelemetryService`, and interfaces.
5. `frontend/src/features/admin/presentation/views/dashboard/useAdminDashboardController.ts` (`~220 LOC`)
   - Dashboard state, timeframe selection, date picker, live station turnaround ticker, alert clearing.
6. `frontend/src/features/admin/presentation/views/dashboard/DashboardKpiAndModeSection.tsx` (`~265 LOC`)
   - Timeframe bar, Cafe vs Event revenue banner, and primary KPI cards.
7. `frontend/src/features/admin/presentation/views/dashboard/DashboardChartsAndStationsSection.tsx` (`~275 LOC`)
   - Hourly sales velocity chart, category mix bars, and live station status/turnaround cards.
8. `frontend/src/features/admin/presentation/views/dashboard/DashboardActivityAndAlertsSection.tsx` (`~245 LOC`)
   - Tonight's event card, low-stock alerts panel, top products, and recent orders.
9. `frontend/src/features/admin/presentation/views/AdminDashboardView.tsx` (`~165 LOC` Facade/View Shell)
   - Coordinates controller and dashboard sections.

## Execution Steps

1. Decompose `adminTelemetry.ts` into `timeframeBounds.ts`, `stationAndTableTelemetry.ts`, and `salesAndVelocityTelemetry.ts`.
2. Extract dashboard controller and sections under `dashboard/`.
3. Refactor `AdminDashboardView.tsx` down to shell layout.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/data/adminTelemetry.ts \
     frontend/src/features/admin/data/telemetry/*.ts \
     frontend/src/features/admin/presentation/views/AdminDashboardView.tsx \
     frontend/src/features/admin/presentation/views/dashboard/*
pnpm sync:knowledge
```
