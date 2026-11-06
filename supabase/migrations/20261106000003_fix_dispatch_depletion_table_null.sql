-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Fix table null assignment in dispatch_order_with_depletion
-- Migration: 20261106000003_fix_dispatch_depletion_table_null.sql
-- ==============================================================================

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

