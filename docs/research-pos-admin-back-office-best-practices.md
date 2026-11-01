# 📚 Research: Modern Restaurant & Jazz Bar POS Admin Back-Office Best Practices

> **Target Venue:** Monk's Dream Jazz Bar (Daytime Artisan Cafe + Evening Live Jazz Bar & Supper Club)  
> **Ecosystem:** React Native (NativeWind v4) + Supabase PostgreSQL Backend  
> **Sources & Benchmarks:** Toast POS, Lightspeed Restaurant (K-Series), Square for Restaurants, Kasavana & Smith Menu Engineering Matrix, Restaurant365, Craftable / BevSpot Beverage Management.

---

## 1. Executive Summary

A point-of-sale system for a high-volume dual-concept venue (daytime third-wave coffee shop and evening live jazz bar) demands an administrative back office that bridges front-of-house service velocity with back-of-house margin control.

This research documents industry standards, architectural patterns, and administrative requirements across two primary domains:

1. **Menu Engineering & Product Catalog:** Managing items, categories, modifier groups, recipe Bills of Materials (BOM), dietary constraints, and station routing.
2. **Inventory Management & Supply Chain:** Managing raw ingredients, packaging/disposables, suppliers, stock depletion, deliveries with Moving Average Cost (MAC), waste logging, and cycle count auditing.
3. **Critical Overlooked Admin Requirements:** Tax/service charge rules, role permission overrides, discount & comp management, and hardware printer routing.

---

## 2. Menu Architecture & Catalog Best Practices

### 2.1. Hierarchical Modifier Groups vs. Flat Modifiers

In modern systems (Toast, Lightspeed), flat product modifiers fail when applied to complex beverages or entrees. Best practices establish a **three-tier hierarchy**:

```
Product (e.g., Flat White)
  └── Modifier Group (e.g., "Milk Choice", Min: 1, Max: 1, Required: true)
        ├── Option: Whole Milk (+$0.00, Inventory: -200ml Whole Milk)
        ├── Option: Barista Oat Milk (+$0.75, Inventory: -200ml Oat Milk)
        └── Option: Almond Milk (+$0.75, Inventory: -200ml Almond Milk)
  └── Modifier Group (e.g., "Espresso Shots", Min: 0, Max: 2, Required: false)
        └── Option: Extra Double Shot (+$1.00, Inventory: -18g Espresso Beans)
  └── Modifier Group (e.g., "Syrup Flavor", Min: 0, Max: 3, Required: false)
        ├── Option: Madagascar Vanilla (+$0.50, Inventory: -15ml Vanilla Syrup)
        └── Option: Salted Caramel (+$0.50, Inventory: -15ml Caramel Syrup)
```

**Key Data Model Attributes for Modifier Groups:**

- `min_selections`: Forces waiter selection before sending to kitchen/bar (e.g., steak temperature, choice of side, milk selection).
- `max_selections`: Limits options (e.g., pick 1 dressing, up to 3 toppings).
- `is_required`: Boolean flag for fast UI validation.
- `inventory_delta`: Every option explicitly specifies which raw ingredient is consumed or credited.

### 2.2. Recipe Bill of Materials (BOM) & Dynamic Cost of Goods Sold (COGS)

- **Unit Conversion Formula:**
  Raw goods are purchased in bulk (`kg`, `L`, `cases`, `750ml bottles`) but dispensed in fractional units (`18g`, `30ml`, `45ml shot`, `1 pc`).
  The system normalizes every ingredient through a conversion factor:
  $$\text{Ingredient Cost} = \text{Portion Amount} \times \text{Conversion Factor} \times \text{Inventory Unit Cost}$$
- **Live Margin Tracking:**
  $$\text{COGS} = \sum_{i \in \text{Ingredients}} \text{Ingredient Cost}_i$$
  $$\text{Gross Margin \%} = \frac{\text{Selling Price} - \text{COGS}}{\text{Selling Price}} \times 100\%$$
- **Menu Engineering Matrix (Kasavana & Smith):**
  Cross-referencing item sales volume with contribution margin:
  - **Stars:** High volume, high margin (e.g., Signature Bourbon Old Fashioned). Protect consistency.
  - **Plowhorses:** High volume, low margin (e.g., Basic Draft Beer). Adjust pricing or optimize supplier costs.
  - **Puzzles:** Low volume, high margin (e.g., Reserve Mezcal Negroni). Train staff on upselling.
  - **Dogs:** Low volume, low margin. Candidate for 86ing or retirement.

### 2.3. Dual Station Routing & Display Constraints

- Every menu item must define `station_target`:
  - `station_bar`: Cocktails, spirits, beer, wine, artisan coffee, tea, cold drinks.
  - `station_food`: Tapas, pastas, entrees, desserts.
- Split-ticket dispatch: An order containing 2 cocktails and 1 pasta immediately routes the drinks to the Bar KDS and the pasta to the Kitchen KDS, printing a consolidated Runner Chit at the expediter pass.

---

## 3. Inventory Hub & Supply Chain Best Practices

### 3.1. Inventory Taxonomy & Categorization

Bars and restaurants track three distinct classes of goods:

