# 📱 Phase 3: Station KDS UIs & FOH Buzzout Device (Tablets Only)

> **Phase:** 03 of 06  
> **Status:** 📋 Planned (Depends on Phase 2)  
> **Master Spec Reference:** [REQUIREMENTS.md — Section 2, 3.3 & 3.4](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md)  
> **Hardware Constraint:** Role-authenticated touchscreen tablets only. **Strictly zero overhead TVs, wall monitors, or public customer queue screens.**

---

## 🎯 Scope of Work

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Barista / Bartender Tablet KDS (station_bar)                        │
│    • Real-time queue for Coffee, Cocktails, Wine, Mocktails            │
│    • Dine-In, Takeout (#T-105) & Delivery (Grab/Foodpanda) badges      │
│    • Touch lifecycle: Pending -> Accept (Preparing) -> Done (Ready)   │
│    • Live table transfer re-routing visual alert banner                │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Kitchen Chef Tablet KDS (station_food)                              │
│    • Real-time queue for Pasta, Pizza, Kitchen Mains                   │
│    • High-contrast Allergen Warning Banners (⚠️ DAIRY, GLUTEN, etc.)   │
│    • Modifiers, prep notes, and packaging indicators                   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. FOH Runner Expediter Buzzout Device (foh_runner)                    │
│    • Dedicated tablet at staging pass tracking multi-station tickets   │
│    • Multi-station matching: chimes when ALL items for a tab are Done  │
│    • Visual & audio chime for tray assembly & delivery                 │
│    • Single-tap "Mark Served" handoff button                           │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Role-Based Screen Router in App.tsx                                 │
│    • Auto-routes user based on PIN login role                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Implementation Checklist

### Step 3.1: Barista / Bartender Tablet KDS Screen
- [ ] Target file: `frontend/src/components/kds/BaristaKdsScreen.tsx`
- [ ] Role filter: User role `station_bar` or `bartender` / `barista`.
- [ ] Visual Ticket Structure:
  - Header badge: `[ 🍽️ Table 4 — Guest: Miles ]`, `[ 🛍️ Takeout #T-105 — Sarah ]`, or `[ 🛵 GrabFood #GF-8842 — Rider: Mike ]`.
  - Elapsed timer: Green (<5m) $\to$ Amber (5-10m) $\to$ Red Flashing (>10m).
  - Item List: Line item names, quantities, modifiers (e.g. `Extra Shot`, `Oat Milk Swap`).
- [ ] Touch Actions:
  - **"Accept"** button: Moves ticket to `PREPARING` (card turns yellow/orange).
  - **"Done"** button: Moves ticket to `READY` (notifies FOH expediter).
- [ ] Transfer Alert Component:
  - Listens for `order:table_transferred`.
  - Flashes prominent banner on ticket: `🔁 RE-ROUTED: Table 2 ➔ Table 5 (Guest: Miles)`.

### Step 3.2: Kitchen Chef Tablet KDS Screen
- [ ] Target file: `frontend/src/components/kds/KitchenKdsScreen.tsx`
- [ ] Role filter: User role `station_food` or kitchen staff (Chef Chet).
- [ ] Station isolation: Only displays food items (`station_target === 'kitchen'`).
- [ ] Allergen Warnings:
  - Prominent red alert header on cards with allergen flags: `⚠️ ALLERGY WARNING: GLUTEN / DAIRY / PEANUTS`.
- [ ] Preparation Notes:
  - Special instructions prominently highlighted (e.g. `No parmesan`, `Extra crispy`).
- [ ] Accept $\to$ Done touch interaction matching the barista screen.

### Step 3.3: FOH Runner / Expediter Buzzout Device
- [ ] Target file: `frontend/src/components/kds/FohRunnerScreen.tsx`
- [ ] Role filter: User role `foh_runner` (Expediter Max).
- [ ] Multi-Station Aggregation:
  - Displays combined status for each active tab / bag across Bar and Kitchen.
  - Progress bar: `2 / 3 Items Ready (1x Coffee Done, 1x Pasta Done, 1x Pizza Preparing)`.
- [ ] **Buzzout Alert (Order Ready):**
  - When all items for a tab or delivery order reach `READY`:
    - Full-card highlight pulse (Emerald green).
    - Audio chime triggers: 🔔 *"Order #1042 ready for Table 4 (Guest: John)"*.
- [ ] Runner Verification & Handoff:
  - Runner verifies items on physical tray against checklist.
  - Taps **"Mark Served"** (Dine-In) or **"Handed Off to Rider"** (Delivery).

### Step 3.4: Dynamic Role Router in App Entry
- [ ] Target file: [frontend/App.tsx](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/frontend/App.tsx)
- [ ] Replace static `WaiterCashierScreen` with role-aware dispatcher:
  ```tsx
  switch (currentUser.role) {
    case 'cashier_waiter':
    case 'waiter':
    case 'cashier':
      return <WaiterCashierScreen />;
    case 'station_bar':
    case 'barista':
    case 'bartender':
      return <BaristaKdsScreen />;
    case 'station_food':
    case 'kitchen':
      return <KitchenKdsScreen />;
    case 'foh_runner':
      return <FohRunnerScreen />;
    case 'printer_station':
      return <PrinterTerminalScreen />;
    case 'admin':
      return <AdminDashboardScreen />;
    default:
      return <WaiterCashierScreen />;
  }
  ```

---

## 🔬 Verification & Validation

| Test Scenario | Action | Expected Result |
|---|---|---|
| Role Sign-in Routing | Login with Chet (`5555`) | Directly displays `KitchenKdsScreen` |
| Role Sign-in Routing | Login with Bill (`4444`) | Directly displays `BaristaKdsScreen` |
| Role Sign-in Routing | Login with Max (`6666`) | Directly displays `FohRunnerScreen` |
| Buzzout Alert | Mark last remaining item "Done" | FOH Runner device triggers audio chime and visual green alert |
| Re-route Notification | Execute table transfer | Active ticket updates destination table badge without resetting timer |
