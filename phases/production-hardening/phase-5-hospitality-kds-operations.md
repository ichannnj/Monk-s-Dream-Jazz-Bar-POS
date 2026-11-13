# 🍽️ Phase 5: Hospitality KDS Operations ('Hold & Fire' + Recall)

> **Status:** Pending Execution  
> **Target:** Seamless pacing for jazz lounge multi-course dining and instant mistake-recovery on high-speed KDS tablets.

---

## 🎯 Objectives

1. Introduce course pacing: Allow waitstaff to place kitchen food on "Hold" during order entry while letting beverages dispatch to the Bar KDS immediately.
2. Provide a 1-tap "🔥 FIRE ALL HELD" or per-item "FIRE" action on Floor POS and Kitchen KDS.
3. Add a 15-second floating "Undo Bump" action when bumping tickets on KDS, plus a "Recently Completed" drawer with a 1-tap "Recall to Board" button.
4. Trigger distinct audio notification chimes on Kitchen and Bar KDS when rush items are fired or created.

---

## 🛠️ Implementation Checklist

- [ ] **Step 5.1: Database Migration**
  - Create `supabase/migrations/20261114000002_order_item_course_timing.sql`:
    - Add `is_held BOOLEAN NOT NULL DEFAULT false` and `held_at TIMESTAMPTZ` to `public.order_items`.
    - Create RPC `fire_held_order_items(p_item_ids UUID[])`:
      - Updates `is_held = false` and sets `status = 'IN_PREPARATION'`.
      - Emits a broadcast alert `pos_sync_broadcast: 'order_items_fired'`.
- [ ] **Step 5.2: Cart UI & Hold Controls**
  - Update `frontend/src/features/floor/presentation/components/OrderCartSheet.tsx`:
    - Add a toggle pill per item: `Active` vs `⏸️ Hold`.
    - Add a 1-tap header action: `Hold All Food`.
- [ ] **Step 5.3: KDS Board Enhancements**
  - In `KitchenKdsScreen.tsx` and `BaristaKdsScreen.tsx`:
    - Render held items in a visually distinct amber "PAUSED / ON HOLD" section with a "🔥 FIRE NOW" button.
    - Implement a 15-second "Undo Bump" banner after tapping `READY` or `SERVED`.
    - Add a "Recall" action in the KDS Checks drawer that reverts an item's status back to `PREPARING`.
- [ ] **Step 5.4: Station Audio Alerts**
  - Use the Web Audio API synthesizer to fire an audible chime when new rush items arrive or are fired.

---

## 🧪 Verification Plan

- [ ] Unit test: Verify `fire_held_order_items` updates item states and triggers realtime notifications.
- [ ] Manual test: Send 1 coffee and 1 steak (held) $\rightarrow$ verify coffee starts preparing on Bar KDS while steak displays as Held on Kitchen KDS $\rightarrow$ click "Fire" on table $\rightarrow$ verify steak moves to active preparation.
- [ ] Bump test: Tap "READY" on a kitchen ticket $\rightarrow$ tap "Undo" within 15 seconds $\rightarrow$ verify item returns to active board.
