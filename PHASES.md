# 🎷 Monk's Dream Jazz Bar POS — Implementation Roadmap

> **Navigation:** This is the high-level progress tracker. Detailed, step-by-step execution runbooks live in **[phases/](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/)**.

---

## 🗺️ Master Progress Board

- [x] **Phase 01: [Database Model Expansion, Recipe BOM & Seeding](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-1-data-models-and-seeding.md)**
      _Full 18 models/enums in Supabase SQL migrations, database push via Supabase CLI, curated artisan photography seed data, and standardized 4-digit PIN stored procedures._

- [x] **Phase 02: [Real-Time Gateway, Transfers, Depletion & Billing](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-2-realtime-gateway-depletion.md)**
      _Atomic PL/pgSQL order depletion (`dispatch_order_with_depletion`), void restoral (`cancel_order_item_with_restoral`), tab settlement (`settle_tab_and_record_payment`), table transfers, and Supabase Realtime channels._

- [x] **Phase 03: [Station KDS UIs & FOH Buzzout Device (Tablets Only)](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-3-station-kds-tablets.md)**
      _Touch-first screens for Barista KDS (`station_bar`), Kitchen Chef KDS (`station_food`), and FOH Runner Buzzout Device (`foh_runner`) subscribing to Supabase Realtime._

- [x] **Phase 04: [Full-Stack Integration of Floor POS](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-4-pos-integration.md)**
      _Wiring existing 20+ Waiter POS components and Zustand store directly to `@supabase/supabase-js`, rendering visual cards with cover image banners and category fallbacks._

- [x] **Phase 05: [Dedicated Thermal Printing Terminal](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-5-thermal-printing.md)**
      _Local Linux USB PC daemon listening to `print_jobs` table via Supabase Realtime CDC for instant chits, tags, and receipts._

- [x] **Phase 06: [Admin Back-Office, Inventory Hub & Venue Expense Suite](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-6-admin-and-analytics.md)**
      _Operating mode switcher (`Cafe` vs `Event`), recipe BOM builder with Supabase Storage image upload (`menu-images`), inventory hub with restock MAC calculation, staff daily salary suite, and SQL sales analytics._

---

## 🔁 The Phase Execution Loop (Tracer Bullets)

```
┌────────────────────────────────────────────────────────┐
│ 1. Open Active Phase Blueprint (e.g. phases/phase-1-*) │
├────────────────────────────────────────────────────────┤
│ 2. Implement & Run Verification Command Table          │
├────────────────────────────────────────────────────────┤
│ 3. Check Off Completed Step [x] in the Phase Blueprint │
├────────────────────────────────────────────────────────┤
│ 4. Clear/Compact Context Window (/clear) for Next Phase│
└────────────────────────────────────────────────────────┘
```
