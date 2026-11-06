-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Add MANUAL_ADJUST to stock_movement_type and update RPCs
-- Migration: 20261106000004_fix_stock_movement_type_enum.sql
-- ==============================================================================

ALTER TYPE public.stock_movement_type ADD VALUE IF NOT EXISTS 'MANUAL_ADJUST';

-- Quick In-Line Stock Adjust RPC using STOCKTAKE_ADJUST
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
      'STOCKTAKE_ADJUST',
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

-- Cancel Order Item with Stock Restoral using CANCEL_RESTORE
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
        'CANCEL_RESTORE',
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

