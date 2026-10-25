# 🎷 Monk's Dream Jazz Bar — Cloud POS, KDS & Inventory Platform

> A full-stack, cloud-native Point of Sale (POS), Kitchen Display System (KDS), and Recipe Inventory Platform engineered for **Monk's Dream Jazz Bar**. Built with **React Native (Expo SDK 52+)**, **Supabase BaaS (PostgreSQL, Realtime WebSockets, Storage & PL/pgSQL Stored Procedures)**, **Turborepo**, and **NativeWind v4**.

---

## 📖 System Documentation & Specifications

Detailed architectural specifications, multi-channel intake rules, recipe BOM depletion mechanics, data models, and business logic are fully documented in:

- 👉 **[CONTEXT.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTEXT.md)** — _Authoritative venue operating modes, domain invariants, 4-digit PIN matrix, and system topology._
- 👉 **[PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md)** — _Step-by-step master progress board and phase execution runbooks._
- 👉 **[AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)** — _Task-to-File Fast Router, token-efficient slicing rules, and agent operating guidelines._
- 👉 **[CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)** — _Developer setup, Supabase CLI workflows, and testing commands._
- 👉 **[REQUIREMENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)** — _Original comprehensive venue requirements and thermal printing specifications._

---

## 🏛️ System Overview & Supabase BaaS Architecture

Monk's Dream operates as an artisan cafe by day and an intimate live jazz bar & event lounge by night. The platform employs a modern **Supabase Backend-as-a-Service (BaaS)** architecture that replaces heavy custom middle-tier servers with direct client-to-database real-time synchronization, atomic database stored procedures, and row-level security.

```
       ┌─────────────────────────────────────────────────────────────┐
       │             Multi-Channel Order Intake (POS)                │
       │  [Dine-In Tables]  [Takeout / To-Go]  [GrabFood / Foodpanda]│
       │                   Cashier / Waiter Tablets                  │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                  Supabase Cloud BaaS                        │
       │  • PostgreSQL 15+ with Declarative SQL Migrations           │
       │  • Realtime Engine (Change Data Capture & WebSockets)       │
       │  • Atomic PL/pgSQL Functions (BOM Depletion, Restoral, Auth)│
       │  • Storage Bucket: 'menu-images' (Artisan Photography CDN)  │
       └───────┬─────────────────────────────────────────────┬───────┘
               │                                             │
Beverage Items │                                             │ Food Items
(Coffee, Tea,  │                                             │ (Pasta, Pizza,
Bar Cocktails) │                                             │ Kitchen Bites)
               ▼                                             ▼
 ┌───────────────────────────┐                 ┌───────────────────────────┐
 │    Barista / Bartender    │                 │      Kitchen Station      │
 │    Station Tablet KDS     │                 │    Station Tablet KDS     │
 │  (NO TVs / Public Views)  │                 │  (NO TVs / Public Views)  │
 └─────────────┬─────────────┘                 └─────────────┬─────────────┘
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      │ All items marked READY
                                      ▼
                        ┌───────────────────────────┐
                        │  FOH Runner / Expediter   │
                        │   Tablet (Buzzout View)   │
                        │(Table / Takeout / Delivery)│
                        └─────────────┬─────────────┘
                                      │ Auto-print dispatch event
                                      ▼
                        ┌───────────────────────────┐
                        │  Receipt & Dispatch Print │
                        │  Terminal (PC + USB Web)  │
                        └───────────────────────────┘
```

> [!IMPORTANT]
> **KDS Hardware Architecture (Zero Public Screens):**  
> Monk's Dream is an atmospheric jazz bar and artisan cafe. Overhead TV displays, public queue boards, or customer-facing screens are **strictly forbidden**. The KDS operates entirely on authenticated staff touchscreen tablets mounted at workstations (`station_bar`, `station_food`) or carried handheld (`foh_runner`).

---

### Key Architectural Concepts

1. **Supabase BaaS Realtime Infrastructure:**
   - Real-time station dispatch and table updates stream directly to staff tablets via Supabase Realtime Channels (`order:created`, `order:table_transferred`, `item:status_changed`).
   - Zero-middleware direct tablet-to-BaaS design minimizes latency, removes server maintenance overhead, and ensures offline-resilient local optimistic updates via Zustand.
2. **Atomic PL/pgSQL Invariants & Depletion Engine:**
   - Depletion logic executes inside PostgreSQL transactions (`dispatch_order_with_depletion`) ensuring ACID compliance under concurrent tablet requests.
   - Ingredients automatically decrement according to exact Recipe Bill of Materials (BOM) upon order dispatch.
   - Item cancellations automatically trigger restoral procedures (`cancel_order_item_with_restoral`).
   - Staff credentials authenticate via security definer stored procedure (`authenticate_staff_credentials`).
