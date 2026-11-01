-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Admin Back-Office Expansion Migration
-- Migration: 20261030000001_admin_catalog_and_inventory_expansion.sql
-- ==============================================================================

-- 1. Suppliers Directory
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Allow public read access on suppliers'
  ) THEN
    CREATE POLICY "Allow public read access on suppliers" ON public.suppliers FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Allow all write on suppliers'
  ) THEN
    CREATE POLICY "Allow all write on suppliers" ON public.suppliers FOR ALL USING (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;

-- Add supplier_id to inventory_items
ALTER TABLE public.inventory_items 
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier_id ON public.inventory_items(supplier_id);

-- 2. Hierarchical Reusable Modifier Groups
CREATE TABLE IF NOT EXISTS public.modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE, -- NULL indicates global/reusable group
  min_selections INTEGER NOT NULL DEFAULT 0,
  max_selections INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'modifier_groups' AND policyname = 'Allow public read access on modifier_groups'
  ) THEN
    CREATE POLICY "Allow public read access on modifier_groups" ON public.modifier_groups FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'modifier_groups' AND policyname = 'Allow all write on modifier_groups'
  ) THEN
    CREATE POLICY "Allow all write on modifier_groups" ON public.modifier_groups FOR ALL USING (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.modifier_groups;

-- 3. Upgrade product_modifiers with group link and inventory deltas
ALTER TABLE public.product_modifiers
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_delta NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN IF NOT EXISTS unit TEXT;

CREATE INDEX IF NOT EXISTS idx_product_modifiers_group_id ON public.product_modifiers(group_id);
CREATE INDEX IF NOT EXISTS idx_product_modifiers_inventory_item_id ON public.product_modifiers(inventory_item_id);

-- 4. Physical Stocktake & Cycle Count Variance Auditing
CREATE TABLE IF NOT EXISTS public.stocktake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conducted_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  total_variance_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stocktake_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stocktake_sessions' AND policyname = 'Allow public read on stocktake_sessions'
  ) THEN
    CREATE POLICY "Allow public read on stocktake_sessions" ON public.stocktake_sessions FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stocktake_sessions' AND policyname = 'Allow all write on stocktake_sessions'
  ) THEN
    CREATE POLICY "Allow all write on stocktake_sessions" ON public.stocktake_sessions FOR ALL USING (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.stocktake_sessions;

CREATE TABLE IF NOT EXISTS public.stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.stocktake_sessions(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  expected_quantity NUMERIC(12, 3) NOT NULL,
  actual_quantity NUMERIC(12, 3) NOT NULL,
  variance_quantity NUMERIC(12, 3) NOT NULL,
  unit_cost NUMERIC(10, 2) NOT NULL,
  variance_cost NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stocktake_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stocktake_items' AND policyname = 'Allow public read on stocktake_items'
  ) THEN
    CREATE POLICY "Allow public read on stocktake_items" ON public.stocktake_items FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stocktake_items' AND policyname = 'Allow all write on stocktake_items'
  ) THEN
    CREATE POLICY "Allow all write on stocktake_items" ON public.stocktake_items FOR ALL USING (true);
  END IF;
END $$;

-- 5. Stored Procedure: Submit Stocktake Count & Apply Adjustments Atomically
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
  -- Create session header
  INSERT INTO public.stocktake_sessions (conducted_by_id, notes, status, total_variance_cost)
  VALUES (p_conducted_by_id, p_notes, 'COMPLETED', 0.00)
  RETURNING id INTO v_session_id;

  -- Process each counted item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    inventory_item_id UUID,
    expected_quantity NUMERIC,
    actual_quantity NUMERIC,
    unit_cost NUMERIC
  )
  LOOP
    v_item_id := v_item.inventory_item_id;
    v_expected := v_item.expected_quantity;
    v_actual := v_item.actual_quantity;
    v_unit_cost := v_item.unit_cost;
    v_variance_qty := v_actual - v_expected;
    v_variance_cost := v_variance_qty * v_unit_cost;
    v_total_variance_cost := v_total_variance_cost + v_variance_cost;

    -- Insert detail line
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

    -- Update inventory stock
    UPDATE public.inventory_items
    SET current_stock = v_actual,
        updated_at = now()
    WHERE id = v_item_id;

    -- Record immutable stock movement ledger entry if variance exists
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

  -- Update total variance on session
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

-- 6. Venue Settings Enhancements for Phase B Configurations
ALTER TABLE public.venue_settings 
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
  ADD COLUMN IF NOT EXISTS vat_inclusive BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS service_charge_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS discounts_config JSONB NOT NULL DEFAULT '{"senior_pwd_percent": 20, "musician_comp_percent": 100, "staff_discount_percent": 50}'::jsonb,
  ADD COLUMN IF NOT EXISTS printer_routing_config JSONB NOT NULL DEFAULT '{"bar_printer_ip": "", "kitchen_printer_ip": "", "runner_printer_ip": ""}'::jsonb;

