# Research: Philippine VAT, Station-Aware Service Charge, and Senior/PWD Discount POS Architecture

## 1. Executive Summary & Legal Framework

This research investigates the statutory formulas, regulatory mandates, and point-of-sale (POS) architectural patterns for:

1. **Philippine 12% Value-Added Tax (VAT)** extraction from inclusive pricing (Tax Code Sec. 106/108, RR 16-2005).
2. **Station-Aware & Mode-Dependent Service Charge** (RA 11360, DOLE Dept. Order No. 206-19) under Cafe Mode vs. Event Mode.
3. **Senior Citizen (RA 9994 / RR 7-2010 / RMC 38-2012 / RMC 71-2022) & PWD (RA 10754) Statutory Discounts** and their execution via Tab Editing / Item Transfer vs. Settlement-Level Allocation.

---

## 2. Primary Source Analysis: Statutory Computations

### A. 12% Value-Added Tax (VAT-Inclusive Pricing)

- **Primary Source:** National Internal Revenue Code (NIRC) Section 106 & 108; BIR Revenue Regulations (RR) No. 16-2005 Section 4.106-4.
- **Statutory Invariant:** In the Philippines, retail prices and restaurant menus are strictly **VAT-inclusive**. VAT is not an added surcharge on top of the menu price; it is extracted backwards from the menu price.
- **Mathematical Formula:**
  $$\text{VATable Sales} = \frac{\text{Menu Price (VAT-Inclusive)}}{1.12}$$
  $$\text{VAT Amount (12\%)} = \text{Menu Price} - \text{VATable Sales} = \text{VATable Sales} \times 0.12$$
- **Example:**
  For an item with a menu price of ₱150.00:
  - $\text{VATable Sales} = \frac{150.00}{1.12} \approx ₱133.93$
  - $\text{VAT Amount} = 150.00 - 133.93 = ₱16.07$
  - Customer pays: ₱150.00 (inclusive of VAT).

### B. Senior Citizen (RA 9994) & PWD (RA 10754) Discount Calculation

- **Primary Sources:**
  - Republic Act No. 9994 (Expanded Senior Citizens Act of 2010) Section 4(a).
  - BIR Revenue Regulations No. 7-2010 (Implementing Tax Privileges for Senior Citizens).
  - BIR Revenue Memorandum Circular (RMC) No. 38-2012 (Clarification of Tax Treatment on Senior Citizens & Service Charges).
  - BIR Revenue Memorandum Circular (RMC) No. 71-2022 (Guidelines on Senior & PWD Invoicing).
- **Two-Step Statutory Mandate:**
  1. **VAT Exemption First:** The portion of goods/services consumed by a Senior Citizen or PWD is **100% exempt from the 12% VAT**.
     $$\text{VAT-Exempt Base} = \frac{\text{Qualifying Gross Selling Price}}{1.12}$$
  2. **20% Statutory Discount Second:** The 20% discount is applied **strictly to the VAT-Exempt Base**, never to the VAT-inclusive price (to prevent double discounting the VAT).
     $$\text{Discount Amount (20\%)} = \text{VAT-Exempt Base} \times 0.20$$
  3. **Net Payable by Senior/PWD:**
     $$\text{Net Payable} = \text{VAT-Exempt Base} - \text{Discount Amount} = \text{VAT-Exempt Base} \times 0.80$$
- **Example (₱150.00 Qualifying Item):**
  - Gross Price: ₱150.00
  - VAT-Exempt Base: $150.00 / 1.12 = ₱133.93$
  - 20% Discount: $133.93 \times 0.20 = ₱26.79$
  - Net Payable: $133.93 - 26.79 = ₱107.14$ (Total savings for Senior: ₱16.07 VAT exemption + ₱26.79 discount = ₱42.86).

### C. Service Charge (RA 11360 & BIR RMC 38-2012)

- **Primary Source:**
  - Republic Act No. 11360 (An Act Providing that Service Charges Collected by Hotels, Restaurants and other Similar Establishments be Distributed in Full to All Covered Employees).
  - BIR RMC No. 38-2012 (Q&A No. 13 & 14):
    - _Question:_ Is service charge subject to the 20% Senior Citizen discount?
    - _Ruling:_ **No.** The 20% discount applies only to food, beverages, and consumable goods for personal consumption, not to the service charge.
    - _Question:_ Is the service charge on a Senior Citizen's consumption exempt from 12% VAT?
    - _Ruling:_ In establishments that collect service charge, the service charge attributed to the senior citizen's consumption is exempt from VAT if the establishment is VAT-registered.
