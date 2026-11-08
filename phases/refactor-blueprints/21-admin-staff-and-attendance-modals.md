# Blueprint 21: Admin Staff & Attendance Modals Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/admin/presentation/views/AdminStaffView.tsx` (434 LOC)
  - `frontend/src/features/admin/presentation/views/staff/EditStaffModal.tsx` (402 LOC)
  - `frontend/src/features/admin/presentation/views/staff/CreateUserAccountModal.tsx` (376 LOC)
  - `frontend/src/features/admin/presentation/views/attendance/AttendanceReportModal.tsx` (355 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/presentation/views/staff/RoleSelectorPills.tsx` (`~150 LOC`)
   - Role selection tabs (`POS System Roles`, `Non-User Venue Personnel`, `Admin`), minimum wage indicator.
2. `frontend/src/features/admin/presentation/views/staff/CreateUserAccountModal.tsx` (`~240 LOC` Facade)
   - Staff account creation modal delegating role selection.
3. `frontend/src/features/admin/presentation/views/staff/AdminSecurityResetSection.tsx` (`~175 LOC`)
   - Admin password direct reset form and staff PIN reset fields.
4. `frontend/src/features/admin/presentation/views/staff/EditStaffModal.tsx` (`~240 LOC` Facade)
   - Staff edit modal delegating security reset section.
5. `frontend/src/features/admin/presentation/views/staff/StaffRosterCardRow.tsx` (`~205 LOC`)
   - Individual staff roster card, role badge, pay rate, active/inactive toggle switch.
6. `frontend/src/features/admin/presentation/views/AdminStaffView.tsx` (`~245 LOC` Facade)
   - Staff directory view coordinating roster rows and creation modals.
7. `frontend/src/features/admin/presentation/views/attendance/AttendancePrintableA4Sheet.tsx` (`~165 LOC`)
   - A4 printable attendance and wage ledger sheet for signature signoff.
8. `frontend/src/features/admin/presentation/views/attendance/AttendanceReportModal.tsx` (`~205 LOC` Facade)
   - Attendance report modal coordinating preview and A4 printable sheet.

## Execution Steps

1. Extract `RoleSelectorPills.tsx` from `CreateUserAccountModal.tsx`.
2. Extract `AdminSecurityResetSection.tsx` from `EditStaffModal.tsx`.
3. Extract `StaffRosterCardRow.tsx` from `AdminStaffView.tsx`.
4. Extract `AttendancePrintableA4Sheet.tsx` from `AttendanceReportModal.tsx`.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/presentation/views/AdminStaffView.tsx \
     frontend/src/features/admin/presentation/views/staff/* \
     frontend/src/features/admin/presentation/views/attendance/AttendanceReportModal.tsx \
     frontend/src/features/admin/presentation/views/attendance/AttendancePrintableA4Sheet.tsx
pnpm sync:knowledge
```