3. **Unified Cashier & Waiter Role (Floor Staff):**
   - Floor staff perform both table service (ordering, table moves) and checkout/billing on handheld tablets without needing role-switching or manager overrides.
4. **Category-Based Station Routing (Not Location-Based):**
   - **Drinks, Coffee & Cocktails** $\rightarrow$ Route directly to **Barista / Bartender Tablet KDS**.
   - **Food (Pizza, Pasta, Kitchen Items)** $\rightarrow$ Route directly to **Kitchen Station Tablet KDS**.
   - _Table Grid Filters (Cafe Area vs. Bar Area) are strictly for table navigation and floor organization, never restricting station item routing._
5. **Multi-Channel Fulfillment (Dine-In, Takeout & Third-Party Delivery):**
   - **Dine-In:** Assigned to physical tables with per-customer named tabs.
   - **Takeout / To-Go:** Virtual queue tabs (`#T-105`) with packaging tags and cup labels.
   - **Online Delivery Intake (GrabFood & Foodpanda):** Cashier inputs third-party delivery orders manually for unified kitchen routing, automated recipe stock decrement, and multi-channel revenue analytics (no direct third-party API integration needed).
6. **Table & Tab Transfers:**
   - Floor staff can transfer **entire tables** or split and move **individual named customer tabs** (e.g., guest moves from Table 4 to Bar Seat 1).
   - Reassignments trigger real-time updates to Bar, Kitchen, and Runner tablets with visual badges without interrupting cooking/prep timers.
7. **Two-Print Thermal Printing Workflow:**
   - **Order Dispatch Slip (Runner Chit):** Auto-prints at the dedicated USB PC station when staff taps **"Send Order"** (includes order checklist, guest name, and destination table or delivery bag tag) to clip to the tray.
   - **Customer Payment Receipt:** Prints upon billing settlement.
8. **Staff Attendance & Daily Salary Expense Management:**
   - PIN-based attendance logging for all venue staff (both POS/KDS workflow staff and support staff like cleaners, security, sound tech) with baseline daily rates, discretionary shift add-ons, and net operating cost auditing.

---

## 🛠️ Technology Stack

- **Frontend (`frontend/`)**: React Native (Expo SDK 52+) + NativeWind v4 (Tailwind CSS 3.4) + Zustand State Management + Expo Image.
- **Backend as a Service (`supabase/`)**: Supabase BaaS (PostgreSQL 15+, Supabase Realtime WebSockets, Storage CDN, and PL/pgSQL Stored Procedures).
- **Feature-First Domain Modules (`frontend/src/features/`)**:
  - `features/auth` — 4-digit PIN authentication, role switching, and session management.
  - `features/floor` — Floor grid layout (25 physical tables: Cafe 1–15 & Bar 1–10), occupation state, and channel filters.
  - `features/table-service` — Customer named tabs, multi-tab splitting, and provenance table transfers.
  - `features/orders` — Sub-order rounds, order dispatch, and atomic in-database BOM recipe depletion.
  - `features/checkout` — Multi-payment settlement (cash/card/wallet/platform) and bill calculations.
  - `features/check-history` — Audited shift checks, settlement history, and receipt reprint queue.
  - `features/takeout` — Virtual to-go queue tabs (`#T-105`), prep status, and handoff tracking.
  - `features/delivery` — Manual intake for GrabFood and Foodpanda with external reference mapping.
  - `features/cash-drawer` — Live float metrics, cash-in/out logging, safe drops, and Z-report audits.
  - `features/menu` — Live product catalog, category filters, Auto-86 stockout indicators, and CDN image updates.
  - `features/kds` — Station KDS screens for Barista, Bartender, Kitchen Chef, and FOH Expediter.
  - `features/shared` — Centralized Realtime gateway, Supabase client, global alerts, and toast system.
- **Shared Libraries (`packages/`)**:
  - `packages/shared`: Shared TypeScript types, generated Supabase DB types (`database.types.ts`), and Zod schemas.
  - `packages/printing`: ESC/POS binary generator and WebUSB thermal printing utilities.

---

## 👥 Staff Profiles & Default 4-Digit PINs

Access control is strictly PIN-based across all shared floor and counter tablets. All PINs are **4 digits**:

