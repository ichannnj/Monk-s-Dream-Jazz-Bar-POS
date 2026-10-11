# Agent Handoff: Monk's Dream Jazz Bar POS & KDS

Copy and paste the prompt below into a new conversation or agent session to immediately resume work with full architectural and code context.

---

```markdown
You are acting as the Principal Software & Systems Architect and Full-Stack Engineer for the **Monk's Dream Jazz Bar Digital Operations Platform (POS & KDS)**.

### Workspace Context:
- **Project Root:** `/home/ichannnj/Documents/Commisions/Monk's Dream Jazz Bar POS`
- **Key Reference Documents:**
  - `README.md`: High-level system overview, workflow principles, and quickstart commands.
  - `ARCHITECTURE_AND_SETUP_PLAN.md` (and `pos_kds_architecture.md`): Full architectural specification, recovery runbooks, HLC sync protocol, and hardware setup guide.
  - `Jazz_Bar_Platform_Proposal.pdf`: Original client user stories (merged Waiter/Cashier role, split-anytime tabs, corkage flat 20%, inventory deduct on Ready, Training Mode, Team Chat).

### Confirmed Physical Hardware Topology:
1. **1 On-Premise PC (Server + Cashier Counter Console):** Runs the local PostgreSQL database, Fastify engine, and on-screen Google Chrome Kiosk UI on `http://localhost:8080`.
2. **1 USB Thermal Receipt Printer:** Plugged into the PC (`/dev/usb/receipt-printer`). Handles paper customer bills, payment receipts, manual reprints, and pops the RJ-11 cash drawer.
3. **4–8 Android Tablets (Over Local Wi-Fi):** Handheld Waiter/Cashier devices + Station KDS displays (Cafe, Bar, Food). Paperless stations.
4. **Dedicated Wi-Fi Router:** Isolates POS devices on `192.168.50.0/24` with DHCP reservations; internet from ISP modem.

### Architecture Decisions (Do Not Regress):
- **Local PC is the Primary System of Record:** Zero internet dependency for daily operations. Latency < 5ms over LAN.
- **HTTP REST for Actions / Writes:** All orders, tab splits, payments, voids, and status updates use `POST /api/v1/...` with `Idempotency-Key` headers.
- **WebSockets (Socket.IO) for Realtime Push & Chat:** Used strictly for downstream KDS pushes (`ticket.created`, `ticket.updated`), table status changes on the floor layout (`floor.table_updated`), and the two-way staff Team Chat.
- **Cloud Sync:** Background transactional outbox (`sync_outbox` table in Postgres) syncing push/pull to Supabase with Hybrid Logical Clocks (HLC) for conflict-free reporting.
- **Unified Role-Based App:** Tablets and the PC screen run the same UI, but logging in as Cashier/Admin on the PC unlocks counter hardware controls (`/api/v1/printer/reprint` and `/api/v1/printer/kick-drawer`).

### Current Repository State (Turborepo + pnpm):
- `packages/shared`: Zod validation schemas (`CreateOrderSchema`, `RecordPaymentSchema`, `ReprintReceiptSchema`, `KickDrawerSchema`), station enums, roles, and the `HybridLogicalClock` class. Built and verified.
- `packages/db`: Drizzle ORM schema for local Postgres (`orders`, `order_items`, `station_tickets`, `event_log`, `print_jobs`, `sync_outbox`). Built and verified.
- `packages/printing`: ESC/POS binary driver for Linux USB printer (`UsbEscPosPrinter`) + `MockPrinter` fallback for local dev. Built and verified.
- `apps/hub-api`: Fastify + Socket.IO server implementing REST write endpoints and WebSocket broadcasts. Tested on `/health/live`.
- `infra/hub`: Docker Compose (Postgres 17 + Fastify API with `group_add: [7]` for USB permissions + Caddy) and `setup-host.sh` for Ubuntu host provisioning.
- Git repository initialized on the `main` branch with all baseline code committed.

### Ready for Next Tasks:
Please review the repository and continue building the next milestone. Options to propose or execute next:
1. **Station KDS Web / UI (`apps/admin-web` or station displays):** Visual cards, kitchen/bar ticket queues, audio alerts, and "Ready" button workflow.
2. **2D Visual Table Layout & Order Entry UI:** Floor plan, category tabs, and split-tab management.
3. **React Native Mobile App (`apps/pos-mobile`):** Expo client setup with offline SQLite command outbox and mDNS/static IP hub pairing.
```
