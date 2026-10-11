# 🎷 Monk's Dream Jazz Bar — Digital Operations Platform (POS & KDS)

> A local-first, offline-resilient Point of Sale (POS) and Kitchen Display System (KDS) designed for live jazz bar operations with real-time station routing, USB ESC/POS thermal printing, and background Supabase cloud sync.

---

## 🎯 Project Overview & Real-World Context

Monk's Dream Jazz Bar requires a zero-downtime, zero-latency system capable of running seamlessly during live sets and crowded nights, even when local ISP internet fails completely.

### Confirmed Physical Hardware Topology:
- **1 On-Premise PC (Local Server & Cashier Console):** Runs the local PostgreSQL database, NestJS/Fastify engine, and hosts the Admin/Cashier kiosk UI.
- **1 Thermal Receipt Printer (USB):** Connected directly to the PC (`/dev/usb/receipt-printer`). Handles customer bills, payment receipts, reprints, and cash drawer kicks.
- **4–8 Android Tablets (Over Local Wi-Fi):**
  - **Waiters / Cashiers:** Handheld devices for 2D floor plans, taking orders, splitting tabs, and taking payments.
  - **Station Displays (KDS):** Paperless wall/stand screens for **Cafe**, **Bar**, and **Food** stations.
- **Dedicated POS Wi-Fi Router:** Keeps all tablets and the PC on a private 5 GHz LAN (`192.168.50.0/24`), isolated from guest Wi-Fi.

---

## 🏗️ Architectural Core Principles

```
  [ Waiter Handhelds ]            [ Station Tablets (KDS) ]
           \                                /
      (HTTP REST Writes)            (WebSocket Live Pushes)
             \                            /
         ┌─────────────────────────────────────┐
         │     ON-PREMISE LOCAL PC (HUB)       │
         │  Fastify API  •  Postgres  •  Caddy │
         └──────────────────┬──────────────────┘
                            │
               ┌────────────┴────────────┐
               │                         │
     [ USB Receipt Printer ]     [ Supabase Cloud ]
        (Instant 2ms Print)     (Background Sync Outbox)
```

1. **HTTP REST for Mutations (Actions):** All orders, payments, void requests, and status changes use standard HTTP `POST` with `Idempotency-Key` headers. This prevents duplicate charges and ensures clean ACID transactions.
2. **WebSockets (Socket.IO) for Notifications & Chat:** WebSockets are used strictly for downstream event pushes (`ticket.created` for KDS screens, `floor.table_updated` for table color/icon changes) and two-way **Team Chat** between staff.
3. **Local PC as the Primary System of Record:** Every order, inventory deduction, and payment is committed locally to PostgreSQL first. If the internet goes down, service continues with zero interruption.
4. **Cloud Mirroring via Transactional Outbox:** As sales complete, rows are recorded in a `sync_outbox` table and synced up to Supabase using **Hybrid Logical Clocks (HLC)** for conflict-free cloud reporting and owner dashboards.
5. **Unified Role-Based App:** Tablets and the PC run the exact same UI, but logging in as **Cashier / Admin on the PC** unlocks counter hardware controls (Manual Reprint with audit reasons, Pop Cash Drawer).

---

## 📁 Repository Structure (Turborepo Monorepo)

```
Monk's Dream Jazz Bar POS/
├── apps/
│   └── hub-api/             # Local PC server engine (Fastify, Socket.IO, DB hooks)
│
├── packages/
│   ├── shared/              # Domain types, Zod schemas, HLC utility, Corkage rate
│   ├── db/                  # Drizzle ORM schema for local Postgres & Supabase
│   └── printing/            # Low-level ESC/POS USB thermal printer driver
│
├── infra/
│   └── hub/                 # Production deployment (Docker Compose, Ubuntu setup scripts)
│
├── ARCHITECTURE_AND_SETUP_PLAN.md  # Comprehensive technical architecture document
└── README.md                       # This project guide
```

### Detailed Breakdown of Packages & Apps:

| Folder / Package | Responsibility |
| :--- | :--- |
| **`packages/shared`** | **Single source of truth.** Defines all validation schemas with Zod (`CreateOrderSchema`, `RecordPaymentSchema`, `ReprintReceiptSchema`, `KickDrawerSchema`), station enums (`cafe`, `bar`, `food`), and the `HybridLogicalClock` class for monotonic offline time. |
| **`packages/db`** | **Database layer (Drizzle ORM).** Maps PostgreSQL tables: `orders` (with idempotency `command_id`), `order_items`, `station_tickets`, `event_log` (for sequence replay), `print_jobs`, and `sync_outbox`. |
| **`packages/printing`** | **Hardware driver.** Translates receipts into raw binary ESC/POS sequences (cut commands, bolding, 20% corkage breakdown, drawer pulse `ESC p 0 25 250`). Includes `MockPrinter` for testing on dev laptops without physical hardware. |
| **`apps/hub-api`** | **The Local Server.** Fastify backend providing REST write endpoints and Socket.IO broadcast channels. Implements station fan-out logic and corkage calculations. |
| **`infra/hub`** | **PC Host Setup.** Contains `docker-compose.yml` (Postgres 17 + Fastify + Caddy) and `setup-host.sh` for one-command Ubuntu configuration (UFW firewall, mDNS Avahi, udev rules for USB printers). |

---

## 🚀 Quickstart for Local Development

### Prerequisites:
- **Node.js:** v20+ or v22+ LTS
- **pnpm:** Installed globally (`npm i -g pnpm` or via corepack)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build All Packages
```bash
pnpm -r build
```

### 3. Run the Local Hub API in Development
```bash
pnpm --filter @monks/hub-api dev
```
The server will boot on `http://127.0.0.1:3000` (or `PORT=3099`).

### 4. Health Check Smoke Test
```bash
curl http://127.0.0.1:3000/health/live
# Returns: {"status":"ok","time":"..."}
```

---

## 🖥️ Production Machine Setup (On the Restaurant PC)

When provisioning the restaurant's physical PC running Ubuntu Linux:

1. **Clone the repository** onto the PC:
   ```bash
   git clone <repo-url> /opt/monks-pos
   cd /opt/monks-pos
   ```

2. **Run Host Setup Script as Root:**
   ```bash
   sudo ./infra/hub/setup-host.sh
   ```
   *This automatically sets the hostname to `pos-hub`, configures UFW firewall rules (TCP 443, UDP 5353 for mDNS), installs udev rules for the USB printer (`/dev/usb/receipt-printer`), and configures Avahi mDNS advertisement.*

3. **Launch Production Stack via Docker Compose:**
   ```bash
   cd infra/hub
   docker compose up -d
   ```

4. **Kiosk Console Display:**
   The PC's screen automatically runs Google Chrome in Kiosk mode opening `http://localhost:8080`, providing the Cashier/Admin with immediate access to table billing, receipt reprints, and cash drawer management.

---

## 📋 Architectural References

For complete deep-dive documentation on conflict resolution, recovery runbooks, and network security policies, refer to:
- 📖 [ARCHITECTURE_AND_SETUP_PLAN.md](file:///home/ichannnj/Documents/Commisions/Monk's%20Dream%20Jazz%20Bar%20POS/ARCHITECTURE_AND_SETUP_PLAN.md)
- 📄 [Jazz_Bar_Platform_Proposal.pdf](file:///home/ichannnj/Documents/Commisions/Monk's%20Dream%20Jazz%20Bar%20POS/Jazz_Bar_Platform_Proposal.pdf)
