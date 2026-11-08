# Blueprint 19: Events & Trends Analytics Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/events/presentation/components/CreateEditEventModal.tsx` (612 LOC)
  - `frontend/src/features/admin/data/trends.api.ts` (415 LOC)
  - `frontend/src/features/admin/presentation/views/trends/AdminTrendsReportView.tsx` (414 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/events/presentation/components/EventPosterAndLogisticsSection.tsx` (`~265 LOC`)
   - Poster image upload dropzone, preview, soundcheck / backline / VIP tables checklist.
2. `frontend/src/features/events/presentation/components/CreateEditEventModal.tsx` (`~295 LOC` Facade)
   - Event title, date, start/end time, artist info, coordinating logistics section.
3. `frontend/src/features/admin/data/trendsAggregators.ts` (`~210 LOC`)
   - Best day of week, multi-granularity timeline, and ranked best-sellers aggregation algorithms.
4. `frontend/src/features/admin/data/trends.api.ts` (`~225 LOC` Facade)
   - Trends query API delegating raw row aggregation to `trendsAggregators.ts`.
5. `frontend/src/features/admin/presentation/views/trends/TrendsPrintableReportSection.tsx` (`~185 LOC`)
   - A4 printable trends executive summary document (`#monks-trends-report-printable`).
6. `frontend/src/features/admin/presentation/views/trends/AdminTrendsReportView.tsx` (`~245 LOC` Facade)
   - Trends report view coordinating chart widgets, ranking table, and printable document.

## Execution Steps

1. Extract logistics and poster section from `CreateEditEventModal.tsx`.
2. Extract aggregation math from `trends.api.ts`.
3. Extract printable layout from `AdminTrendsReportView.tsx`.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/events/presentation/components/* \
     frontend/src/features/admin/data/trends* \
     frontend/src/features/admin/presentation/views/trends/*
pnpm sync:knowledge
```
