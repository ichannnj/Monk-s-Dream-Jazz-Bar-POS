# ⚡ Phase 4: Code-Splitting, Lazy-Loading & Scoped Realtime Subscriptions

> **Status:** Completed  
> **Target:** Slash cold-boot bundle size on floor tablets and prevent unnecessary Supabase Realtime CDC subscriptions in public modes.

---

## 🎯 Objectives

1. Decouple heavy Back-Office views (`AdminBackOfficeScreen`), public flyers (`PublicEventCalendarScreen`), and hardware drivers (`HardwarePrintStationScreen`) using `React.lazy()` and `Suspense`.
2. Convert heavy Excel generators (`readingExcelExport.ts`) to dynamic `await import(...)` so floor terminals never parse spreadsheet engines.
3. Scope Supabase Realtime CDC channels (`orders`, `chat`, `venue_settings`) in `App.tsx` strictly to authenticated staff sessions, eliminating bandwidth leakage in public modes (`?mode=events`, `?mode=timeclock`).

---

## 🛠️ Implementation Checklist

- [x] **Step 4.1: React Lazy & Suspense Boundary**
  - Update `frontend/App.tsx`:
    - Lazily import `AdminBackOfficeScreen`, `PublicEventCalendarScreen`, `HardwarePrintStationScreen`, and `TimeclockKioskScreen`.
    - Create a sleek, branded `ScreenLoadingFallback.tsx` component with Monk's Dream emblem.
    - Also lazily load `TimeclockKioskScreen` in `LoginScreen.tsx`.
    - Removed barrel re-exports from `features/printer`, `features/events`, and `features/auth` to prevent eager bundle pollution.
- [x] **Step 4.2: Dynamic Import for Heavy Exporters**
  - Refactored `readingExcelExport.ts` consumers (`ChecksHistoryView.tsx`, `AdminTrendsReportView.tsx`, `AdminEventsView.tsx`):
    - Load spreadsheet generation modules asynchronously inside export trigger functions (`await import(...)`) instead of top-level imports.
- [x] **Step 4.3: Scoped Realtime Subscriptions**
  - Refactored `useEffect` in `frontend/App.tsx`:
    - Extracted pure policy `getRealtimeSubscriptionPlan` into `realtimeSubscriptionScope.ts` with 6 unit tests.
    - Check `Boolean(currentUser && !isHeadlessMode)` before initiating order CDC and presence tracking.
    - Public mode (`?mode=events`) subscribes only to public `venue_events` changes, avoiding order and financial publications.

---

## 🧪 Verification Plan

- [x] `pnpm build`: Verify web export completes with split JS chunks (`AdminBackOfficeScreen-*.js` [651KB], `HardwarePrintStationScreen-*.js` [20KB], `TimeclockKioskScreen-*.js` [9.5KB], `PublicEventCalendarScreen-*.js` [3.4KB]).
- [x] `pnpm test`: All 7 test suites (41 tests) pass.
- [x] Floor POS navigation: Verify smooth lazy transition into Admin Back-Office upon manager login.