-- 7. Seed Sample Suppliers
INSERT INTO public.suppliers (id, name, contact_person, phone, email, address, lead_time_days, notes)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Manila Artisan Roasters Co.', 'Marco Santos', '+63 917 555 1021', 'orders@manilaroasters.ph', 'Makati City, Metro Manila', 2, 'Specialty single-origin beans and espresso blends'),
  ('10000000-0000-0000-0000-000000000002', 'Luzon Beverage & Spirits Imports', 'Elena Rodriguez', '+63 918 555 8820', 'sales@luzonbeverage.com', 'Taguig City, BGC', 3, 'Premium bourbon, gin, scotch, and craft vermouths'),
  ('10000000-0000-0000-0000-000000000003', 'Hacienda Dairy & Fresh Farms', 'Ramon Aquino', '+63 920 555 3341', 'delivery@haciendafresh.ph', 'Batangas Province', 1, 'Fresh whole milk, oat milk, farm eggs, and cream'),
  ('10000000-0000-0000-0000-000000000004', 'EcoPack Disposables Philippines', 'Carla Dizon', '+63 922 555 9901', 'support@ecopack.ph', 'Quezon City', 2, 'Kraft to-go boxes, biodegradable 8oz/12oz/16oz cups and sleeves')
ON CONFLICT (name) DO NOTHING;

-- Link existing sample inventory items to suppliers
UPDATE public.inventory_items 
SET supplier_id = '10000000-0000-0000-0000-000000000001'
WHERE category = 'COFFEE_TEA' AND supplier_id IS NULL;

UPDATE public.inventory_items 
SET supplier_id = '10000000-0000-0000-0000-000000000002'
WHERE category IN ('SPIRITS_LIQUOR', 'WINE_BEER', 'SYRUPS_MIXERS') AND supplier_id IS NULL;

UPDATE public.inventory_items 
SET supplier_id = '10000000-0000-0000-0000-000000000003'
WHERE category IN ('DAIRY_PLANT', 'PRODUCE', 'KITCHEN_MEAT') AND supplier_id IS NULL;

UPDATE public.inventory_items 
SET supplier_id = '10000000-0000-0000-0000-000000000004'
WHERE category = 'PACKAGING' AND supplier_id IS NULL;

-- 8. Seed Default Global Modifier Groups
INSERT INTO public.modifier_groups (id, name, product_id, min_selections, max_selections, is_required, sort_order)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Milk Selection', NULL, 0, 1, false, 1),
  ('20000000-0000-0000-0000-000000000002', 'Extra Espresso Shot', NULL, 0, 2, false, 2),
  ('20000000-0000-0000-0000-000000000003', 'Kitchen & Food Add-ons', NULL, 0, 2, false, 3)
ON CONFLICT (id) DO NOTHING;

-- Seed Modifier Options with Inventory Linkage
INSERT INTO public.product_modifiers (id, product_id, group_id, name, price_delta, inventory_item_id, amount_delta, unit)
VALUES
  ('30000000-0000-0000-0000-000000000001', NULL, '20000000-0000-0000-0000-000000000001', 'Barista Oat Milk', 50.00, 'b1000003-0000-0000-0000-000000000003', 0.200, 'L'),
  ('30000000-0000-0000-0000-000000000002', NULL, '20000000-0000-0000-0000-000000000001', 'Whole Dairy Milk', 0.00, 'b1000004-0000-0000-0000-000000000004', 0.200, 'L'),
  ('30000000-0000-0000-0000-000000000003', NULL, '20000000-0000-0000-0000-000000000002', 'Single Origin Shot', 60.00, 'b1000002-0000-0000-0000-000000000002', 0.018, 'kg'),
  ('30000000-0000-0000-0000-000000000004', NULL, '20000000-0000-0000-0000-000000000002', 'House Espresso Shot', 40.00, 'b1000001-0000-0000-0000-000000000001', 0.018, 'kg'),
  ('30000000-0000-0000-0000-000000000005', NULL, '20000000-0000-0000-0000-000000000003', 'Extra Truffle Drizzle', 80.00, 'b1000017-0000-0000-0000-000000000017', 0.005, 'L'),
  ('30000000-0000-0000-0000-000000000006', NULL, '20000000-0000-0000-0000-000000000003', 'Farm Fresh Egg', 35.00, 'b1000015-0000-0000-0000-000000000015', 1.000, 'pcs')
ON CONFLICT (id) DO NOTHING;

