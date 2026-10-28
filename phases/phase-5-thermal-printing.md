# 🖨️ Phase 5: Dedicated Thermal Printing Terminal (Supabase BaaS)

> **Phase:** 05 of 06  
> **Status:** ✅ Complete  
> **Master Spec Reference:** [REQUIREMENTS.md — Section 6](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)  
> **Hardware Architecture:** Dedicated PC connected via USB to an 80mm/58mm thermal paper printer, running `@monks/printing` daemon listening to Supabase Realtime CDC on `print_jobs`.

---

## 🎯 Scope of Work

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Printer Station Listener (print_jobs CDC)                           │
│    • Real-time listener on 'print_jobs' table where status = 'PENDING' │
│    • Guaranteed delivery: missed jobs print automatically on reconnect │
│    • Live visual job feed (Queued, Printing, Completed, Failed)        │
│    • Manual reprint action from history list                           │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Two-Print Operational Workflow                                      │
│    • Job A: Order Dispatch Slip (Runner Chit / Delivery Tag)           │
│      -> Auto-enqueued into 'print_jobs' upon staff tapping Send Order  │
│    • Job B: Customer Payment Receipt                                   │
│      -> Auto-enqueued into 'print_jobs' upon bill settlement           │
├────────────────────────────────────────────────────────────────────────┤
│ 3. ESC/POS Hardware & WebUSB Integration                               │
│    • Leverage @monks/printing package for raw ESC/POS byte rendering   │
│    • Updates print_jobs status to 'COMPLETED' upon successful print    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Implementation Checklist

### Step 5.1: Printer Terminal Daemon & Screen

- [x] Target file: `packages/printing/src/daemon.ts` & `frontend/src/features/printer/presentation/PrinterTerminalScreen.tsx`
- [x] Subscribes to Supabase Realtime:
  ```ts
  supabase
    .channel('printer-station')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'print_jobs', filter: 'status=eq.PENDING' },
      async (payload) => {
        try {
          await supabase.from('print_jobs').update({ status: 'PRINTING' }).eq('id', payload.new.id);
          await printTicket(payload.new);

          // Auto-kick cash drawer on cash settlement
          if (
            payload.new.job_type === 'CUSTOMER_RECEIPT' &&
            payload.new.receipt_data?.paymentMethod === 'CASH'
          ) {
            await kickCashDrawer();
          }

          await supabase
            .from('print_jobs')
            .update({
              status: 'COMPLETED',
              printed_at: new Date().toISOString(),
            })
            .eq('id', payload.new.id);
        } catch (err) {
          await supabase
            .from('print_jobs')
            .update({
              status: 'FAILED',
              error_message: String(err),
            })
            .eq('id', payload.new.id);
        }
      }
    )
    .subscribe();
  ```
- [ ] Visual Interface:
  - Status indicator: `🟢 Printer Online (Listening on Supabase CDC)`
  - Active Print Queue: Real-time list of printed tickets with timestamps.
  - One-tap **"Reprint"** button on recent tickets.
  - **"Kick Cash Drawer"** diagnostic test button.

### Step 5.2: Thermal Print Templates

- [x] Implement receipt layouts matching Section 6.2 of `REQUIREMENTS.md`:
  1. **Order Dispatch Slip (Runner Chit):**
     - Printed automatically when Waiter taps **"Send Order"**.
     - Prominent Order # (`#1042`), Table # (`Table 4`), Tab Name (`Guest: John`).
     - Item checklist with checkboxes `[ ]` for tray assembly.
     - Notes: `Extra hot oat milk`.
  2. **Walk-In Takeout Slip:**
     - Header: `*** TAKEOUT / TO-GO ***`.
     - Order `#T-105`, Customer name, to-go cup / bag packaging tag.
  3. **Online Delivery Bag Tag:**
     - Header: `*** ONLINE DELIVERY BAG ***`.
     - Platform: `GRABFOOD` / `FOODPANDA`.
     - Large platform reference: `#GF-8842` or `#FP-3012`.
     - Rider name (`Rider: Mike`), customer name, item count.
  4. **Customer Payment Receipt:**
     - Official branded header (`Monk's Dream Jazz Bar`).
     - Itemized list with prices and subtotals.
     - Tax (10%), discounts, corkage fee, total paid, and payment method (`Card Visa ****1234` or `Cash`).
     - Footer: _"Thank you for jamming!"_

### Step 5.3: ESC/POS Driver & Print Execution

- [x] Utilize [`packages/printing`](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/printing/src/index.ts):
  - In Node/Electron or Linux USB environment: writes ESC/POS buffer directly to `/dev/usb/receipt-printer`.
  - Cash drawer pulse command: `Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])`.
  - In Mock environment: logs structured simulated payloads and executes artificial completion latency.

---

## 🔬 Verification & Validation

| Test Case             | Trigger                             | Expected Outcome                                                            |
| --------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Auto Runner Slip      | Waiter taps "Send Order" on Table 4 | Printer PC outputs Order Dispatch Slip with checklist                       |
| Takeout Tag           | Cashier places Takeout order        | Printer outputs Takeout slip with `#T-105` badge                            |
| Delivery Tag          | Cashier inputs GrabFood `#GF-8842`  | Printer outputs delivery bag tag with large platform ID                     |
| Cash Checkout Receipt | Cashier settles bill with Cash      | Printer outputs customer receipt AND automatically pulses/kicks cash drawer |
| Card Checkout Receipt | Cashier settles bill with Visa      | Printer outputs receipt without cash drawer pulse                           |
