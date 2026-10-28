-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Auto-Enqueue Thermal Print Jobs on Order Dispatch
-- Migration: 20261021000001_auto_enqueue_print_jobs_on_dispatch.sql
-- ==============================================================================

-- Updates dispatch_order_with_depletion to automatically enqueue a 'RUNNER_CHIT'
-- into public.print_jobs so the thermal printer outputs an expediter tray assembly
-- checklist without relying on frontend network persistence.

CREATE OR REPLACE FUNCTION public.dispatch_order_with_depletion(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_tab RECORD;
  v_table RECORD;
  v_item RECORD;
  v_ing RECORD;
  v_current_stock NUMERIC;
  v_balance_before NUMERIC;
  v_depleted_count INTEGER := 0;
  v_items_json JSONB := '[]'::jsonb;
  v_chit_data JSONB;
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
    SELECT table_number INTO v_table FROM public.tables WHERE id = v_tab.table_id;
  END IF;

  -- 2. Ensure order remains OPEN while dispatched to stations
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
    -- Mark item as depleted but preserve PENDING status so it lands in KDS 'NEW' column
    UPDATE public.order_items
    SET status = 'PENDING', is_depleted = true, updated_at = now()
    WHERE id = v_item.order_item_id;

    -- Aggregate for print chit
    v_items_json := v_items_json || jsonb_build_object(
      'name', v_item.product_name,
      'quantity', v_item.quantity,
      'station', 'station:' || v_item.station_target::text,
      'notes', v_item.notes
    );

    -- Deduct Recipe BOM ingredients
    FOR v_ing IN
      SELECT inventory_item_id, amount, conversion_factor
      FROM public.product_ingredients
      WHERE product_id = v_item.product_id
    LOOP
      -- Lock inventory row for update
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_ing.inventory_item_id
      FOR UPDATE;

      -- Calculate and deduct stock
      UPDATE public.inventory_items
      SET current_stock = current_stock - (v_ing.amount * v_item.quantity * v_ing.conversion_factor),
          updated_at = now()
      WHERE id = v_ing.inventory_item_id
      RETURNING current_stock INTO v_current_stock;

      -- Record Immutable Stock Movement Audit
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
        -(v_ing.amount * v_item.quantity * v_ing.conversion_factor),
        v_balance_before,
        v_current_stock,
        p_order_id::text
      );

      -- Auto-86 Check: Disable product if ingredient stock drops to 0 or below
      IF v_current_stock <= 0 THEN
        UPDATE public.products
        SET auto_86 = true,
            out_of_stock_reason = 'Recipe Ingredient Depleted',
            updated_at = now()
        WHERE id = v_item.product_id;
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
      'tableNumber', CASE WHEN v_table.table_number IS NOT NULL THEN (regexp_replace(v_table.table_number, '[^0-9]', '', 'g'))::integer ELSE NULL END,
      'tabName', v_tab.customer_name,
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
    'itemsDepleted', v_depleted_count,
    'chitEnqueued', (jsonb_array_length(v_items_json) > 0)
  );
END;
$$;
