# POS Thermal Receipt & Order Slip Engineering Standards

## 1. Executive Summary & Objective

This document formalizes the architecture, computational rules, and formatting standards for thermal printing across **Monk's Dream Jazz Bar POS**. It defines:

1. **80mm ESC/POS Raster Graphic Logo Processing** for high-contrast branding.
2. **Business-Grade Long Customer Receipt Layout** compliant with Philippine commercial and statutory standards (Ease of Paying Taxes / BIR RR 16-2018 / RA 9994 / RA 10754).
3. **Itemized Transaction Data Preservation** ensuring variants (Temperature, Cup Size), modifiers, and notes appear seamlessly on tickets.
4. **Kitchen, Bar & Expediter Dispatch Chits** engineered for live operational speed without omission.

---

## 2. 80mm ESC/POS Thermal Geometry & Columns

Thermal receipt printers commonly operate at 203 DPI (8 dots/mm). On standard 80mm thermal paper with an effective printable width of 72mm (576 dots):

| Font Mode               | Pitch (Dots) | Characters Per Line (CPL)                   | Primary Use Case                                    |
| :---------------------- | :----------- | :------------------------------------------ | :-------------------------------------------------- |
| **Font A (Default)**    | 12 × 24      | **48 CPL** (or 42 on select older firmware) | Line items, headers, metadata, financial breakdown  |
| **Font B (Condensed)**  | 9 × 17       | **64 CPL**                                  | Extended legal disclaimers, itemized ingredient BOM |
| **Double Width/Height** | 24 × 48      | **24 CPL**                                  | Grand total, table number, order chit title         |

### 48-Column Tabular Line Grid Allocation

To guarantee vertical alignment without text collision:

```text
[------------------ 48 Characters Total ------------------]
[ QTY: 4 ] [ DESCRIPTION: 30                  ] [ AMT: 14 ]
  1        Americano (Hot · 12oz)                   160.00
           + Oat Milk                                40.00
  2        Monk's Truffle Burger                  1,100.00
```

---

## 3. High-Contrast Raster Graphic Logo (`GS v 0`)

Monk's Dream's emblem (piano keyboard frame & trumpet silhouette) is transformed into an ESC/POS bitonal raster bitmap:

- **Geometry:** 288 dots wide × 255 dots high (36 bytes horizontal width).
- **Alignment:** Centered via printer centering command (`ESC a 1`) with standard 80mm margins.
- **ESC/POS Command Structure:**
  - Opcode: `GS v 0 m xL xH yL yH d1...dk`
  - Hex bytes: `1D 76 30 00 24 00 FF 00 [9,180 raster bytes]`
- **Zero Runtime Overhead:** Pre-compiled into an immutable `Uint8Array` / Base64 constant (`logoRasterBytes.ts`) so browser WebUSB and daemon drivers execute instantly without canvas dependencies.

---

## 4. Statutory & Financial Computational Engine (Philippine Standard)

### A. 12% VAT Breakdown & Extraction

Under standard VAT-inclusive pricing:
$$\text{VATable Sales} = \frac{\text{Gross Selling Price}}{1.12}$$
$$\text{VAT Amount (12\%)} = \text{Gross Selling Price} - \text{VATable Sales}$$

### B. Senior Citizen (SC) & PWD Statutory Discount Rule

Under RA 9994, RA 10754, and BIR RMC regulations:

1. Strip the 12% VAT first:
   $$\text{VAT-Exempt Base} = \frac{\text{Qualifying Gross}}{1.12}$$
2. Apply 20% discount on the VAT-exempt base:
   $$\text{Discount Amount} = \text{VAT-Exempt Base} \times 0.20$$
3. Net Amount Due:
   $$\text{Net Due} = \text{VAT-Exempt Base} - \text{Discount Amount}$$
4. Mandatory Receipt Block:
   - OSCA / PWD ID Number
   - Beneficiary Name
   - Signature Line

---

## 5. Architectural Invariants for Ticket Dispatch & Settlement

1. **Atomic Settlement Pipeline (`settle_tab_and_record_payment`):**
   - Must aggregate all non-cancelled `order_items` (joining `products` and `product_variants` to capture `name`, `variant_name`, `temperature`, `size`, `unit_price`, and `notes`).
   - Must resolve physical `table_number` from `tables` rather than emitting raw UUIDs.
   - Enqueues `receipt_data` containing complete line items, tax breakdowns, and settlement details.
2. **Order Round Dispatch Pipeline (`dispatch_order_round_atomic`):**
   - Must output normalized keys (`name` matching `productName`, `station` matching `stationTarget`).
   - Must format beverage variant specs (`Hot · 12oz` or `Iced · 16oz`) directly in the item title.
3. **Cash Drawer Pulse:**
   - Cash drawer kick command (`ESC p 0 25 250`) executes strictly on Cash transactions or manual till audits, leaving the drawer closed for cashless QR / Card payments.