1. **Raw Ingredients (Active Production):** Espresso beans, craft spirits, syrups, fresh dairy, meats, produce. Consumed dynamically via recipe BOMs.
2. **Disposables & Packaging:** To-go hot cups (8oz, 12oz), lids, cup sleeves, cocktail straws, napkins, delivery kraft bags.
   - Depletion strategy: Triggered on Takeout/Online Delivery orders, or bundled into to-go surcharge items.
3. **Resold Finished Goods / Outside Food:** Pre-packaged snacks or outsourced pastries.
   - Constraint in Monk's Dream: Admin enters vendor invoice cost, system locks the selling price at a mandatory **+20% markup** (`Selling Price = Original Cost * 1.20`).

### 3.2. Dedicated Suppliers Entity

Rather than free-text strings on inventory rows, enterprise POS back offices maintain a dedicated `suppliers` table:

- Supplier Name, Contact Person, Phone, Email, Payment Terms (Net 15, COD).
- Associated product lines and lead times (days).
- Historical purchase order records and invoice tracking.

### 3.3. Weighted Moving Average Cost (MAC) & Purchase Deliveries

When receiving shipments, spot prices fluctuate. To maintain accurate accounting without FIFO lot tracking overhead:
$$\text{MAC}_{\text{new}} = \frac{(\text{Stock}_{\text{current}} \times \text{MAC}_{\text{old}}) + (\text{Qty}_{\text{received}} \times \text{Invoice Cost})}{\text{Stock}_{\text{current}} + \text{Qty}_{\text{received}}}$$

### 3.4. Physical Stocktake & Variance Reconciliation (Cycle Counts)

High-value bar items (single-malt scotches, rare rums, high-end steaks) suffer from shrinkage, over-pouring, and unrecorded waste.

- **Theoretical Stock:** What POS transactions say should be in the building.
- **Physical Count:** Actual count conducted by manager during weekly or monthly audit.
- **Variance Analysis:**
  $$\text{Variance Qty} = \text{Actual Count} - \text{Theoretical Stock}$$
  $$\text{Variance Cost} = \text{Variance Qty} \times \text{Unit Cost}$$
  A positive variance indicates unrecorded intake or under-pouring; negative variance highlights waste, over-pouring, or shrinkage.

### 3.5. Waste & Spillage Logging

Staff can log wasted portions directly into an audit log with standard reasons:

- `DROPPED_SPILL`: Broken glassware, knocked over bottles.
- `EXPIRED`: Spoiled milk, past-date garnishes.
- `PREPARATION_ERROR`: Burned dish or improperly shaken cocktail.
- `CUSTOMER_RETURN`: Wrong drink delivered or customer dissatisfaction.
- `STAFF_TASTING`: Quality control calibration or menu training.
  Cost of waste is immediately credited out of inventory and debited to venue operational overhead.

---

## 4. Crucial Often-Overlooked Admin Modules

Based on industry POS research, these administrative capabilities are frequently omitted in custom builds but are essential for live operations:

| Feature Area                             | Why It's Crucial                                                                                                     | Implementation in Monk's Dream                                                                                        |
| :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Tax & Service Charge Settings**        | Philippine BIR regulation / hospitality gratuities.                                                                  | Configurable VAT (e.g. 12% inclusive or exclusive) and Service Charge (e.g. 10% distributed to staff).                |
| **Discounts & Comps Management**         | Mandatory statutory discounts (Senior Citizen / PWD 20%) and operational comps (Musician Comp 100%, Staff Meal 50%). | Configurable discount profiles with mandatory reason and manager PIN authorization requirement.                       |
| **Table Layout & Capacity Configurator** | Live jazz venues frequently alter floor configurations between daytime cafe and evening concert seating.             | Admin table layout manager to adjust table numbers, zones (`CAFE_AREA`, `BAR_AREA`), and seating capacities.          |
| **Printer & KDS Hardware Routing**       | Backup printing when a network drops, or directing bar chits to separate receipt printers.                           | Hardware routing table mapping categories to thermal printer devices (USB / IP) and KDS tablet IDs.                   |
| **Audit Logs & Security Overrides**      | Preventing employee theft, unauthorized item voids, and drawer pop abuses.                                           | Comprehensive audit trail of all manager overrides: voids after prep, drawer openings without sales, price overrides. |

---

## 5. Architectural Recommendations for Implementation

1. **Database Additions:**
   - Add `suppliers` table with foreign key `supplier_id` on `inventory_items`.
   - Add `modifier_groups` table with `product_id`, `name`, `min_selections`, `max_selections`, `is_required`.
   - Upgrade `product_modifiers` to link to `modifier_group_id` with optional `inventory_item_id`, `amount_delta`, and `unit`.
   - Add `stocktake_sessions` and `stocktake_items` tables for physical inventory count variance auditing.
2. **Admin Presentation Layer:**
   - **Menu Catalog Hub:** Tabbed sub-views: `[Products & BOM]`, `[Categories]`, `[Modifier Groups]`.
   - **Inventory Hub:** Tabbed sub-views: `[On-Hand Stock]`, `[Suppliers]`, `[Stock Movements Ledger]`, `[Stocktake Audit]`, `[Waste & Spillage Log]`.
   - Modal forms following Monk's Dream design tokens (Burgundy `#800020`, warm stone, NativeWind v4, touch targets ≥ 48px, typography ≥ 16px).