- **Monk's Dream Business Rules:**
  - **Cafe Mode:**
    - Coffee / Beverages (`station: 'bar'`, Barista/Bartender products): **0% Service Charge**.
    - Food (`station: 'kitchen'`, Kitchen Chef products): **10% Service Charge** (Configurable in Settings, e.g. `kitchen_service_charge_rate`).
  - **Event Mode:**
    - All Items (both bar beverages and food): **10% Service Charge** (Configurable in Settings, e.g. `event_service_charge_rate`).
- **Service Charge Base Calculation:**
  In Philippine restaurant accounting, Service Charge percentage is applied to the **Net VAT-Exclusive Subtotal** (or VAT-Exempt Base for Seniors) of the qualifying items, ensuring guests are not paying service charge on top of government sales tax.

---

## 3. Comparative POS Patterns: Handling Senior Citizens at Mixed Tables

In restaurant operations where a table has a mix of Senior/PWD guests and regular diners, POS systems implement three distinct architectures:

| Approach                                                                          | Description                                                                                                                                                                 | Operational Speed                                                        | Audit & Receipt Clarity                                                                                                                   | Implementation Complexity                                                                    |
| :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Approach 1: Tab Item Transfer (Sub-Tabs)**                                      | Waiter or cashier opens a dedicated Senior Tab (e.g. "Table 4 - Tab 2 (Lola Maria)") and transfers the specific items consumed by the senior citizen into that tab.         | High operational clarity on table; each guest gets their own bill.       | **Perfect compliance.** 100% of Tab 2 is VAT-exempt & 20% discounted. Tab 1 is 100% regular VAT. Senior signs Tab 2 receipt.              | Requires UI for transferring line items between tabs on the same table.                      |
| **Approach 2: Line-Item Senior Tagging at Settlement**                            | In the settlement modal, the cashier checks off individual line items that belong to the Senior/PWD (e.g. 1 Americano, 1 Carbonara).                                        | Very fast during checkout; no tab re-organization needed before payment. | **High compliance.** Emits a single receipt with separated "VATable Sales" and "VAT-Exempt Sales", itemizing which lines were discounted. | Modifies settlement modal to render item checklist with quantity selectors.                  |
| **Approach 3: Headcount Proportional Allocation (BIR RMC 38-2012 / RMC 71-2022)** | Cashier enters `Total Diners` (e.g. 5) and `Senior Count` (e.g. 2). POS divides the shared food total: $(\text{Total} / 5) \times 2$ receives VAT exemption & 20% discount. | Fastest for large family sharing platters where items are communal.      | **Statutory BIR default for shared meals.** Does not require assigning individual dishes.                                                 | Best for family dining, but less intuitive for personal jazz bar cocktails/specialty drinks. |

### Industry Best Practice for Monk's Dream Jazz Bar & Cafe:

The hybrid approach used by leading enterprise systems (Toast POS, Micros Simphony):

1. **Primary Tool (Item Transfer / Tab Split):** Provide a fast "Move Items to Tab" feature in `TableActionMenu` / `FloorWorkspaceView`. When a waiter or cashier taps "Split / Transfer Items", they can select items from Tab 1 and move them to a new or existing tab on that table (e.g. "Tab 2 (Senior)"). Tab 2 can then be settled with 1-click Senior Discount.
2. **Settlement Modal Fast Senior Mode:** In `BillSettlementModal`, allow toggling "Apply Senior/PWD Discount" with two modes:
   - _Full Tab_ (if tab was already isolated for the senior).
   - _Select Specific Items_ (if the table remained on a single tab).
   - Capture mandatory BIR compliance fields: OSCA / PWD ID Number and Full Name.

---

## 4. Architectural Impact on Database & Reports

1. **`order_items` vs `products.station`:**
   - Service charge eligibility in Cafe Mode depends on whether an item is routed to the kitchen (`station = 'kitchen'`) vs bar (`station = 'bar'`).
2. **`payments` table schema:**
   - Must record:
     - `gross_sales` (Total before tax extraction)
     - `vatable_sales` (Net sales subject to 12% VAT)
     - `vat_amount` (12% tax collected)
     - `vat_exempt_sales` (Sales exempt from VAT due to Senior/PWD)
     - `discount_amount` (20% statutory or promo discount)
     - `service_charge` (Collected service charge)
     - `senior_pwd_id` & `senior_pwd_name` (Audit compliance)
3. **Fiscal Readings (X/Y/Z) & Excel Exports:**
   - Must accumulate `service_charge`, `vatable_sales`, `vat_amount`, and `vat_exempt_sales` correctly in `pos_y_readings` and `pos_z_readings`.
