# 🎷 Monk's Dream Jazz Bar — Cloud POS, KDS & Inventory Platform

> A full-stack, cloud-native Point of Sale (POS), Kitchen Display System (KDS), and Recipe Inventory Platform engineered for **Monk's Dream Jazz Bar**. Built with **React Native (Expo)**, **NestJS (Fastify)**, **Prisma ORM**, and **Supabase Database Hosting**.

---

## 📖 System Documentation & Specifications

Detailed architectural specifications, multi-channel intake rules, recipe BOM depletion mechanics, data models, and business logic are fully documented in:

👉 **[REQUIREMENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)** — *Comprehensive system architecture, order lifecycle state machines, role matrix, recipe bill of materials, table transfer engine, and thermal printing design.*

---

## 🏛️ System Overview & Architecture

Monk's Dream operates as an artisan cafe by day and an intimate live jazz bar & event lounge by night.

```
       ┌─────────────────────────────────────────────────────────────┐
       │             Multi-Channel Order Intake (POS)                │
       │  [Dine-In Tables]  [Takeout / To-Go]  [GrabFood / Foodpanda]│
       │                   Cashier / Waiter Tablets                  │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                  NestJS WebSocket Gateway                   │
       │           & Order-Driven Inventory Depletion Engine         │
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
                                      │
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

### Key Functional Concepts

1. **Unified Cashier & Waiter Role (Floor Staff):**
   - Floor staff perform both table service (ordering, table moves) and checkout/billing on handheld tablets without needing role-switching or manager overrides.
2. **Category-Based Station Routing (Not Location-Based):**
   - **Drinks, Coffee & Cocktails** $\rightarrow$ Route directly to **Barista / Bartender Tablet KDS**.
   - **Food (Pizza, Pasta, Kitchen Items)** $\rightarrow$ Route directly to **Kitchen Station Tablet KDS**.
   - *Table Grid Filters (Cafe Area vs. Bar Area) are strictly for table navigation and floor organization, never restricting station item routing.*
3. **Multi-Channel Fulfillment (Dine-In, Takeout & Third-Party Delivery):**
   - **Dine-In:** Assigned to physical tables with per-customer named tabs.
   - **Takeout / To-Go:** Virtual queue tabs (`#T-105`) with packaging tags and cup labels.
   - **Online Delivery Intake (GrabFood & Foodpanda):** Cashier inputs third-party delivery orders manually for unified kitchen routing, automated recipe stock decrement, and multi-channel revenue analytics (no direct API integration needed).
4. **Table & Tab Transfers:**
   - Floor staff can transfer **entire tables** or split and move **individual named customer tabs** (e.g. guest moves from Table 4 to Bar Seat 1).
   - Reassignments trigger real-time WebSocket updates (`order:table_transferred`) to Bar, Kitchen, and Runner tablets with visual badges without interrupting cooking/prep timers.
5. **Recipe Bill of Materials (BOM) & Inventory Depletion Engine:**
   - Every product is linked to an exact recipe with precise measurements (`g`, `ml`, `pcs`).
   - Ingredients automatically decrement from inventory upon order creation/acceptance.
   - **Auto-86 Safeguard:** Menu items automatically grey out on POS tablets when key ingredients drop below threshold levels.
   - Full audit trail with immutable stock movement ledgers and a spillage/waste logger.
6. **Operating Mode Toggle & Multi-Lens Sales Analytics:**
   - **☀️ Normal Cafe Mode:** Standard daytime cafe and kitchen operations.
   - **🎷 Event Mode:** Tagged revenue sessions for live jazz nights and ticketed performances.
   - Granular channel breakdowns: `Cafe Area`, `Bar Area`, `Takeout Counter`, `GrabFood`, and `Foodpanda`.
7. **Two-Print Thermal Printing Workflow:**
   - **Order Dispatch Slip (Runner Chit):** Auto-prints at the dedicated USB PC station when staff taps **"Send Order"** (includes order checklist, guest name, and destination table or delivery bag tag) to clip to the tray.
   - **Customer Payment Receipt:** Prints upon billing settlement.
8. **Table Tabs by Customer Name (Split Billing):**
   - Tables support multiple independent customer tabs (e.g., Table 4 $\rightarrow$ `Tab: Alice`, `Tab: Bob`). Allows friends or communal seating guests to settle their own tabs independently.
9. **Staff Attendance & Daily Salary Expense Management:**
   - PIN-based attendance logging for all venue staff (both POS/KDS workflow staff and support staff like cleaners, security, sound tech) with baseline daily rates, discretionary shift add-ons, and net operating cost auditing.

---

## 🛠️ Technology Stack

- **Frontend (`frontend/`)**: React Native (Expo SDK) + NativeWind v4 (Tailwind CSS 3.4) + Zustand State Management.
- **Backend (`backend/`)**: NestJS with Fastify Adapter, WebSocket Gateway (`socket.io` / native ws), and class-validator.
- **ORM & Database**: Prisma ORM connecting to Supabase Cloud PostgreSQL with connection pooling.
- **Shared Libraries (`packages/`)**:
  - `packages/shared`: Shared Zod schemas, TypeScript types, and validation models.
  - `packages/printing`: ESC/POS binary generator and WebUSB thermal printing utilities.

---

## 👥 Staff Profiles & Default PINs

