# Blueprint 03: Reading Excel Export (`readingExcelExport.ts`) Decomposition

## Target & Metrics

- **Current Target**: `frontend/src/features/admin/utils/readingExcelExport.ts` (1,626 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/utils/excel/excelXmlCore.ts` (`~195 LOC`)
   - Core XML utilities: `formatMoney`, `escapeXml`, `triggerDownload`, SpreadsheetML template headers, shared XML styles block.
2. `frontend/src/features/admin/utils/excel/exportSingleReading.ts` (`~245 LOC`)
   - `exportSingleReadingToExcel(reading: ReadingData): void`
3. `frontend/src/features/admin/utils/excel/exportReadingsArchive.ts` (`~145 LOC`)
   - `exportReadingsArchiveToExcel(...)`
4. `frontend/src/features/admin/utils/excel/exportFinancialAndChecks.ts` (`~295 LOC`)
   - `exportFinancialOverviewToExcel(...)`
   - `exportChecksRegisterToExcel(...)`
   - `exportCashlessRegisterToExcel(...)`
5. `frontend/src/features/admin/utils/excel/exportAttendancePayroll.ts` (`~180 LOC`)
   - Interfaces `AttendanceExportItem`, `AttendanceExportTotals`
   - `exportAttendancePayrollToExcel(params: ...)`
6. `frontend/src/features/admin/utils/excel/exportCatalogAndInventory.ts` (`~255 LOC`)
   - `exportInventoryValuationToExcel(...)`
   - `exportMenuCatalogToExcel(...)`
7. `frontend/src/features/admin/utils/excel/exportEventsAndTrends.ts` (`~290 LOC`)
   - `exportEventsScheduleToExcel(...)`
   - `exportTrendsReportToExcel(...)`
8. `frontend/src/features/admin/utils/readingExcelExport.ts` (`~65 LOC` Facade)
   - Re-exports all 9 export functions and interfaces without changing import signatures.

## Execution Steps

1. Create `frontend/src/features/admin/utils/excel/excelXmlCore.ts`.
2. Extract domain-specific XML generators into sub-modules under `excel/`.
3. Re-export all functions from `readingExcelExport.ts`.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/utils/readingExcelExport.ts frontend/src/features/admin/utils/excel/*.ts
pnpm sync:knowledge
```
