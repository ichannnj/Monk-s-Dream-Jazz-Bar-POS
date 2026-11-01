# 📊 Research: Modern Restaurant & Jazz Bar POS Admin Dashboard Best Practices

> **Target Venue:** Monk's Dream Jazz Bar (Daytime Artisan Cafe + Evening Live Jazz Bar & Supper Club)  
> **Ecosystem:** React Native (NativeWind v4) + Supabase PostgreSQL Backend  
> **Primary Sources & Benchmarks:** Toast POS Analytics & Executive Reporting, Lightspeed Restaurant (K-Series / Advanced Insights), Square for Restaurants Dashboard, Restaurant365 Operations Suite, Kasavana & Smith Menu Engineering Matrix.

---

## 1. Executive Summary

A restaurant/bar Point-of-Sale (POS) administrative dashboard serves as the operational cockpit for the General Manager (Dana Cruz / Miles) and venue ownership. Unlike analytical BI suites intended for retrospective monthly accounting, an executive POS dashboard operates on a **"Management by Exception"** paradigm:

1. Provide immediate, unambiguous visibility into venue throughput and cash velocity.
2. Alert managers only to operational friction (stockouts, voids/refunds, table bottlenecks).
3. Display real, live database metrics directly from transactional tables (`payments`, `tabs`, `orders`, `order_items`, `inventory_items`, `tables`).

---

## 2. Core Dashboard Architecture: What Belongs on the Executive Screen

Based on industry design benchmarks from Toast POS and Lightspeed Restaurant, an effective restaurant dashboard prioritizes four operational clusters:

### 2.1. Top-Line Financial Velocity (The Executive 4-Pack)

1. **Net Sales Revenue:** Realized revenue from settled orders. In dual-concept venues, this reflects all active order channels:
   - Cafe Dining & Counter Intake
   - Bar & Jazz Club Floor Table Service
   - Takeout & Delivery channels
2. **Settled Checks & Average Ticket:**
   - Total count of completed customer transactions.
   - Average Ticket Size ($$\text{Average Ticket} = \frac{\text{Net Sales}}{\text{Settled Checks}}$$), measuring guest spending power and upselling success.
3. **Guest Count & RevPASH (Revenue Per Available Seat):**
   - Headcount derived from dine-in party sizes and table occupancies.
   - Spend per guest ($$\text{PPA} = \frac{\text{Net Sales}}{\text{Guest Count}}$$).
4. **Live Floor Table Utilization:**
   - Active open tabs vs total tables (e.g. 8 of 25 tables active, 32% occupancy).
   - Instant visual gauge of current floor turnover rate.

---

## 3. Date Range & Comparison Best Practices: Fixing the "Compare To" Dilemma

### 3.1. Why Arbitrary "Compare To: Yesterday" Fails in Hospitality

In standard retail, comparing Tuesday to Monday is common. However, in restaurants and live entertainment venues:

- **Weekday vs. Weekend Volatility:** Comparing Friday night or Saturday jazz set to Thursday afternoon produces massive artificial variance (+300% / -70%) that offers zero actionable intelligence.
- **Day-of-Week Matching Invariant:** A Tuesday service must be compared against **"Same Day Last Week"** (Prior Tuesday) or a **"4-Week Same-Day Rolling Average"** to account for consistent day-part consumer behavior.

### 3.2. Standard Date Range Architecture

Modern POS systems (Toast, Lightspeed, Square) structure time filtering into a two-level hierarchy:

1. **Primary Timeframe Selector (The Active Window):**
   - `Today` (Live ongoing shift)
   - `Yesterday` (Audit of preceding business day)
   - `This Week (WTD)` (Rolling week-to-date)
   - `This Month (MTD)` (Calendar month-to-date)
   - `All-Time / Total History`
2. **Contextual Benchmark Baseline:**
   - When viewing `Today`: System automatically compares against **Same Day Last Week** (e.g. This Tuesday vs Last Tuesday).
   - When viewing `This Week`: Compares against **Prior Week**.
   - When viewing `This Month`: Compares against **Prior Month**.
   - With an explicit toggle for managers who specifically want **"Yesterday"** or **"None (Raw Figures Only)"**.

---

## 4. Sales Mix & Menu Velocity (Best Sellers by Volume & Margin)

### 4.1. True Database Aggregation from `order_items`

Instead of static arrays, the dashboard queries active `order_items` table:
$$\text{Product Volume} = \sum \text{quantity}$$
$$\text{Product Revenue} = \sum (\text{quantity} \times \text{unit\_price})$$
Items with `status = 'CANCELLED'` are excluded from sales volume.

### 4.2. Category Distribution

Revenue broken down across canonical venue departments:

- **Specialty Coffee & Teas** (Cafe Barista Station)
- **Signature Cocktails & Spirits** (Bar Station)
- **Beer & Wine** (Bar Station)
- **Kitchen & Hot Food** (Kitchen Station)

---

## 5. Risk, Loss Prevention & Alerts ("Management by Exception")

Executives need to see actionable alerts rather than wading through raw tables:

1. **Critical Par Alerts:** Ingredients in `inventory_items` where `current_stock <= min_alert_level`.
2. **Discounts & Voids:** Waste logs in `waste_logs` or voided orders requiring manager review.
3. **Cash Drawer Float Imbalance:** Discrepancies between expected cash and physical count.

---

## 6. Implementation Specifications for Monk's Dream Jazz Bar

1. **Zero Mock Data Mandate:**
   - Query Supabase directly via PostgREST:
     - `payments`: Total revenue, payment method split (Cash vs Digital Wallet vs Card).
     - `tabs`: Active open tabs count, order channels, guest counts.
     - `order_items`: Real product sales counts, category revenue totals.
     - `tables`: Total tables, occupied tables, live occupancy rate.
     - `inventory_items`: Real ingredients below alert thresholds.
2. **Graceful Zero-State Handling:**
   - If a freshly initialized day has 0 settled payments, show clean zero states (`₱0.00`, `0 settled checks`) with an empty-state illustration or a clearly marked `"Historical Summary / All-Time"` toggle rather than static hardcoded mock numbers.
3. **Interactive Viewport Modals:**
   - Modern viewport-centered pickers for Timeframe and Category filtering.
   - Elimination of all arbitrary horizontal scrolling.
   - Typography floor ($\ge 16\text{px}$) and touch target floor ($\ge 48\text{px}$).
