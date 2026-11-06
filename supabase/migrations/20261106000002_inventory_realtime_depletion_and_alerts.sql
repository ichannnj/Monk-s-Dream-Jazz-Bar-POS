-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Real-Time Recipe Depletion, Low-Stock Alerts, 
-- and Non-Blocking Inventory Engine
-- Migration: 20261106000002_inventory_realtime_depletion_and_alerts.sql
-- ==============================================================================

-- 1. Ensure all products are available and unblocked (remove ghost auto-86 flags)
UPDATE public.products
SET auto_86 = false,
    out_of_stock_reason = NULL,
    updated_at = now()
WHERE auto_86 = true;

-- 2. Seed Missing Recipe BOMs for 100% Active Menu Product Coverage
-- Blue Note Espresso Martini
INSERT INTO public.product_ingredients (product_id, inventory_item_id, amount, unit, conversion_factor)
VALUES 
  ('e2222222-0000-0000-0000-000000000002', 'b1000009-0000-0000-0000-000000000009', 0.0600, 'pcs', 1.000000), -- Premium Vodka (~45ml)
  ('e2222222-0000-0000-0000-000000000002', 'b1000010-0000-0000-0000-000000000010', 0.0400, 'pcs', 1.000000), -- Kahlua Coffee Liqueur (~30ml)
  ('e2222222-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000001', 0.0180, 'kg', 1.000000)   -- Specialty Espresso Bean
ON CONFLICT (product_id, inventory_item_id) DO UPDATE 
SET amount = EXCLUDED.amount, unit = EXCLUDED.unit;

-- Miles Davis Sazerac
INSERT INTO public.product_ingredients (product_id, inventory_item_id, amount, unit, conversion_factor)
VALUES 
  ('e2222222-0000-0000-0000-000000000003', 'b1000008-0000-0000-0000-000000000008', 0.0650, 'pcs', 1.000000), -- Rye Whiskey (~50ml)
  ('e2222222-0000-0000-0000-000000000003', 'b1000011-0000-0000-0000-000000000011', 0.0100, 'pcs', 1.000000), -- Absinthe Verte rinse
  ('e2222222-0000-0000-0000-000000000003', 'b1000012-0000-0000-0000-000000000012', 0.0100, 'pcs', 1.000000)  -- Peychauds Bitters
ON CONFLICT (product_id, inventory_item_id) DO UPDATE 
SET amount = EXCLUDED.amount, unit = EXCLUDED.unit;

-- Margherita Pizza
INSERT INTO public.product_ingredients (product_id, inventory_item_id, amount, unit, conversion_factor)
VALUES 
  ('e3333333-0000-0000-0000-000000000002', 'b1000018-0000-0000-0000-000000000018', 1.0000, 'pcs', 1.000000), -- Artisan Pizza Dough Ball
  ('e3333333-0000-0000-0000-000000000002', 'b1000019-0000-0000-0000-000000000019', 0.1200, 'kg', 1.000000),  -- San Marzano Tomato Sauce
  ('e3333333-0000-0000-0000-000000000002', 'b1000020-0000-0000-0000-000000000020', 0.1200, 'kg', 1.000000)   -- Fresh Mozzarella Di Bufala
ON CONFLICT (product_id, inventory_item_id) DO UPDATE 
SET amount = EXCLUDED.amount, unit = EXCLUDED.unit;

-- Guanciale Panini
INSERT INTO public.product_ingredients (product_id, inventory_item_id, amount, unit, conversion_factor)
VALUES 
  ('e3333333-0000-0000-0000-000000000003', 'b1000021-0000-0000-0000-000000000021', 1.0000, 'pcs', 1.000000), -- Artisan Ciabatta Bun
  ('e3333333-0000-0000-0000-000000000003', 'b1000013-0000-0000-0000-000000000013', 0.0800, 'kg', 1.000000),  -- Cured Guanciale
  ('e3333333-0000-0000-0000-000000000003', 'b1000022-0000-0000-0000-000000000022', 0.0500, 'kg', 1.000000),  -- Provolone Cheese
  ('e3333333-0000-0000-0000-000000000003', 'b1000023-0000-0000-0000-000000000023', 0.0200, 'kg', 1.000000)   -- Fresh Arugula
ON CONFLICT (product_id, inventory_item_id) DO UPDATE 
SET amount = EXCLUDED.amount, unit = EXCLUDED.unit;