| Role             | Username           | Display Name           | Station / Screen                       | 4-Digit PIN | Permissions                                                                |
| ---------------- | ------------------ | ---------------------- | -------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| **Admin**        | `miles_manager`    | Miles (Manager)        | Admin Hub & Back-Office                | `9999`      | Full system control, mode toggle, recipe builder, inventory, salaries      |
| **Cashier**      | `coltrane_cashier` | Coltrane (Cashier)     | Handheld POS Tablet                    | `1111`      | Table grid, takeout queue, Grab/Foodpanda intake, table transfers, billing |
| **Floor Waiter** | `ella_waiter`      | Ella (Floor Waiter)    | Handheld POS Tablet                    | `2222`      | Table ordering, customer named tabs, table moves & transfers, checkout     |
| **Bartender**    | `monk_bar`         | Thelonious (Bartender) | Bar Tablet KDS (`station:bar`)         | `3333`      | Cocktails, liquor, beer, wine prep queue                                   |
| **Barista**      | `bill_cafe`        | Bill (Barista)         | Cafe Tablet KDS (`station:bar`)        | `4444`      | Artisan espresso, pour-overs, teas, and cold drinks prep queue             |
| **Kitchen Chef** | `chet_kitchen`     | Chet (Head Chef)       | Kitchen Tablet KDS (`station:kitchen`) | `5555`      | Food, pasta, pizza, appetizers, and dessert prep queue                     |
| **FOH Runner**   | `max_runner`       | Max (FOH Runner)       | Runner Tablet (`station:foh_runner`)   | `6666`      | Ready-to-serve dispatch & pickup packaging (Buzzout tablet)                |
| **Dishwasher**   | `rosa_dish`        | Rosa (Dishwasher)      | Attendance Only                        | `7777`      | Shift check-in & attendance recording                                      |
| **Sound Tech**   | `marcus_sound`     | Marcus (Sound Tech)    | Back-Office / Sound Booth              | `8888`      | Audio/visual and acoustic shift check-in                                   |

---

## ⚡ Quickstart

### Prerequisites

- Node.js $\ge$ 20.x
- **pnpm** $\ge$ 12.x (`corepack enable pnpm` or `npm install -g pnpm`)
- **Docker** _(optional, only if running local Supabase CLI containers)_

### 1. Install & Build Monorepo

```bash
# Install all monorepo dependencies
pnpm install

# Build shared packages (@monks/shared, @monks/printing)
pnpm run build
```

### 2. Environment Configuration

Ensure `frontend/.env` contains your Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Supabase Database Operations

```bash
# Push declarative migrations to Supabase Cloud
pnpm supabase:push

# Reset & re-seed local or linked Supabase database
pnpm supabase:reset

# Regenerate TypeScript types from Supabase schema
pnpm supabase:types
```

### 4. Run Development Server

```bash
# Start Frontend (Expo Web & Tablet POS)
pnpm --filter @monks/frontend run web
```

---

## 🗺️ Project Implementation Roadmap

- [x] **Monorepo Foundation:** Turborepo, Expo SDK 52+, NativeWind v4, Zustand store, and `@monks/shared` packages.
- [x] **Phase 01: [Database Models, BOM & Seeding](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-1-data-models-and-seeding.md)**
  - [x] 18 models and enums in Supabase SQL migrations (`supabase/migrations/`).
  - [x] Curated artisan food & cocktail photography seed data (`supabase/seed.sql`).
  - [x] Secure staff credential authentication stored procedure (`authenticate_staff_credentials`).
  - [x] Menu item image updating stored procedure & `menu-images` storage bucket policies.
- [x] **Phase 02: [Real-Time Gateway, Transfers, Depletion & Billing](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-2-realtime-gateway-depletion.md)**
  - [x] Atomic PL/pgSQL order depletion (`dispatch_order_with_depletion`) and Auto-86 safeguard.
  - [x] Void restoral (`cancel_order_item_with_restoral`).
  - [x] Tab settlement (`settle_tab_and_record_payment`).
  - [x] Live table/tab transfer event broadcast via Supabase Realtime Channels.
- [x] **Phase 03: [Station KDS UIs & FOH Buzzout Device (Tablets Only)](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-3-station-kds-tablets.md)**
  - [x] Barista/Bartender KDS screen with channel tags (`DINE-IN`, `TAKEOUT`, `GRAB/FOODPANDA`).
  - [x] Kitchen Chef KDS screen with food tickets, allergen alerts, and live table tags.
  - [x] FOH Expediter screen with multi-station consolidation and ready chime.
- [x] **Phase 04: [Full-Stack Integration of Floor POS](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-4-pos-integration.md)**
  - [x] Modularized feature architecture under `frontend/src/features/` (`floor`, `orders`, `table-service`, `checkout`, `kds`).
  - [x] Direct Supabase table & tab hydration with live database synchronization.
- [ ] **Phase 05: [Dedicated Thermal Printing Terminal](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-5-thermal-printing.md)**
  - [ ] Local Linux USB PC daemon listening to `print_jobs` table via Supabase Realtime CDC.
  - [ ] Runner slips, takeout cup labels, and customer payment receipts.
- [ ] **Phase 06: [Admin Back-Office, Inventory Hub & Venue Expense Suite](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/phases/phase-6-admin-and-analytics.md)**
  - [ ] Operating mode switcher (`Cafe` vs `Event`).
  - [ ] Recipe BOM builder with Supabase Storage image upload (`menu-images`).
  - [ ] Inventory hub with restock MAC calculation, staff daily salary suite, and multi-channel revenue analytics.
