# Blueprint 04: Admin Attendance & Payroll View (`AdminAttendancePayrollView.tsx`) Decomposition

## Target & Metrics

- **Current Target**: `frontend/src/features/admin/presentation/views/AdminAttendancePayrollView.tsx` (1,499 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/presentation/views/attendance/useAttendancePayrollController.ts` (`~275 LOC`)
   - Timeframe range calculations (Today, Yesterday, Specific Date, This Week, Select Week, This Month, Select Month, All-Time).
   - Live timer tick logic for clocked-in staff, recalculating elapsed shift times.
   - Admin payroll exemption computation (`base_daily_pay = 0.00`).
   - Clock-in/out overrides, edit modal opening, export handlers.
2. `frontend/src/features/admin/presentation/views/attendance/AttendanceSummaryKpiRow.tsx` (`~210 LOC`)
   - KPI metric cards: Total Clocked-In, Absent Staff, Base Wages, OT/Bonuses, Total Payroll Expense.
3. `frontend/src/features/admin/presentation/views/attendance/AttendanceToolbarAndPickers.tsx` (`~245 LOC`)
   - Timeframe filter bar, date/week/month picker dialogs, role filter tabs, search field, Print and Excel buttons.
4. `frontend/src/features/admin/presentation/views/attendance/AttendanceRosterTable.tsx` (`~285 LOC`)
   - Staff attendance data table, shift progress bar, live elapsed hours badge, 1-click punch actions, Admin Payroll Exempt badge.
5. `frontend/src/features/admin/presentation/views/attendance/AttendanceEditAndBonusModals.tsx` (`~260 LOC`)
   - Manual punch adjustment modal and discretionary addon/bonus modal.
6. `frontend/src/features/admin/presentation/views/AdminAttendancePayrollView.tsx` (`~190 LOC` View Shell)
   - Coordinates controller with sub-components.

## Execution Steps

1. Create `useAttendancePayrollController.ts`.
2. Extract `AttendanceSummaryKpiRow.tsx`, `AttendanceToolbarAndPickers.tsx`, `AttendanceRosterTable.tsx`, and `AttendanceEditAndBonusModals.tsx`.
3. Simplify `AdminAttendancePayrollView.tsx` down to shell layout.
4. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/presentation/views/AdminAttendancePayrollView.tsx frontend/src/features/admin/presentation/views/attendance/*
pnpm sync:knowledge
```