-- 3. Non-Blocking Real-Time Depletion Engine
-- Decrements recipe stocks accurately, allows negative inventory, tracks alerts, NEVER blocks orders
CREATE OR REPLACE FUNCTION public.dispatch_order_with_depletion(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_tab RECORD;
  v_table_number TEXT := NULL;
  v_item RECORD;
  v_ing RECORD;
  v_current_stock NUMERIC;
  v_balance_before NUMERIC;
  v_deduction NUMERIC;
  v_depleted_count INTEGER := 0;
  v_items_json JSONB := '[]'::jsonb;
  v_low_stock_alerts JSONB := '[]'::jsonb;
  v_chit_data JSONB;
  v_staff_name TEXT := 'Staff';
BEGIN
  -- 1. Lock Order and retrieve associated Tab info
  SELECT o.id, o.tab_id, o.order_number, o.order_type, o.round_number
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT t.id, t.table_id, t.customer_name, t.opened_by_id
  INTO v_tab
  FROM public.tabs t
  WHERE t.id = v_order.tab_id;

  IF v_tab.table_id IS NOT NULL THEN
    SELECT table_number INTO v_table_number FROM public.tables WHERE id = v_tab.table_id;
  END IF;

  IF v_tab.opened_by_id IS NOT NULL THEN
    SELECT display_name INTO v_staff_name FROM public.users WHERE id = v_tab.opened_by_id;
  END IF;

  -- 2. Ensure order status remains OPEN while dispatched
  UPDATE public.orders
  SET status = 'OPEN', updated_at = now()
  WHERE id = p_order_id;

  -- 3. Iterate each item in order to deplete ingredients without altering PENDING status
  FOR v_item IN 
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, oi.station_target, oi.notes, p.name AS product_name
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id AND oi.is_depleted = false
  LOOP
    UPDATE public.order_items
    SET is_depleted = true, updated_at = now()
    WHERE id = v_item.order_item_id;

    v_items_json := v_items_json || jsonb_build_object(
      'productName', v_item.product_name,
      'quantity', v_item.quantity,
      'stationTarget', v_item.station_target,
      'notes', COALESCE(v_item.notes, '')
    );

    FOR v_ing IN
      SELECT 
        pi.inventory_item_id, 
        pi.amount, 
        pi.conversion_factor,
        ii.name AS ingredient_name,
        ii.unit AS ingredient_unit,
        ii.min_alert_level
      FROM public.product_ingredients pi
      JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
      WHERE pi.product_id = v_item.product_id
    LOOP
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_ing.inventory_item_id
      FOR UPDATE;

      v_deduction := (v_ing.amount * v_item.quantity * v_ing.conversion_factor);
      v_current_stock := v_balance_before - v_deduction;

      UPDATE public.inventory_items
      SET current_stock = v_current_stock, updated_at = now()
      WHERE id = v_ing.inventory_item_id;

      INSERT INTO public.stock_movements (
        inventory_item_id,
        movement_type,
        change_amount,
        balance_before,
        balance_after,
        reference_id
      ) VALUES (
        v_ing.inventory_item_id,
        'SALE_DEPLETION',
        -v_deduction,
        v_balance_before,
        v_current_stock,
        p_order_id::text
      );

      -- Check if low stock threshold or negative stock reached (NON-BLOCKING alert)
      IF v_current_stock <= v_ing.min_alert_level THEN
        v_low_stock_alerts := v_low_stock_alerts || jsonb_build_object(
          'inventoryItemId', v_ing.inventory_item_id,
          'ingredientName', v_ing.ingredient_name,
          'productName', v_item.product_name,
          'currentStock', v_current_stock,
          'minAlertLevel', v_ing.min_alert_level,
          'unit', v_ing.ingredient_unit,
          'isDepleted', (v_current_stock <= 0)
        );
      END IF;
    END LOOP;

    v_depleted_count := v_depleted_count + 1;
  END LOOP;

  -- 4. Atomically enqueue Runner Chit print job for the thermal terminal
  IF jsonb_array_length(v_items_json) > 0 THEN
    v_chit_data := jsonb_build_object(
      'orderId', p_order_id,
      'orderNumber', v_order.order_number,
      'roundNumber', COALESCE(v_order.round_number, 1),
      'tableNumber', CASE WHEN v_table_number IS NOT NULL THEN (regexp_replace(v_table_number, '[^0-9]', '', 'g'))::integer ELSE NULL END,
      'tabName', v_tab.customer_name,
      'waiterName', COALESCE(v_staff_name, 'Staff'),
      'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI'),
      'items', v_items_json
    );

    INSERT INTO public.print_jobs (
      job_type,
      receipt_data,
      status
    ) VALUES (
      'RUNNER_CHIT',
      v_chit_data,
      'PENDING'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'depletedItems', v_depleted_count,
    'lowStockAlerts', v_low_stock_alerts,
    'status', 'OPEN',
    'printJobQueued', (jsonb_array_length(v_items_json) > 0)
  );
