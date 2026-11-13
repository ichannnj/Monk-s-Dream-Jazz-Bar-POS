# 💳 Phase 2: Split-Tender Settlement & Multi-Payment Checkout

> **Status:** Pending Execution  
> **Target:** Seamless partial payments (e.g. ₱500 Cash + ₱1,000 GCash) on a single check with zero breakage to X/Y/Z fiscal readings.

---

## 🎯 Objectives

1. Allow waitstaff to split payment across multiple tenders (Cash, Card, Digital Wallets, Comp) in `BillSettlementModal`.
2. Persist split tenders as distinct rows in `public.payments` linked to the same `tab_id`, ensuring downstream sales reports, cashless registers, and drawer reconciliations work seamlessly.
3. Automatically record the exact cash portion in `public.cash_drawer_transactions` (`action_type: 'SALE'`).
4. Print an itemized multi-tender breakdown on 80mm ESC/POS thermal receipts.

---

## 🛠️ Implementation Checklist

- [ ] **Step 2.1: Supabase Migration**
  - Create `supabase/migrations/20261114000001_split_tender_settlement.sql`:
    - Overhaul `public.settle_tab_and_record_payment` to accept `p_tenders JSONB DEFAULT NULL`.
    - If `p_tenders` is passed:
      - Iterate through each tender `{ method, amount, payment_channel, reference_number }`.
      - Insert one row into `public.payments` per tender.
      - If method is `cash`, insert into `public.cash_drawer_transactions`.
    - Retain 100% backward compatibility for single-tender calls (`p_payment_method`).
    - Build rich receipt JSON payload containing itemized `tender_breakdown`.
- [ ] **Step 2.2: Split-Tender Domain & State Machine**
  - Define discriminated union type `PaymentTender`:
    ```ts
    export type PaymentTender =
      | { method: 'cash'; amount: number; tendered: number; change: number }
      | { method: 'digital_wallet'; channel: string; referenceNumber: string; amount: number }
      | { method: 'card'; last4Digits?: string; amount: number }
      | { method: 'comp'; reason: string; amount: number };
    ```
  - Create helper `calculateTenderBalance(tenders: PaymentTender[], grandTotal: number)` to ensure exact total allocation.
- [ ] **Step 2.3: Checkout UI Enhancement**
  - In `BillPaymentMethodPane.tsx`, add a "Split Payment" toggle tab.
  - Render an intuitive tender builder with 1-tap "Fill Remaining Balance" buttons.
  - Enforce 4-digit numeric validation for cashless reference numbers.
- [ ] **Step 2.4: Thermal Receipt Slip Updates**
  - Update `packages/printing/src/escposBuilder.ts` to render each tender line (e.g., `Cash Tendered: ₱500.00`, `GCash [Ref 1234]: ₱1,000.00`).

---

## 🧪 Verification Plan

- [ ] Unit test: Verify `calculateTenderBalance` correctly catches under-allocated and over-allocated amounts.
- [ ] SQL test: Settle a tab via `settle_tab_and_record_payment` with 2 tenders $\rightarrow$ verify 2 rows in `payments` and 1 row in `cash_drawer_transactions`.
- [ ] E2E/Manual test: Complete a multi-tender checkout in Floor POS $\rightarrow$ verify receipt shows tender breakdown $\rightarrow$ verify Checks History displays split details.
