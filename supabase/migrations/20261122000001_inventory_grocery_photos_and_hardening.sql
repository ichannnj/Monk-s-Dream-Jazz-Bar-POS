-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Inventory Grocery Reference Photos & Logic Hardening
-- Migration: 20261122000001_inventory_grocery_photos_and_hardening.sql
-- ==============================================================================

-- 1. Create dedicated 'inventory-images' storage bucket (5MB limit, JPG/PNG/WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inventory-images',
  'inventory-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Inventory Images'
  ) THEN
    CREATE POLICY "Public Access for Inventory Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'inventory-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Upload Inventory Images'
  ) THEN
    CREATE POLICY "Staff Upload Inventory Images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'inventory-images' AND
      (storage.foldername(name))[1] = 'items'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Update Inventory Images'
  ) THEN
    CREATE POLICY "Staff Update Inventory Images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'inventory-images' AND
      (storage.foldername(name))[1] = 'items'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Delete Inventory Images'
  ) THEN
    CREATE POLICY "Staff Delete Inventory Images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'inventory-images' AND
      (storage.foldername(name))[1] = 'items'
    );
  END IF;
END $$;

-- 2. Extend public.inventory_items with Grocery Reference Photo, Buying Note & Target Stock
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
  ADD COLUMN IF NOT EXISTS reference_image_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS grocery_note TEXT,
  ADD COLUMN IF NOT EXISTS target_stock_level NUMERIC(12, 3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_inventory_items_ref_image_url_http'
      AND conrelid = 'public.inventory_items'::regclass
  ) THEN
    ALTER TABLE public.inventory_items
    ADD CONSTRAINT chk_inventory_items_ref_image_url_http
    CHECK (reference_image_url IS NULL OR reference_image_url ~* '^https?://');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_inventory_items_target_stock_non_negative'
      AND conrelid = 'public.inventory_items'::regclass
  ) THEN
    ALTER TABLE public.inventory_items
    ADD CONSTRAINT chk_inventory_items_target_stock_non_negative
    CHECK (target_stock_level IS NULL OR target_stock_level >= 0);
  END IF;
END $$;

-- 3. Shared Helper: Sync products.auto_86 when an inventory item balance changes
CREATE OR REPLACE FUNCTION public.sync_products_auto_86_for_inventory_item(
  p_inventory_item_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  SELECT id, name, current_stock
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_inventory_item_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_item.current_stock <= 0 THEN
    UPDATE public.products p
    SET auto_86 = true,
        out_of_stock_reason = COALESCE(p.out_of_stock_reason, 'Out of stock: ' || v_item.name),
        updated_at = now()
    WHERE p.auto_86 = false
      AND EXISTS (
        SELECT 1 FROM public.product_ingredients pi
        WHERE pi.product_id = p.id AND pi.inventory_item_id = p_inventory_item_id
      );
  ELSE
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
        SELECT 1 FROM public.product_ingredients pi2
        JOIN public.inventory_items ii2 ON ii2.id = pi2.inventory_item_id
        WHERE pi2.product_id = p.id AND ii2.current_stock <= 0
      );
  END IF;
END;
$$;

