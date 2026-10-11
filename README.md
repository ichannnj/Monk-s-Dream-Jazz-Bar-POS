# 🎷 Monk's Dream Jazz Bar — Digital Operations Platform (POS & KDS)

> A local-first, offline-resilient Point of Sale (POS) and Kitchen Display System (KDS) designed for live jazz bar operations with real-time station routing, USB ESC/POS thermal printing, and background Supabase cloud sync.

---

## 🛠️ Confirmed Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | **React Native + NativeWind (Tailwind CSS)** | Built with Expo (`apps/pos-mobile`). Unified app for Android tablets, iOS, and Web Kiosk. |
| **Backend** | **NestJS (Fastify engine)** | High-throughput local hub server (`apps/hub-api`). |
| **Database & ORM** | **PostgreSQL + Drizzle ORM** | Resilient local storage with Drizzle schemas (`packages/db`) + in-memory fallback. |
| **Operations Realtime**| **Server-Sent Events (SSE)** | Lightweight stream (`/api/v1/operations/stream`) for taking orders, KDS tickets, floor updates & 86 items. |
| **Messaging & Chat** | **WebSockets (Socket.IO)** | Dedicated two-way staff chat channels (`#all`, `#bar`, `#kitchen`, `#cafe`, `#admin`) and urgent alerts. |
| **Validation & Types**| **Zod + TypeScript** | Shared schemas and domain models across monorepo (`packages/shared`). |
| **Hardware Driver** | **ESC/POS Binary Engine** | Direct Linux USB driver (`packages/printing`) for 80mm thermal receipts and cash drawer kicks. |

---

## 🎯 Real-World Context & Hardware Topology

Monk's Dream Jazz Bar requires zero-downtime and sub-5ms latency during crowded live music sets, even if the venue's internet fails completely.

```
                  [ Waiter / Cashier Tablets ]        [ Barista / Kitchen / Bartender KDS ]
                              \                                      /
                        (HTTP REST Writes)                  (SSE Realtime Stream)
                               \                                    /
                     ┌─────────────────────────────────────────────────────┐
                     │              ON-PREMISE LOCAL PC (HUB)              │
                     │    NestJS (Fastify)  •  PostgreSQL  •  Drizzle     │
                     └───────────────┬─────────────────┬───────────────────┘
                                     │                 │
                           (WebSocket Messaging)       │ (Background Outbox)
                                     │                 │
                         [ Two-Way Staff Chat ]   [ Supabase Cloud Mirror ]
```

### Physical Hardware:
1. **1 On-Premise PC (Server + Cashier Counter Console):** Runs PostgreSQL, NestJS, and Chrome Kiosk on `http://localhost:8080`.
2. **1 USB Thermal Receipt Printer:** Connected directly to PC (`/dev/usb/receipt-printer`). Handles guest checks, payment slips, and pops the RJ-11 cash drawer.
3. **4–8 Handheld Android Tablets (Local 5GHz Wi-Fi):**
   - **Waiter / Cashier:** Floor map, ordering, 20% flat corkage calculation, tab splitting, bill checkout.
   - **Station Displays (KDS):** Paperless queues for Barista, Kitchen, and Bartender.
4. **Dedicated Router (`192.168.50.0/24`):** Isolates POS traffic from venue guest Wi-Fi.

---

## 👥 User Roles & File Structure

Every staff member is a distinct user with individual PIN sign-in (`src/auth/`):

