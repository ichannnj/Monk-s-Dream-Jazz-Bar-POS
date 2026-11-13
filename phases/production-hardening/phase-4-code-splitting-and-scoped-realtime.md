# ⚡ Phase 4: Code-Splitting, Lazy-Loading & Scoped Realtime Subscriptions

> **Status:** Pending Execution  
> **Target:** Slash cold-boot bundle size on floor tablets and prevent unnecessary Supabase Realtime CDC subscriptions in public modes.

---

## 🎯 Objectives

1. Decouple heavy Back-Office views (`AdminBackOfficeScreen`), public flyers (`PublicEventCalendarScreen`), and hardware drivers (`HardwarePrintStationScreen`) using `React.lazy()` and `Suspense`.
2. Convert heavy Excel generators (`xlsx` in `readingExcelExport.ts`) to dynamic `await import('xlsx')` so floor terminals never parse spreadsheet engines.
3. Scope Supabase Realtime CDC channels (`orders`, `chat`, `venue_settings`) in `App.tsx` strictly to authenticated staff sessions, eliminating bandwidth leakage in public modes (`?mode=events`, `?mode=timeclock`).

---

## 🛠️ Implementation Checklist

- [ ] **Step 4.1: React Lazy & Suspense Boundary**
  - Update `frontend/App.tsx`:
    - Lazily import `AdminBackOfficeScreen`, `PublicEventCalendarScreen`, `HardwarePrintStationScreen`, and `TimeclockKioskScreen`.
    - Create a sleek, branded `ScreenLoadingFallback.tsx` component with Monk's Dream emblem.
- [ ] **Step 4.2: Dynamic Import for Heavy Exporters**
  - Refactor `readingExcelExport.ts` and `adminTrends.api.ts`:
    - Load `xlsx` / `exceljs` asynchronously inside export trigger functions instead of top-level imports.
- [ ] **Step 4.3: Scoped Realtime Subscriptions**
  - Refactor `useEffect` in `frontend/App.tsx`:
    - Check `Boolean(currentUser && !isHeadlessMode)` before initiating order CDC and presence tracking.
    - Public mode (`?mode=events`) subscribes only to public `venue_events` changes, avoiding order and financial publications.

---

## 🧪 Verification Plan

- [ ] `pnpm build`: Verify web export completes with split JS chunks.
- [ ] Browser DevTools: Check Network tab on `?mode=events` and confirm order tables and chat channels are not subscribed.
- [ ] Floor POS navigation: Verify smooth lazy transition into Admin Back-Office upon manager login.
