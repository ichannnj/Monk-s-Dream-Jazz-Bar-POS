# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cashiers & Floor Waiters / Servers (`cashier`, `waiter`):** Operate handheld tablets (iPads/Android tablets), mobile phones, and counter touch PCs during fast-paced daytime cafe service and dim nighttime live jazz events. Perform table ordering, FOH pass delivery, round management, tab transfers/splits, takeout/delivery intake, cash drawer operations, and bill settlement.
- **Bartenders & Baristas (`station_bar`, `station_cafe`):** Operate counter Bar KDS tablets to prepare espresso, pour-overs, teas, cocktails, beer, and wine, plus walk-up bar floor ordering, Checks History, and the Bar Cash Drawer.
- **Kitchen Chefs (`station_food`):** Operate Kitchen KDS tablets for hot food, pasta, pizza, appetizers, and desserts (board preparation and checks audit only; no cash drawer or floor ordering).
- **Admin / Managers (`admin`):** Manage menu/recipes, inventory audits, staff roster, attendance & payroll ledger, X/Y/Z fiscal shift readings, operating mode switches, and security settings.
- **Non-POS Venue Personnel (`is_workflow_staff: false`):** Dishwashers, security, cleaners, sound techs, musicians, and barbacks who punch in and out via the standalone Staff Timeclock Kiosk (`?mode=timeclock`).

## Product Purpose

Monk's Dream Jazz Bar POS unifies floor table service, category-routed KDS preparation, FOH expediter pass delivery, cash drawer and ESC/POS thermal printing, universal staff attendance/payroll, and Philippine BIR/VAT-compliant back-office financial management into a single real-time hospitality platform.

## Positioning

Purpose-built for a dual-concept venue—a high-throughput daytime specialty cafe (`CAFE` mode) that transitions into a seated nighttime live jazz cocktail lounge (`EVENT` mode)—running from one shared React Native Web / NativeWind v4 codebase across tablets, counter PCs, standalone print stations (`?mode=printer`), and timeclock kiosks (`?mode=timeclock`), with automatic 6:00 AM Asia/Manila business-day and mode reconciliation.

## Operating Context

- **Dual Operating Modes:** `CAFE` (daytime coffee/pastry counter; 0% service charge on drinks, 10% on kitchen food) and `EVENT` (nighttime jazz lounge; 10% service charge on all dine-in items). Switching requires confirmation and Floor Manager Override PIN (`verify_manager_override_pin`) for non-admin staff, and automatically reverts to `CAFE` at 6:00 AM Asia/Manila.
- **Category-Based Station Routing:** Prep routing depends strictly on product category (`station:bar` for beverages/cocktails/coffee, `station:kitchen` for food), never physical seating zone. Unified FOH pass notifications and delivery tracking live directly inside the Floor Waiter/Cashier `"FOH"` tab.
- **Dedicated Browser Stations:** Headless counter thermal print & RJ11 cash drawer station (`?mode=printer` via WebUSB/WebSerial with Web Locks leader election) and standalone Timeclock Kiosk (`?mode=timeclock` decoupled from POS terminal login).
- **Zero Public Screens:** Overhead TV displays, public queue monitors, and customer-facing buzz screens are strictly forbidden; all KDS interfaces run on authenticated staff tablets.

## Capabilities and Constraints