```
apps/pos-mobile/src/
│
├── auth/                               # Staff Login & PIN Authentication
│   ├── components/
│   │   └── PinPadModal.tsx             # 4-digit keypad modal
│   ├── screens/
│   │   └── LoginScreen.tsx             # Staff user selection & PIN sign-in
│   └── index.ts
│
├── users/                              # All User Roles
│   │
│   ├── waiter-cashier/                 # Merged Waiter / Cashier User
│   │   ├── components/
│   │   │   ├── FloorPlanView.tsx       # 2D table layout & status
│   │   │   ├── MenuCatalogue.tsx       # Cocktails, food, coffee & 20% corkage
│   │   │   └── ActiveTabCart.tsx       # Tab cart, bill splitting & pay
│   │   ├── screens/
│   │   │   └── WaiterCashierScreen.tsx # Floor POS ordering view
│   │   └── index.ts
│   │
│   ├── admin/                          # Admin / Manager User
│   │   ├── components/
│   │   │   ├── ItemAvailabilityManager.tsx # Instant 86 item manager
│   │   │   └── HardwareTerminalControls.tsx# Printer & cash drawer test
│   │   ├── screens/
│   │   │   └── AdminDashboardScreen.tsx # Shift KPIs & device status
│   │   └── index.ts
│   │
│   ├── barista/                        # Barista User (Coffee Station)
│   │   ├── components/
│   │   │   └── BaristaTicketCard.tsx   # Coffee tickets & prep timers
│   │   ├── screens/
│   │   │   └── BaristaKdsScreen.tsx    # Espresso & brew queue
│   │   └── index.ts
│   │
│   ├── kitchen/                        # Kitchen User (Food Station)
│   │   ├── components/
│   │   │   └── KitchenTicketCard.tsx   # Food tickets & grill timers
│   │   ├── screens/
│   │   │   └── KitchenKdsScreen.tsx    # Kitchen pass queue
│   │   └── index.ts
│   │
│   ├── bartender/                      # Bartender User (Liquor Station)
│   │   ├── components/
│   │   │   └── BartenderTicketCard.tsx # Cocktails, neat pours & corkage prep
│   │   ├── screens/
│   │   │   └── BartenderKdsScreen.tsx  # Bar drink queue
│   │   └── index.ts
│   │
│   └── index.ts                        # Unified export of all user screens
│
├── services/                           # Client Network Layer
│   ├── operationsStream.ts             # Server-Sent Events (SSE) for orders & KDS
│   ├── messagingSocket.ts              # WebSockets (Socket.IO) for staff chat
│   ├── api.ts                          # Typed REST client for mutations
│   └── index.ts
│
├── components/                         # Shared Cross-Role UI
│   ├── Header.tsx                      # Top bar with "Switch User" & LAN sync badge
│   └── TeamChatScreen.tsx              # Staff channels & urgent 86 broadcasts
│
├── store/                              # State Management (Zustand)
│   ├── useAuthStore.ts                 # Logged-in user, active view, logout
│   └── useCartStore.ts                 # Live tab cart & 20% flat corkage fee
│
└── mockData.ts                         # Seed staff with PINs, menu & tickets
```

### Seed Staff PINs:
- **Manager Miles (Admin):** `9999`
- **Server Chet (Waiter / Cashier):** `1111`
- **Server Nina (Waiter / Cashier):** `2222`
- **Barista Sam (Barista):** `0002`
- **Chef Leo (Kitchen):** `0003`
- **Bartender Max (Bartender):** `0001`

---

## 📡 Realtime Protocol Separation

1. **Server-Sent Events (SSE)** on `GET /api/v1/operations/stream`:
   - Operations: `order.created`, `ticket.created`, `ticket.status_updated`, `floor.table_updated`, `menu.item_availability` (86 items), `tab.paid`.
   - Supports station filtering: `?station=barista`, `?station=kitchen`, `?station=bartender`.
2. **WebSocket (Socket.IO)** on `ws://host:3000`:
   - Staff Messaging & Team Chat: Channels `#all`, `#bar`, `#kitchen`, `#cafe`, `#admin`.
   - Emergency 86 broadcasts.
3. **HTTP REST Mutations**:
   - `POST /api/v1/orders` (with `Idempotency-Key` header)
   - `PATCH /api/v1/tickets/:id/status`
   - `PATCH /api/v1/menu/:id/availability`
   - `POST /api/v1/payments`
   - `POST /api/v1/hardware/kick-drawer`

---

## 🚀 Development Quickstart

### Prerequisites
- **Node.js:** v20+ or v22+ LTS
- **pnpm:** v10+

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build Monorepo Packages
```bash
pnpm -r build
```

### 3. Start the Backend Server (`apps/hub-api`)
```bash
pnpm --filter @monks/hub-api dev
```
*Listens on `http://localhost:3000` (Fastify + NestJS + Drizzle).*

### 4. Start the Frontend App (`apps/pos-mobile`)
```bash
# Web / Browser mode
pnpm --filter pos-mobile run web

# Or target Android device / tablet
pnpm --filter pos-mobile run android
```
*Frontend opens at `http://localhost:8081`.*

---

## 📋 Documentation References
- 📖 [ARCHITECTURE_AND_SETUP_PLAN.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/ARCHITECTURE_AND_SETUP_PLAN.md) — Comprehensive technical architecture, HLC clock sync & USB hardware setup.
- 📄 [Jazz_Bar_Platform_Proposal.pdf](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/Jazz_Bar_Platform_Proposal.pdf) — Client specifications and business requirements.