-- 4. Harden intake_inventory_restock: validate non-negative unit cost & optional supplier override
CREATE OR REPLACE FUNCTION public.intake_inventory_restock(
  p_inventory_item_id UUID,
  p_quantity NUMERIC,
  p_invoice_unit_cost NUMERIC,
  p_supplier_name TEXT DEFAULT NULL,
  p_invoice_number TEXT DEFAULT NULL,
  p_supplier_id UUID DEFAULT NULL
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
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Restock quantity must be positive: %', p_quantity;
  END IF;

  IF p_invoice_unit_cost IS NULL OR p_invoice_unit_cost < 0 THEN
    RAISE EXCEPTION 'Invoice unit cost cannot be negative: %', p_invoice_unit_cost;
  END IF;

  SELECT id, name, current_stock, unit_cost
  INTO v_item
  FROM public.inventory_items
  WHERE id = p_inventory_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found: %', p_inventory_item_id;
  END IF;

  v_new_stock := GREATEST(v_item.current_stock, 0) + p_quantity;

  -- Weighted Moving Average Cost formula
  IF v_item.current_stock <= 0 THEN
    v_new_mac := round(p_invoice_unit_cost::numeric, 2);
  ELSE
    v_new_mac := round((((v_item.current_stock * v_item.unit_cost) + (p_quantity * p_invoice_unit_cost)) / (v_item.current_stock + p_quantity))::numeric, 2);
  END IF;

  UPDATE public.inventory_items
  SET current_stock = v_new_stock,
      unit_cost = v_new_mac,
      supplier_id = COALESCE(p_supplier_id, supplier_id),
      supplier_name = COALESCE(p_supplier_name, supplier_name),
      updated_at = now()
  WHERE id = p_inventory_item_id;

  PERFORM public.sync_products_auto_86_for_inventory_item(p_inventory_item_id);

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

-- 5. Harden admin_quick_adjust_inventory_stock: enforce >= 0 and sync Auto-86
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
  IF p_new_stock IS NULL OR p_new_stock < 0 THEN
    RAISE EXCEPTION 'Physical stock count cannot be negative: %', p_new_stock;
  END IF;

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

  PERFORM public.sync_products_auto_86_for_inventory_item(p_inventory_item_id);

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

-- 6. Harden submit_stocktake_session: enforce non-negative actuals and sync Auto-86
CREATE OR REPLACE FUNCTION public.submit_stocktake_session(
  p_conducted_by_id UUID,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_item RECORD;
  v_total_variance_cost NUMERIC(12, 2) := 0.00;
  v_item_id UUID;
  v_expected NUMERIC(12, 3);
  v_actual NUMERIC(12, 3);
  v_unit_cost NUMERIC(10, 2);
  v_variance_qty NUMERIC(12, 3);
  v_variance_cost NUMERIC(12, 2);
BEGIN
  INSERT INTO public.stocktake_sessions (conducted_by_id, notes, status, total_variance_cost)
  VALUES (p_conducted_by_id, p_notes, 'COMPLETED', 0.00)
  RETURNING id INTO v_session_id;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    inventory_item_id UUID,
    expected_quantity NUMERIC,
    actual_quantity NUMERIC,
    unit_cost NUMERIC
  )
  LOOP
    v_item_id := v_item.inventory_item_id;
    v_expected := v_item.expected_quantity;
    v_actual := GREATEST(COALESCE(v_item.actual_quantity, 0), 0);
    v_unit_cost := v_item.unit_cost;
    v_variance_qty := v_actual - v_expected;
    v_variance_cost := v_variance_qty * v_unit_cost;
    v_total_variance_cost := v_total_variance_cost + v_variance_cost;

    INSERT INTO public.stocktake_items (
      session_id,
      inventory_item_id,
      expected_quantity,
      actual_quantity,
      variance_quantity,
      unit_cost,
      variance_cost
    ) VALUES (
      v_session_id,
      v_item_id,
      v_expected,
      v_actual,
      v_variance_qty,
      v_unit_cost,
      v_variance_cost
    );

    UPDATE public.inventory_items
    SET current_stock = v_actual,
        updated_at = now()
    WHERE id = v_item_id;

    PERFORM public.sync_products_auto_86_for_inventory_item(v_item_id);

    IF v_variance_qty <> 0 THEN
      INSERT INTO public.stock_movements (
        inventory_item_id,
        movement_type,
        change_amount,
        balance_before,
        balance_after,
        reference_id
      ) VALUES (
        v_item_id,
        'STOCKTAKE_ADJUST',
        v_variance_qty,
        v_expected,
        v_actual,
        'AUDIT-' || substring(v_session_id::text from 1 for 8)
      );
    END IF;
  END LOOP;

  UPDATE public.stocktake_sessions
  SET total_variance_cost = v_total_variance_cost
  WHERE id = v_session_id;

  RETURN jsonb_build_object(
    'sessionId', v_session_id,
    'totalVarianceCost', v_total_variance_cost,
    'status', 'COMPLETED'
  );
END;
$$;
