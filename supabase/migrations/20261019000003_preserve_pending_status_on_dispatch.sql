-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Preserve PENDING Item Status on Dispatch Migration
-- Migration: 20261019000003_preserve_pending_status_on_dispatch.sql
-- ==============================================================================

-- When an order is dispatched from Floor POS, recipe ingredients are depleted,
-- but item status remains PENDING so it correctly appears in the "NEW" column
-- of KDS stations until kitchen/bar staff click "Start" (which sets PREPARING).
CREATE OR REPLACE FUNCTION public.dispatch_order_with_depletion(p_order_id UUID)
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
  v_depleted_count INTEGER := 0;
BEGIN
  -- 1. Ensure order remains OPEN while dispatched to stations
  UPDATE public.orders
  SET status = 'OPEN', updated_at = now()
  WHERE id = p_order_id;

  -- 2. Iterate each item in order to deplete ingredients without altering PENDING status
  FOR v_item IN 
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, p.name AS product_name
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id AND oi.is_depleted = false
  LOOP
    -- Mark item as depleted but preserve PENDING status so it lands in KDS 'NEW' column
    UPDATE public.order_items
    SET status = 'PENDING', is_depleted = true, updated_at = now()
    WHERE id = v_item.order_item_id;

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

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'itemsDepleted', v_depleted_count
  );
END;
$$;
