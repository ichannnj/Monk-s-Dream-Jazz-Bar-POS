# 🖨️ Phase 6: Hardware Print Station Telemetry & Security Hardening

> **Status:** Pending Execution  
> **Target:** Real-time printer out-of-paper warnings, PIN brute-force lockout, and immutable manager override audit trails.

---

## 🎯 Objectives

1. Query ESC/POS real-time status (`DLE EOT 1` / `DLE EOT 4`) via WebUSB/Serial in `HardwarePrintStationScreen.tsx` to detect paper-out or paper-low states and broadcast to `station_status`.
2. Display a visual warning toast on Floor POS when the counter thermal printer is out of paper.
3. Add automated client-side brute-force throttling on `LoginScreen.tsx` (30-second lockout after 5 consecutive failed PIN attempts).
4. Create an immutable supervisor override audit table (`supervisor_override_logs`) capturing voids, mode switches, and drawer kicks.

---

## 🛠️ Implementation Checklist

- [ ] **Step 6.1: Database Migration**
  - Create `supabase/migrations/20261114000003_supervisor_override_audit.sql`:
    - Create `public.supervisor_override_logs`:
      - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
      - `supervisor_id UUID REFERENCES public.users(id)`
      - `action_type TEXT NOT NULL` (e.g. `'ITEM_VOID'`, `'MODE_SWITCH'`, `'DRAWER_KICK'`, `'COMP'`)
      - `target_tab_id UUID REFERENCES public.tabs(id)`
      - `reason TEXT`
      - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    - Add `printer_paper_status TEXT DEFAULT 'ok'` to `public.station_status`.
- [ ] **Step 6.2: ESC/POS Status Polling & Telemetry**
  - Update `packages/printing/src/webSerialPrinter.ts` and `HardwarePrintStationScreen.tsx`:
    - Poll printer status every 10 seconds via `DLE EOT 4` (paper roll status).
    - Broadcast status to Supabase `station_status`.
- [ ] **Step 6.3: PIN Pad Rate Limiting**
  - Update `frontend/src/features/auth/presentation/LoginScreen.tsx`:
    - Track failed PIN attempts in state/session storage.
    - If failed attempts $\ge 5$, disable PIN inputs for 30 seconds with an animated countdown timer.
- [ ] **Step 6.4: Supervisor Override Audit Logging**
  - In `TableActionVoidModal.tsx` and `ManagerModeSwitchModal.tsx`, invoke `log_supervisor_override` upon successful verification.

---

## 🧪 Verification Plan

- [ ] Automated test: Verify PIN pad locks after 5 failed inputs and unlocks after 30 seconds.
- [ ] Database test: Verify supervisor override triggers write to `supervisor_override_logs`.
- [ ] Hardware test: Simulate paper-low condition and verify Floor POS displays the warning toast.
