# 📊 Phase 6: Admin Back-Office, Inventory Hub & Venue Expense Suite

> **Phase:** 06 of 06  
> **Status:** ✅ Complete  
> **Master Spec Reference:** [REQUIREMENTS.md — Section 4 & 7](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)  
> **Goal:** Build the complete administration back-office suite covering the Venue Operating Mode Switcher, the interactive Recipe BOM Builder, the real-time Inventory Hub with Restock Moving Average Cost (MAC), the Staff Attendance & Daily Salary Expense Suite (with discretionary shift add-ons), and Multi-Channel Sales Analytics.

---

## 🎯 Scope of Work

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Operating Mode Switcher                                             │
│    • ☀️ Normal Cafe Mode <---> 🎷 Event Mode                          │
│    • Dynamic order tagging for isolated event sales & artist nights    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Recipe Bill of Materials (BOM) & Menu Image Suite                   │
│    • Interactive builder: bind raw ingredients with exact measurements │
│    • Image upload pipeline to Supabase Storage bucket (menu-images)    │
│    • Dynamic COGS & gross margin percentage calculation                │
│    • Resold Outside Food: vendor cost input with locked +20% markup    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Inventory Management Hub & Stock Movement Ledger                    │
│    • Real-time stock levels with Par status badges (Good, Low, Reorder)│
│    • Restock delivery intake with Weighted Moving Average Cost (MAC)   │
│    • Spillage & Waste Logger (loss booked to overheads)                │
│    • Immutable StockMovement audit ledger with CSV export              │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Staff Attendance & Daily Salary Expense Suite                       │
│    • Attendance tracking for both workflow and non-workflow staff     │
│    • Monthly shift calendar with editable discretionary daily add-ons  │
│    • Overall venue payroll aggregation & Net Profit Dashboard          │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Multi-Channel Sales Auditing & Analytics                            │
│    • Mode lenses: Cafe Mode vs Event Mode vs Consolidated Grand Total  │
│    • Channel breakdown: Cafe Area, Bar Area, Takeout, Grab, Foodpanda  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Implementation Checklist

### Step 6.1: Venue Operating Mode Switcher

- [x] Target file: `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`
- [x] Admin toggle: `[ ☀️ Normal Cafe Mode ]` $\longleftrightarrow$ `[ 🎷 Event Mode ]`.
- [x] Backend stores mode in application state or configuration table.
- [x] Every order created while Event Mode is active is tagged with `operatingMode: "EVENT"`.
- [x] Allows management to isolate per-event gross revenue, artist night metrics, and bar-to-kitchen cocktail ratios.

### Step 6.2: Interactive Recipe BOM Builder

- [x] Target file: `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`
- [x] Recipe Formulation Interface:
  - Select Menu Product $\to$ Add Raw Inventory Ingredients.
  - Set measurement amount and unit (`g`, `kg`, `ml`, `L`, `pcs`, `shot`).
  - Unit conversion factor: e.g. 18g espresso beans to kg = `0.001`.
- [x] Live Cost of Goods Sold (COGS) Calculation:
  - System multiplies ingredient portion by latest `unitCost` to compute item COGS and target gross margin %.
- [ ] Outside Food Markup Lock:

### Step 6.2b: Menu Item Creation & Image Upload Pipeline (Supabase Storage)

- [x] Target frontend: `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`
- [x] Supabase Storage Infrastructure:
  - Bucket name: `menu-images` (public read access, authenticated write).
- [x] Direct Client Image Upload:
  - File picker reads image via Expo ImagePicker or browser file dialog.
- [x] Frontend Menu Item Form & Image Picker:
  - Dual intake: File upload button PLUS direct Image URL text field.
  - Live preview card with cover fill and rounded corners.

### Step 6.3: Inventory Management Hub & Stock Movement Ledger

- [x] Target file: `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`
- [x] On-Hand Inventory Table:
  - Columns: SKU, Item Name, Category, Current Stock, Unit, Min Par, Cost/Unit, Status Badge (`🟢 Good`, `🔴 LOW`, `🟡 Reorder`).
- [x] Restock Delivery Intake Modal:
  - Log supplier delivery (Supplier name, invoice #, qty received, invoice cost).
  - Updates stock and computes **Weighted Moving Average Cost (MAC)**:
    $$\text{MAC}_{\text{new}} = \frac{(\text{Stock}_{\text{old}} \times \text{Cost}_{\text{old}}) + (\text{Qty}_{\text{received}} \times \text{Price}_{\text{invoice}})}{\text{Stock}_{\text{old}} + \text{Qty}_{\text{received}}}$$
- [x] Spillage & Waste Logger:
  - Log dropped bottles, burned dishes, or expired stock with reason tag.
  - Generates immutable `SPOILAGE_WASTE` stock movement.
- [x] Immutable Audit Ledger:
  - Searchable transaction table of all stock movements.

### Step 6.4: Staff Attendance & Daily Salary Expense Suite

- [x] Target file: `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`
- [x] Full Roster Support:
  - Workflow staff (Waiters, Cashiers, Baristas, Chefs) clocked via PIN.
  - Non-workflow staff (Dishwashers, Cleaners, Security, Sound Tech) marked present by Admin or attendance kiosk.
- [x] Day-by-Day Shift Breakdown View:
  - Table of dates for selected month.
  - Base Daily Pay (local daily minimum wage baseline, e.g. $50/day).
  - **Discretionary Daily Add-on (Editable):** Admin can tap `[✏️ Edit]` on any hectic or stressful shift to add an arbitrary discretionary bonus (e.g. `+$15.00` or `+$25.00` for heavy live jazz nights).
- [x] Monthly Labor Expense Aggregation:
  - Calculates total monthly wage due per employee and rolls into the venue's overall operating expense report.

### Step 6.5: Multi-Channel Sales Auditing & Net Profit Dashboard

- [x] Target file: `frontend/src/features/admin/presentation/AdminBackOfficeScreen.tsx`
- [x] Multi-Lens Filters:
  - `[ ☀️ Normal Cafe Mode ]`: Gross daytime coffee/mains sales.
  - `[ 🎷 Event Mode ]`: Show gross sales, bar cocktail rush hours.
  - `[ 📊 Grand Total Consolidated ]`: Combined operations.
- [x] Channel Breakdown Table:
  - Rows for `Cafe Area (Dine-In)`, `Bar Area (Dine-In)`, `Walk-In Takeout`, `GrabFood`, and `Foodpanda`.
  - Columns: Gross Sales, Order Count, Avg Ticket Size, Share of Volume.
- [x] Business Net Profit Calculation:
      $$\text{Net Profit} = \text{Grand Total Sales} - (\text{Labor Expenses} + \text{COGS} + \text{Venue Overheads})$$

---

## 🔬 Verification & Validation

| Test Scenario               | Action                                         | Expected Result                                                 |
| --------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Mode Toggle                 | Toggle from Cafe to Event Mode                 | New orders receive `operatingMode: "EVENT"` in database         |
| Outside Food Markup         | Input outside cake vendor cost $10.00          | Selling price automatically locked at $12.00 (+20%)             |
| Restock Delivery MAC        | Restock 10 bottles of Gin at $30/bottle        | On-hand increases by 10 and Weighted MAC updates                |
| Discretionary Salary Add-on | Add +$20 add-on to Bill for Friday night shift | Bill's day total becomes $70 and monthly total increases by $20 |
| Channel Auditing            | Filter reports by GrabFood                     | Shows isolated delivery order volume and sales                  |