END;
$$;

-- 4. Cancel Order Item with Stock Restoral
CREATE OR REPLACE FUNCTION public.cancel_order_item_with_restoral(
  p_order_item_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Cancelled before preparation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_ing RECORD;
  v_current_stock NUMERIC;
  v_balance_before NUMERIC;
  v_restore_amount NUMERIC;
BEGIN
  SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.status, oi.is_depleted
  INTO v_item
  FROM public.order_items oi
  WHERE oi.id = p_order_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
  END IF;

  -- If the item was depleted, restore the inventory
  IF v_item.is_depleted = true THEN
    FOR v_ing IN
      SELECT pi.inventory_item_id, pi.amount, pi.conversion_factor
      FROM public.product_ingredients pi
      WHERE pi.product_id = v_item.product_id
    LOOP
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_ing.inventory_item_id
      FOR UPDATE;

      v_restore_amount := (v_ing.amount * v_item.quantity * v_ing.conversion_factor);
      v_current_stock := v_balance_before + v_restore_amount;

      UPDATE public.inventory_items
      SET current_stock = v_current_stock, updated_at = now()
      WHERE id = v_ing.inventory_item_id;

      INSERT INTO public.stock_movements (
        inventory_item_id,
        movement_type,
        change_amount,
        balance_before,
        balance_after,
        reference_id
      ) VALUES (
        v_ing.inventory_item_id,
        'VOID_RESTORE',
        v_restore_amount,
        v_balance_before,
        v_current_stock,
        'RESTORE-' || substring(p_order_item_id::text from 1 for 8)
      );
    END LOOP;
  END IF;

  UPDATE public.order_items
  SET status = 'CANCELLED',
      is_depleted = false,
      notes = COALESCE(notes, '') || ' [Cancelled: ' || p_reason || ']',
      updated_at = now()
  WHERE id = p_order_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'orderItemId', p_order_item_id,
    'restoredStock', v_item.is_depleted,
    'status', 'CANCELLED'
  );
END;
$$;

-- 5. Quick In-Line Stock Adjust RPC (Admin Inventory Hub)
CREATE OR REPLACE FUNCTION public.admin_quick_adjust_inventory_stock(
  p_inventory_item_id UUID,
  p_new_stock NUMERIC,
  p_reason TEXT DEFAULT 'Manual physical count adjustment',
  p_adjusted_by_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_before NUMERIC;
  v_change_amount NUMERIC;
  v_item RECORD;
BEGIN
  SELECT id, name, unit, current_stock, min_alert_level
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_item_id;
  END IF;

  v_balance_before := v_item.current_stock;
  v_change_amount := p_new_stock - v_balance_before;

  UPDATE public.inventory_items
  SET current_stock = p_new_stock,
      updated_at = now()
  WHERE id = p_inventory_item_id;

  IF v_change_amount <> 0 THEN
    INSERT INTO public.stock_movements (
      inventory_item_id,
      movement_type,
      change_amount,
      balance_before,
      balance_after,
      reference_id
    ) VALUES (
      p_inventory_item_id,
      'MANUAL_ADJUST',
      v_change_amount,
      v_balance_before,
      p_new_stock,
      COALESCE(p_reason, 'Quick Adjustment')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'inventoryItemId', p_inventory_item_id,
    'name', v_item.name,
    'balanceBefore', v_balance_before,
    'balanceAfter', p_new_stock,
    'changeAmount', v_change_amount
  );
END;
$$;

-- 6. Quick Update Par Alert Level RPC (Admin Inventory Hub)
CREATE OR REPLACE FUNCTION public.admin_update_inventory_par_level(
  p_inventory_item_id UUID,
  p_new_par NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  SELECT id, name, unit, current_stock, min_alert_level
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_item_id;
  END IF;

  UPDATE public.inventory_items
  SET min_alert_level = GREATEST(p_new_par, 0),
      updated_at = now()
  WHERE id = p_inventory_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'inventoryItemId', p_inventory_item_id,
    'name', v_item.name,
    'oldParLevel', v_item.min_alert_level,
    'newParLevel', GREATEST(p_new_par, 0)
  );
END;
$$;

-- 7. Ensure Realtime publication includes tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'stock_movements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'product_ingredients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_ingredients;
  END IF;
END $$;
