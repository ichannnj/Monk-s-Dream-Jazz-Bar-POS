-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Real-Time Recipe Depletion on KDS Ready
-- Migration: 20261106000005_inventory_deplete_on_kds_ready.sql
-- Description:
--   1. Implements trigger `trg_deplete_inventory_on_item_ready` on `public.order_items`.
--      Decrements recipe ingredients from `public.inventory_items` when an item is
--      marked READY or SERVED in KDS (and was not previously depleted).
--   2. Updates `dispatch_order_with_depletion` to preserve `is_depleted = false`
--      at order dispatch time, enqueuing the runner chit while deferring stock
--      deduction until the ticket/item is completed and marked READY in KDS.
--   3. Provides helper RPC `mark_order_items_ready(p_item_ids UUID[])`.
-- ==============================================================================

-- 1. Trigger function: Deplete inventory ingredients when order item reaches READY or SERVED
CREATE OR REPLACE FUNCTION public.fn_deplete_inventory_on_item_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing RECORD;
  v_balance_before NUMERIC;
  v_current_stock NUMERIC;
  v_deduction NUMERIC;
BEGIN
  -- Only deplete when transitioning to READY or SERVED and not already depleted
  IF (NEW.status IN ('READY', 'SERVED') 
      AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('READY', 'SERVED')) 
      AND NEW.is_depleted = false) THEN

    FOR v_ing IN
      SELECT 
        pi.inventory_item_id, 
        pi.amount, 
        pi.conversion_factor,
        ii.current_stock AS stock_now
      FROM public.product_ingredients pi
      JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
      WHERE pi.product_id = NEW.product_id
    LOOP
      -- Lock inventory row for ACID-compliant concurrency
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_ing.inventory_item_id
      FOR UPDATE;

      IF FOUND THEN
        v_deduction := (v_ing.amount * NEW.quantity * v_ing.conversion_factor);
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
          NEW.order_id::text
        );
      END IF;
    END LOOP;

    NEW.is_depleted := true;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Bind trigger to order_items
DROP TRIGGER IF EXISTS trg_deplete_inventory_on_item_ready ON public.order_items;

CREATE TRIGGER trg_deplete_inventory_on_item_ready
BEFORE INSERT OR UPDATE OF status ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_deplete_inventory_on_item_ready();

-- 3. Update dispatch_order_with_depletion:
--    Keep order OPEN, enqueue Runner Chit, but leave is_depleted = false
--    so that depletion happens when KDS marks the item/ticket READY.
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
  v_items_json JSONB := '[]'::jsonb;
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

  -- 3. Build items json for thermal print chit, leaving items pending/preparing (depletion occurs on KDS ready)
  FOR v_item IN 
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, oi.station_target, oi.notes, p.name AS product_name
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
  LOOP
    v_items_json := v_items_json || jsonb_build_object(
      'productName', v_item.product_name,
      'quantity', v_item.quantity,
      'stationTarget', v_item.station_target,
      'notes', COALESCE(v_item.notes, '')
    );
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
    'status', 'OPEN',
    'printJobQueued', (jsonb_array_length(v_items_json) > 0)
  );
END;
$$;

-- 4. Stored Procedure: Mark order items ready in batch (triggers fn_deplete_inventory_on_item_ready)
CREATE OR REPLACE FUNCTION public.mark_order_items_ready(p_item_ids UUID[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  UPDATE public.order_items
  SET status = 'READY', updated_at = now()
  WHERE id = ANY(p_item_ids) 
    AND status <> 'CANCELLED';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updatedCount', v_updated_count
  );
END;
$$;

-- 5. Ensure publications include inventory tables for live updates
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
END;
$$;
