# 🎷 CONTEXT.md — Monk's Dream Jazz Bar System & Business Context

> **Audience:** Developers, Architects, AI Agents, and Product Stakeholders  
> **Purpose:** Authoritative reference for domain invariants, business models, hardware topology, and system architecture.

---

## 🏛️ Venue Concept & Operating Modes

**Monk's Dream Jazz Bar** operates as a dual-concept hospitality venue:

1. **☀️ Normal Cafe Mode (Daytime):**
   - High-throughput artisan espresso bar, pour-overs, pastries, and brunch.
   - Fast counter ordering, quick table turns, and takeout/delivery flow.
2. **🎷 Event Mode (Nighttime Live Jazz Lounge):**
   - Intimate seated cocktail lounge, craft spirits, wine, kitchen dining, and live musical performances.
   - Tagged event revenue sessions, table-side waiter service, tab transfers, and corkage management.

---

## 🔑 Crucial Domain Rules & Invariants

### 1. Staff Roles & 4-Digit PIN Matrix

Access control is PIN-based across all shared floor and counter tablets. PINs are strictly **4 digits**:

| Role                | 4-Digit PIN | Primary Responsibilities                                                    |
| ------------------- | ----------- | --------------------------------------------------------------------------- |
| **Admin / Manager** | `9999`      | Full access: recipe builder, stock audit, shift payroll, system settings    |
| **Cashier**         | `1111`      | Register, takeout queue, third-party delivery intake, bill settlement       |
| **Floor Waiter**    | `2222`      | Floor table ordering, customer named tabs, table moves & transfers          |
| **Bartender**       | `3333`      | Bar KDS tablet (`station_bar`): cocktails, liquor, wine prep                |
| **Barista**         | `4444`      | Bar KDS tablet (`station_bar`): coffee, espresso, teas, daytime drinks      |
| **Kitchen Chef**    | `5555`      | Kitchen KDS tablet (`station_kitchen`): hot food, pasta, pizza, prep        |
| **FOH Runner**      | `6666`      | Expediter Buzzout tablet (`foh_runner`): tray dispatch & delivery packaging |

> **Unified Floor & Counter Intake Role:** Floor staff perform both table ordering and checkout/billing on handheld tablets without needing role-switching or manager overrides. Counter staff (Baristas/Bartenders on `station_bar`) also have access to the full shared Floor POS (`FloorWorkspaceView`), Checks History, and Cash Drawer directly from their KDS tablet for customers ordering walk-up at the bar.

### 2. Category-Based Station Routing (Not Location-Based)

Item preparation destination is determined solely by product category, **never** by physical seating area:

- **Beverages & Bar:** Coffee, tea, soft drinks, cocktails, beer, wine $\rightarrow$ routes to **Bar Tablet KDS** (`station:bar`).
- **Food & Kitchen:** Pasta, pizza, appetizers, desserts $\rightarrow$ routes to **Kitchen Tablet KDS** (`station:kitchen`).
- **Station Auto-Start Invariant:** When an order is entered and dispatched directly from the Bar KDS (`station:bar`), the barista's own drink items automatically start in `preparing` status on the Bar KDS board, while food items route to Kitchen KDS in `new` (`pending`) status.
- _Note:_ Table Grid Filters (e.g., "Cafe Area" vs. "Bar Area") organize physical floor tables and never alter kitchen/bar station routing.

### 3. KDS Hardware Constraint (Strict Architectural Rule)

- **Zero Public Screens:** Overhead TV displays, public queue monitors, and customer-facing buzz screens are **strictly forbidden**.
- **Tablet Workstations:** All KDS interfaces run on authenticated staff tablets mounted at counters (`station:bar`, `station:kitchen`) or handheld (`foh_runner`).

### 4. Financial & Pricing Calculations

- **Resold Outside Food Rule:**  
  $$\text{Base Price} = \text{Original Cost} \times 1.20 \quad (\text{fixed locked } +20\% \text{ margin})$$
- **Corkage Fee Rule:**  
  Fixed 20% surcharge toggle applied to customer tabs when outside wine/liquor is consumed.
- **Split Billing by Customer Name:**  
  Tables support multiple independent customer tabs (e.g., Table 4 $\rightarrow$ `Tab: Alice`, `Tab: Bob`). Guests can transfer or settle their own tabs independently.

### 5. Inventory Depletion & Recipe BOM Engine

- **Trigger Point:** Depletion occurs at **Order Dispatch** (when staff taps "Send Order").
- **Cancellation Restoral:** If an order item is cancelled before preparation starts, depleted stock is automatically restored to the active inventory ledger.
- **Auto-86 Safeguard:** POS menu items automatically grey out when required raw ingredient stocks breach critical minimum thresholds.
- **Recipe BOM Units:** Precise measurements (`g`, `ml`, `pcs`) defined per menu item in `recipe_items`.

### 6. Two-Print Thermal Printing Workflow

Printing is handled via a dedicated Linux PC running ESC/POS USB drivers:

1. **Order Dispatch Slip (Runner Chit):** Auto-prints upon tapping "Send Order" (checklist, customer name, destination table/tag) to clip to the serving tray.
2. **Customer Payment Receipt:** Prints upon payment settlement (itemized breakdown, taxes, payment method).

---

### 7. Feature-First Modular Architecture (250–350 LOC Invariant)

To ensure token efficiency and prevent maintenance degradation:

- **Feature-First Organization:** Capabilities are organized under `frontend/src/features/<capability>/` with explicit folder responsibilities (`presentation/`, `application/`, `domain/`, `data/`).
- **Feature-Owned Application Stores:** State stores and API clients are directly owned and exported by their respective feature modules (e.g., `frontend/src/features/orders/application/useOrderStore.ts`), eliminating redundant facade layers.
- **250–350 LOC Standard:** Maintain a target ceiling of 250–350 physical lines per file, separating views, state, and domain logic cleanly.

---

## 🗺️ System Topology

```
                  ┌──────────────────────────────────────────────────┐
                  │       Multi-Channel POS Intake (Tablets)         │
                  │  [Dine-In Tables]  [Takeout]  [Grab/Foodpanda]   │
                  └─────────────────────────┬────────────────────────┘
                                            │
                                            ▼
                  ┌──────────────────────────────────────────────────┐
                  │            Supabase BaaS / Postgres              │
                  │   Realtime WebSockets, Row-Level Security, Auth  │
                  └─────────────┬──────────────────────┬─────────────┘
                                │                      │
                 Beverages / Bar│                      │Food / Kitchen
                                ▼                      ▼
                    ┌──────────────────────┐┌──────────────────────┐
                    │  Barista / Bartender ││ Kitchen Chef Station │
                    │   Station KDS (Tab)  ││   Station KDS (Tab)  │
                    └───────────┬──────────┘└──────────┬───────────┘
                                │                      │
                                └───────────┬──────────┘
                                            │ Items Marked READY
                                            ▼
                                ┌──────────────────────┐
                                │  FOH Runner / Buzzout │
                                │   Tablet Expediter   │
                                │   (station:foh_runner)
                                └───────────┬──────────┘
                                            │ Auto-print dispatch
                                            ▼
                                ┌──────────────────────┐
                                │ ESC/POS USB Printer  │
                                │   Thermal Station    │
                                └──────────────────────┘
```

---

## 📚 Related Documentation

- Architecture & File Tree Map: [AGENTS.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/AGENTS.md)
- Implementation Roadmap: [PHASES.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/PHASES.md)
- Developer Onboarding & Commands: [CONTRIBUTING.md](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/CONTRIBUTING.md)