| Role | Username | Display Name | Station / Screen | 4-Digit PIN | Permissions |
|---|---|---|---|---|---|
| **Admin** | `admin` | Miles (Manager) | Admin Hub & Back-Office | `9999` | Full system control, mode toggle, recipe builder, inventory, salaries |
| **Cashier / Waiter** | `cashier_waiter1` | Coltrane (Floor Staff) | Handheld POS Tablet | `1111` | Table grid, takeout queue, Grab/Foodpanda intake, table transfers, billing |
| **Cashier / Waiter** | `cashier_waiter2` | Ella (Floor Staff) | Handheld POS Tablet | `2222` | Table grid, takeout queue, Grab/Foodpanda intake, table transfers, billing |
| **Bartender** | `bar1` | Thelonious (Bartender) | Bar Tablet KDS | `0001` | Cocktail & beverage prep queue |
| **Barista** | `cafe1` | Bill (Barista) | Cafe Tablet KDS | `0002` | Espresso & tea prep queue |
| **Kitchen Chef** | `kitchen1` | Chet (Chef) | Kitchen Tablet KDS | `0003` | Food & culinary prep queue |
| **FOH Runner** | `runner1` | Sarah (Expediter) | Runner Tablet (Buzzout) | `3333` | Ready-to-serve dispatch & pickup handoff |
| **Printer PC** | `printer1` | Receipt Terminal | Dedicated USB Web Print Station | `0000` | Automated runner slip & customer receipt printing |

---

## ⚡ Quickstart

### Prerequisites
- Node.js $\ge$ 20.x
- **pnpm** $\ge$ 12.x (`corepack enable pnpm` or `npm install -g pnpm`)

### 1. Install & Build
```bash
# Install monorepo dependencies
pnpm install

# Build shared packages
pnpm run build
```

### 2. Environment Configuration
Ensure `.env` exists in `backend/` with your Supabase PostgreSQL credentials:
```bash
cp backend/.env.example backend/.env
```

### 3. Run Development Servers
```bash
# Start Backend API (http://localhost:3000)
pnpm --filter @monks/backend run dev

# Start Frontend (Expo Web & Mobile)
pnpm --filter @monks/frontend run web
```

---

## 🗺️ Project Implementation Roadmap

- [x] **Monorepo Foundation:** Turborepo, NestJS (Fastify), Expo, NativeWind, Prisma setup.
- [x] **Authentication:** 4-digit staff PIN authentication system.
- [ ] **Phase 1: Prisma Schema Expansion, Recipe BOM & Seeding:**
  - [ ] Implement `Category`, `Product` (+20% resale markup constraint), `ProductIngredient` (exact BOM measurements), `InventoryItem`, `StockMovement`, and `WasteLog`.
  - [ ] Implement `Table`, `Tab` (supporting `DINE_IN`, `TAKEOUT`, and `ONLINE_DELIVERY`), `Order`, `OrderItem`, and `TableTransferLog`.
  - [ ] Seed sample menu items with exact recipe measurements, initial par levels, and staff roster.
- [ ] **Phase 2: Real-time Station Gateway, Live Transfers & Depletion Engine (NestJS):**
  - [ ] WebSocket gateway for live order routing (`/stations/bar`, `/stations/kitchen`, `/stations/foh`, `/printer`).
  - [ ] Real-time recipe ingredient depletion engine and Auto-86 broadcast safeguard.
  - [ ] Live table/tab transfer event broadcast (`order:table_transferred` / `tab:transferred`).
- [ ] **Phase 3: Station KDS UIs on Tablets (No TVs / Public Views):**
  - [ ] Barista/Bartender KDS screen with channel tags (`DINE-IN`, `TAKEOUT`, `GRAB/FOODPANDA`) and transfer badges.
  - [ ] Kitchen Chef KDS screen with food tickets, allergen alerts, and live table tags.
  - [ ] FOH Expediter screen with multi-station consolidation and ready chime.
- [ ] **Phase 4: Multi-Channel Order Intake, Table Grid & Table Transfer Modal:**
  - [ ] Responsive card grid with Area & Channel filters (`All`, `Cafe Area`, `Bar Area`, `Takeout Queue`, `Online Delivery`).
  - [ ] Table & Tab Transfer modal (full table moves, tab splits, reason logging).
  - [ ] Fast entry modal for third-party online delivery (GrabFood & Foodpanda).
  - [ ] One-tap counter takeout order flow with to-go packaging flags.
- [ ] **Phase 5: Thermal Printing Web Client (Multi-Document Flow):**
  - [ ] Automatic Order Dispatch Slip printing listener (`dispatch:print`).
  - [ ] Takeout cup slip and Grab/Foodpanda sealed delivery bag tag formatting.
  - [ ] Customer payment receipt printing listener (`receipt:print`).
- [ ] **Phase 6: Admin Back-Office, Inventory Hub & Multi-Channel Sales Auditing:**
  - [ ] Multi-mode & multi-channel sales analytics (Cafe vs. Bar vs. Takeout vs. GrabFood vs. Foodpanda across Cafe & Event modes).
  - [ ] Menu Management: interactive Recipe BOM Builder with real-time portion COGS calculation.
  - [ ] Inventory Hub: stock level overview, PO delivery intake, waste logger, and immutable audit ledger.
  - [ ] Staff attendance tracking and daily salary expense auditing.