- **Framework & Styling Mandate:** React Native + Expo (`react-native-web`) with NativeWind v4 (`className`) and Zustand stores (`frontend`). Web DOM tags (`<div>`, `<span>`, `<button>`, `<input>`) are forbidden by ESLint; use React Native primitives exclusively (`View`, `Text`, `Pressable`, `TextInput`, `ScrollView`). Role-based screen switching happens in `App.tsx` (no Expo Router).
- **Zero Regression on Legacy Styles:** Never rewrite, convert, or delete existing `StyleSheet.create` declarations or `*.styles.ts` files. New views must be 100% NativeWind v4; modifications to legacy views must apply NativeWind strictly to newly added elements (Isolated Hybrid).
- **Tablet & Mobile Touch Ergonomics:** Minimum 48px touch targets (`min-h-[48px] min-w-[48px]`), strict 16px minimum font size across inputs and all new/modified text to prevent iOS/WebKit Safari auto-zoom, dynamic `visualViewport` keyboard clearance (`useVirtualKeyboard`, `TouchTextInput` with 1-tap clear), and viewport lock (`user-scalable=no`, `interactive-widget=resizes-content`).
- **Philippine Statutory & Fiscal Compliance:** 12% VAT-inclusive extraction (`Gross / 1.12`), dine-in-only station-aware service charge, 2-step Senior Citizen & PWD 20% VAT-exempt discounts with mandatory OSCA/PWD ID and Cardholder Name, 57mm (default) / 80mm ESC/POS receipts, X/Y/Z fiscal readings, and 6:00 AM Asia/Manila business-day boundaries.
- **Security & Fair Labor Accounting:** `pgcrypto` Blowfish bcrypt secrets (`$2a$10$`), Admin password portal + Floor Manager Override PIN, session inactivity watchdog (6h daytime / 3h late-night) with fair auto-clock-out at last recorded activity, and strict Admin Payroll Exemption (`base_daily_rate = 0.00`).

## Brand Commitments

- **Venue Identity:** Monk's Dream Jazz Bar (`JAZZ BAR AND CAFE`, `+63 917 833 3445`).
- **Brand Assets:** Official lockups in `frontend/assets/monks-dream-logo-lockup.png`, `frontend/assets/monks-dream-logo-lockup-white.png`, `frontend/assets/images/logo-white-bg.jpeg`, and the bitonal `JazzLogo` SVG emblem (`frontend/src/features/shared/components/JazzLogo.tsx`, piano keyboard + trumpet flare).
- **Binding Visual Invariants (from `AGENTS.md` and `.agents/rules/nativewind-tablet-standards.md`):**
  - 3-color minimalist floor and modal system: Monk's Dream Velvet Wine (`#810021`), Warm Sand / White surfaces (`#FAF8F5` / `#FFFFFF`), and Deep Charcoal typography (`#1C1917`), with Muted Stone (`#78716C`) for secondary metadata.
  - Strict ≥ 16px typography floor on all new or modified views (never `text-xs`, `text-sm`, `text-pos-xs`, or `text-pos-sm`).
  - Strict ≥ 48px minimum touch targets on all interactive controls.

## Evidence on Hand

- Real brand lockups and emblem assets under `frontend/assets/` and `frontend/src/features/shared/components/JazzLogo.tsx`.
- Production design tokens and typography imports in `frontend/tailwind.config.js` and `frontend/src/global.css`.
- Production floor, KDS, hardware print, timeclock, and admin views in `frontend/src/features/`.

## Product Principles

1. **Arm's-Length Legibility & Tap Accuracy First:** Every new or updated control meets ≥ 48px touch sizing and ≥ 16px text so staff can operate reliably under dim jazz-bar lighting or fast cafe rushes.
2. **Incremental Craft Without Regressions:** Preserve battle-tested legacy `StyleSheet.create` screens intact while building and extending UI cleanly with NativeWind v4.
3. **One Codebase Across Floor, KDS, Print, and Admin:** Maintain clear visual and operational continuity across tablet browsers, mobile devices, and the Windows Electron shell.
4. **Statutory & Operational Truth by Construction:** Revenue modes (`CAFE`/`EVENT`), VAT/SC/Senior calculations, receipt formatting, and attendance payroll remain auditable and invariant across UI changes.

## Accessibility & Inclusion

- Minimum 16px text and input floor (`font-size: 16px`, `text-base` / `text-pos-base`) with `tabular-nums` (`font-variant-numeric: tabular-nums`) on all timers, counts, and currency amounts.
- Minimum 48px interactive touch targets (`min-h-[48px]`) with `touch-action: manipulation`, virtual keyboard clearance, and 1-tap clear affordances (`TouchTextInput`).
- High-contrast text pairing (`#1C1917` on `#FAF8F5`/`#FFFFFF`; `#FFFFFF` on `#810021`) suited for both sunlit cafe counters and dim evening lounge service.
