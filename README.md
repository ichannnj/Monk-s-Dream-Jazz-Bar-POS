# 🎷 Monk's Dream Jazz Bar — Cloud POS & KDS Platform

> A full-stack, cloud-native Point of Sale (POS) and Kitchen Display System (KDS) engineered for **Monk's Dream Jazz Bar**. Built with **React Native (Expo)**, **NestJS (Fastify)**, **Prisma ORM**, and **Supabase Database Hosting**.

---

## 📖 System Documentation & Specifications

Detailed architectural specifications, station routing rules, data models, and business logic are fully documented in:

👉 **[REQUIREMENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)** — *Comprehensive system architecture, order lifecycle state machines, role matrix, and thermal printing design.*

---

## 🏛️ System Overview & Architecture

Monk's Dream operates as an artisan cafe by day and an intimate jazz bar & live event lounge by night.

```
                              ┌─────────────────────────────────────────┐
                              │           Waiter / Cashier POS          │
                              │  (Table layout: Cafe Zone & Bar Zone)   │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │         NestJS WebSocket Gateway        │
                              │       & Prisma Database Service         │
                              └───────┬─────────────────────────┬───────┘
                                      │                         │
                   Beverage Items     │                         │  Food Items
                   (Coffee, Drinks)   │                         │  (Pasta, Pizza)
                                      ▼                         ▼
                        ┌──────────────────────────┐ ┌──────────────────────────┐
                        │   Barista / Bartender    │ │     Kitchen Station      │
                        │       Station KDS        │ │       Station KDS        │
                        └─────────────┬────────────┘ └─────────────┬────────────┘
                                      │                            │
                                      └─────────────┬──────────────┘
                                                    │ All items marked READY
                                                    ▼
                                       ┌────────────────────────┐
                                       │ FOH Runner / Expediter │
                                       │    (Delivers Table)    │
                                       └────────────────────────┘
                                                    │
                                                    ▼
                                       ┌────────────────────────┐
                                       │ Receipt Print Terminal │
                                       │ (PC + USB Thermal Web) │
                                       └────────────────────────┘
```

### Key Functional Concepts

1. **Category-Based Station Routing (Not Location-Based):**
   - **Drinks & Coffees** $\rightarrow$ Route to **Barista / Bartender Station**.
   - **Food (Pizza, Pasta, etc.)** $\rightarrow$ Route to **Kitchen Station**.
   - *Seating Zones (Cafe Area vs. Bar Area) are strictly for floor layout and table identification, not item routing.*
2. **Admin Operating Mode Toggle:**
   - **☀️ Normal Cafe Mode:** Standard daytime operations and baseline sales tracking.
   - **🎷 Event Mode:** Tagged sales sessions for live jazz nights and private shows for separate revenue accounting.
3. **FOH Expediter:**
   - Consolidated screen that tracks multi-station orders and notifies runners when all items for a table are ready for delivery.
4. **Dedicated Receipt Printer Station (Workaround):**
   - A dedicated PC connected via USB to a thermal printer running the web app to automatically listen and print receipts triggered remotely by cashiers.
5. **Table Tabs by Customer Name (Split & Shared Billing):**
   - Tables support multiple independent customer tabs (e.g., Table 4 $\rightarrow$ `Tab: Alice`, `Tab: Bob`). Allows friends to split bills effortlessly or strangers sharing communal tables/bar counter seats to pay their own tab without closing the table for others.

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

| Role | Username | Display Name | Station / Screen | 4-Digit PIN |
|---|---|---|---|---|
| **Admin** | `admin` | Miles (Manager) | Admin Dashboard & Mode Toggle | `9999` |
| **Cashier** | `cashier1` | Coltrane (Cashier) | Checkout & Billing Screen | `1111` |
| **Waiter** | `waiter1` | Ella (Floor Waiter) | Table Order Taking Screen | `2222` |
| **Bartender** | `bar1` | Thelonious (Bartender) | Bar KDS (Drinks & Cocktails) | `0001` |
| **Barista** | `cafe1` | Bill (Barista) | Cafe KDS (Coffee & Tea) | `0002` |
| **Kitchen Chef** | `kitchen1` | Chet (Chef) | Kitchen KDS (Food & Pizza) | `0003` |
| **FOH Runner** | `runner1` | Sarah (Expediter) | Ready-to-Serve Dispatch Screen | `3333` |
| **Printer PC** | `printer1` | Receipt Terminal | Dedicated USB Web Print Client | `0000` |

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
- [ ] **Data Model Expansion:** Prisma models for Orders, LineItems, Categories, Tables, OperatingSessions (per [REQUIREMENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)).
- [ ] **KDS Real-Time Dispatch:** WebSocket gateway for live order routing between Waiter $\rightarrow$ Bar/Kitchen $\rightarrow$ FOH.
- [ ] **Floor & Table View:** Cafe Area and Bar Area table seating layout.
- [ ] **Admin Mode Toggle:** Cafe Mode vs Event Mode sales tracking.
- [ ] **Web Thermal Printing Client:** Dedicated print station listener for USB thermal receipts.
