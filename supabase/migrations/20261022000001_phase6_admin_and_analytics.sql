-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Phase 6 Admin Stored Procedures & System Settings
-- Migration: 20261022000001_phase6_admin_and_analytics.sql
-- ==============================================================================

-- 1. Venue System Settings (Operating Mode & Global Overheads)
CREATE TABLE IF NOT EXISTS public.venue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operating_mode public.operating_mode NOT NULL DEFAULT 'CAFE',
  venue_name TEXT NOT NULL DEFAULT 'Monk''s Dream Jazz Bar',
  daily_overhead_cost NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and Realtime
ALTER TABLE public.venue_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'venue_settings' AND policyname = 'Allow public read access on venue_settings'
  ) THEN
    CREATE POLICY "Allow public read access on venue_settings" ON public.venue_settings FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'venue_settings' AND policyname = 'Allow all write on venue_settings'
  ) THEN
    CREATE POLICY "Allow all write on venue_settings" ON public.venue_settings FOR ALL USING (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_settings;

-- Seed default venue settings if empty
INSERT INTO public.venue_settings (id, operating_mode, venue_name, daily_overhead_cost)
VALUES ('00000000-0000-0000-0000-000000000001', 'CAFE', 'Monk''s Dream Jazz Bar', 150.00)
ON CONFLICT (id) DO NOTHING;

-- 2. Atomic Inventory Restock Procedure (Weighted Moving Average Cost - MAC)
CREATE OR REPLACE FUNCTION public.intake_inventory_restock(
  p_inventory_item_id UUID,
  p_quantity NUMERIC,
  p_invoice_unit_cost NUMERIC,
  p_supplier_name TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_new_stock NUMERIC;
  v_new_mac NUMERIC;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Restock quantity must be positive: %', p_quantity;
  END IF;

  SELECT id, name, current_stock, unit_cost
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_item_id;
  END IF;

  v_new_stock := v_item.current_stock + p_quantity;

  -- Weighted Moving Average Cost formula:
  -- MAC_new = ((Stock_old * Cost_old) + (Qty_received * Price_invoice)) / (Stock_old + Qty_received)
  IF v_item.current_stock <= 0 THEN
    v_new_mac := p_invoice_unit_cost;
  ELSE
    v_new_mac := round((((v_item.current_stock * v_item.unit_cost) + (p_quantity * p_invoice_unit_cost)) / v_new_stock)::numeric, 2);
  END IF;

  -- Update inventory item
  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      unit_cost = v_new_mac,
      supplier_name = COALESCE(p_supplier_name, supplier_name),
      updated_at = now()
  WHERE id = p_inventory_item_id;

  -- Clear Auto-86 on affected menu products if stock is now replenished (> min_alert_level)
  UPDATE public.products p
  SET auto_86 = false,
      out_of_stock_reason = NULL,
      updated_at = now()
  WHERE p.auto_86 = true
    AND EXISTS (
      SELECT 1 FROM public.product_ingredients pi
      WHERE pi.product_id = p.id AND pi.inventory_item_id = p_inventory_item_id
    )
    AND NOT EXISTS (
      -- Check if any OTHER ingredient in the BOM is still depleted (<= 0)
      SELECT 1 FROM public.product_ingredients pi2
      JOIN public.inventory_items ii2 ON ii2.id = pi2.inventory_item_id
      WHERE pi2.product_id = p.id AND ii2.current_stock <= 0
    );

  -- Record Immutable Stock Movement Audit
  INSERT INTO public.stock_movements (
    inventory_item_id,
    movement_type,
    change_amount,
    balance_before,
    balance_after,
    reference_id
  ) VALUES (
    p_inventory_item_id,
    'RESTOCK_DELIVERY',
    p_quantity,
    v_item.current_stock,
    v_new_stock,
    COALESCE(p_invoice_number, 'RESTOCK-' || to_char(now(), 'YYYYMMDD-HH24MI'))
  );

  RETURN jsonb_build_object(
    'success', true,
    'itemId', p_inventory_item_id,
    'itemName', v_item.name,
    'oldStock', v_item.current_stock,
    'newStock', v_new_stock,
    'oldMac', v_item.unit_cost,
    'newMac', v_new_mac
  );
END;
$$;

-- 3. Spillage & Waste Logging Procedure
CREATE OR REPLACE FUNCTION public.log_inventory_waste(
  p_inventory_item_id UUID,
  p_quantity NUMERIC,
  p_reason public.waste_reason,
  p_reported_by_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_new_stock NUMERIC;
  v_cost_lost NUMERIC;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Waste quantity must be positive: %', p_quantity;
  END IF;

  SELECT id, name, current_stock, unit_cost
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_item_id;
  END IF;

  v_new_stock := v_item.current_stock - p_quantity;
  v_cost_lost := round((p_quantity * v_item.unit_cost)::numeric, 2);

  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      updated_at = now()
  WHERE id = p_inventory_item_id;

  -- Record in waste logs
  INSERT INTO public.waste_logs (
    inventory_item_id,
    quantity,
    cost_lost,
    reason,
    reported_by_id
  ) VALUES (
    p_inventory_item_id,
    p_quantity,
    v_cost_lost,
    p_reason,
    p_reported_by_id
  );

  -- Record in stock movements
  INSERT INTO public.stock_movements (
    inventory_item_id,
    movement_type,
    change_amount,
    balance_before,
    balance_after,
    reference_id
  ) VALUES (
    p_inventory_item_id,
    'SPOILAGE_WASTE',
    -p_quantity,
    v_item.current_stock,
    v_new_stock,
    p_reason::text
  );

  -- Auto-86 check
  IF v_new_stock <= 0 THEN
    UPDATE public.products p
    SET auto_86 = true,
        out_of_stock_reason = 'Recipe Ingredient Depleted (Waste)',
        updated_at = now()
    WHERE EXISTS (
      SELECT 1 FROM public.product_ingredients pi
      WHERE pi.product_id = p.id AND pi.inventory_item_id = p_inventory_item_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'itemId', p_inventory_item_id,
    'itemName', v_item.name,
    'costLost', v_cost_lost,
    'remainingStock', v_new_stock
  );
END;
$$;
