# Blueprint 20: Admin Settings, Stations & Tables Suite

## Target & Metrics

- **Current Targets**:
  - `frontend/src/features/admin/presentation/components/AdminQrPaymentManager.tsx` (492 LOC)
  - `frontend/src/features/admin/presentation/views/AdminStationsView.tsx` (479 LOC)
  - `frontend/src/features/admin/presentation/views/AdminSettingsView.tsx` (446 LOC)
  - `frontend/src/features/admin/presentation/views/AdminTableLayoutView.tsx` (444 LOC)
- **Constraint**: Strict `≤ 350 LOC` per file, 10–30 LOC function granularity, Zero-Breaking Facade pattern.

## Structural Breakdown & Line Budget

1. `frontend/src/features/admin/presentation/components/QrChannelEditCard.tsx` (`~240 LOC`)
   - Channel config form (GCash, Maya, Bank Transfer, QRPH), QR image upload dropzone, account details.
2. `frontend/src/features/admin/presentation/components/AdminQrPaymentManager.tsx` (`~265 LOC` Facade)
   - Active QR channels list delegating edit form to `QrChannelEditCard.tsx`.
3. `frontend/src/features/admin/presentation/views/stations/StationHeartbeatCard.tsx` (`~235 LOC`)
   - Station live heartbeat pill, online/offline status, workstation IP, turnaround metric reset.
4. `frontend/src/features/admin/presentation/views/AdminStationsView.tsx` (`~255 LOC` Facade)
   - Stations list coordinating station cards.
5. `frontend/src/features/admin/presentation/views/settings/VenueServiceChargeAndModeSection.tsx` (`~215 LOC`)
   - Cafe Mode food SC rate, Event Mode SC rate, 6:00 AM auto-reset configuration.
6. `frontend/src/features/admin/presentation/views/AdminSettingsView.tsx` (`~245 LOC` Facade)
   - Admin settings layout coordinating venue config sections and QR manager.
7. `frontend/src/features/admin/presentation/views/tables/TableLayoutFormModal.tsx` (`~205 LOC`)
   - Table create/edit modal (table number, capacity, shape, floor position).
8. `frontend/src/features/admin/presentation/views/AdminTableLayoutView.tsx` (`~250 LOC` Facade)
   - Table floor grid editor delegating modal form.

## Execution Steps

1. Extract `QrChannelEditCard.tsx` from `AdminQrPaymentManager.tsx`.
2. Extract `StationHeartbeatCard.tsx` from `AdminStationsView.tsx`.
3. Extract `VenueServiceChargeAndModeSection.tsx` from `AdminSettingsView.tsx`.
4. Extract `TableLayoutFormModal.tsx` from `AdminTableLayoutView.tsx`.
5. Run verification gates.

## Verification Gate

```bash
pnpm --filter frontend exec tsc --noEmit
wc -l frontend/src/features/admin/presentation/components/AdminQrPaymentManager.tsx \
     frontend/src/features/admin/presentation/components/QrChannelEditCard.tsx \
     frontend/src/features/admin/presentation/views/AdminStationsView.tsx \
     frontend/src/features/admin/presentation/views/stations/* \
     frontend/src/features/admin/presentation/views/AdminSettingsView.tsx \
     frontend/src/features/admin/presentation/views/settings/* \
     frontend/src/features/admin/presentation/views/AdminTableLayoutView.tsx \
     frontend/src/features/admin/presentation/views/tables/*
pnpm sync:knowledge
```
