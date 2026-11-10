-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Product Flavor Variants & Single-Select Options
-- Migration: 20261109000001_product_flavor_variants_and_selections.sql
--
-- Objective:
--   1. Schema for reusable option groups (e.g. 'Flavor') and options ('Classic', 'Spanish', 'Caramel', 'Vanilla')
--   2. Explicit product assignments and per-product price deltas/availability
--   3. Normalized order_item_variant_selections with immutable name and price snapshots
--   4. Flavor-specific additive recipe ingredients (product_variant_option_ingredients)
--   5. Server-authoritative atomic order item dispatch & validation RPC: dispatch_order_with_selections
--   6. Hardened, unified fn_deplete_inventory_on_item_ready() & cancel_order_item_with_restoral()
--      supporting temperature/size variant BOM fallback + additive flavor deltas + modifier deltas
--   7. Update transfer_order_items_to_tab, dispatch chits, and receipt print jobs
--   8. Seed Latte product (if missing), reusable Flavor group, options, assignments, and recipe deltas
-- ==============================================================================

-- 1. TABLES & CONSTRAINTS

-- 1.1 Product Variant Groups (e.g., Flavor)
CREATE TABLE IF NOT EXISTS public.product_variant_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  min_selections SMALLINT NOT NULL DEFAULT 0 CHECK (min_selections >= 0),
  max_selections SMALLINT NOT NULL DEFAULT 1 CHECK (max_selections >= min_selections),
  is_required BOOLEAN NOT NULL DEFAULT false,
  allows_duplicates BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_variant_group_required_min CHECK (NOT is_required OR min_selections >= 1)
);

-- 1.2 Product Variant Options (e.g., Spanish, Caramel, Vanilla)
CREATE TABLE IF NOT EXISTS public.product_variant_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.product_variant_groups(id) ON DELETE RESTRICT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  default_price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_variant_option_group_code UNIQUE (group_id, code)
);

-- 1.3 Product Variant Group Assignments
CREATE TABLE IF NOT EXISTS public.product_variant_group_assignments (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.product_variant_groups(id) ON DELETE RESTRICT,
  min_selections SMALLINT,
  max_selections SMALLINT,
  is_required BOOLEAN,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, group_id)
);

-- 1.4 Product Variant Option Assignments
CREATE TABLE IF NOT EXISTS public.product_variant_option_assignments (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.product_variant_options(id) ON DELETE RESTRICT,
  price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, option_id)
);

-- 1.5 Order Item Variant Selections
CREATE TABLE IF NOT EXISTS public.order_item_variant_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  group_id UUID NOT NULL REFERENCES public.product_variant_groups(id) ON DELETE RESTRICT,
  option_id UUID NOT NULL REFERENCES public.product_variant_options(id) ON DELETE RESTRICT,
  group_name_snapshot TEXT NOT NULL,
  option_name_snapshot TEXT NOT NULL,
  price_delta_snapshot NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_order_item_group UNIQUE (order_item_id, group_id)
);

-- 1.6 Product Variant Option Ingredients (Additive Recipe BOM)
CREATE TABLE IF NOT EXISTS public.product_variant_option_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.product_variant_options(id) ON DELETE RESTRICT,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
  amount NUMERIC(12,4) NOT NULL CHECK (amount > 0),
  unit TEXT NOT NULL,
  conversion_factor NUMERIC(12,6) NOT NULL DEFAULT 1 CHECK (conversion_factor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_prod_opt_ingredient UNIQUE (product_id, option_id, inventory_item_id)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_variant_options_group_id ON public.product_variant_options(group_id);
CREATE INDEX IF NOT EXISTS idx_pvg_assignments_product ON public.product_variant_group_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_pvo_assignments_product ON public.product_variant_option_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_pvo_assignments_option ON public.product_variant_option_assignments(option_id);
CREATE INDEX IF NOT EXISTS idx_oivs_order_item_id ON public.order_item_variant_selections(order_item_id);
CREATE INDEX IF NOT EXISTS idx_oivs_product_id ON public.order_item_variant_selections(product_id);
CREATE INDEX IF NOT EXISTS idx_pvoi_prod_opt ON public.product_variant_option_ingredients(product_id, option_id);
CREATE INDEX IF NOT EXISTS idx_pvoi_inv_item ON public.product_variant_option_ingredients(inventory_item_id);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.product_variant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_option_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_variant_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_option_ingredients ENABLE ROW LEVEL SECURITY;

-- 3.1 Read policies: Allow public/authenticated read access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_groups' AND policyname = 'Allow public read product_variant_groups') THEN
    CREATE POLICY "Allow public read product_variant_groups" ON public.product_variant_groups FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_options' AND policyname = 'Allow public read product_variant_options') THEN
    CREATE POLICY "Allow public read product_variant_options" ON public.product_variant_options FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_group_assignments' AND policyname = 'Allow public read product_variant_group_assignments') THEN
    CREATE POLICY "Allow public read product_variant_group_assignments" ON public.product_variant_group_assignments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_option_assignments' AND policyname = 'Allow public read product_variant_option_assignments') THEN
    CREATE POLICY "Allow public read product_variant_option_assignments" ON public.product_variant_option_assignments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_item_variant_selections' AND policyname = 'Allow public read order_item_variant_selections') THEN
    CREATE POLICY "Allow public read order_item_variant_selections" ON public.order_item_variant_selections FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_option_ingredients' AND policyname = 'Allow public read product_variant_option_ingredients') THEN
    CREATE POLICY "Allow public read product_variant_option_ingredients" ON public.product_variant_option_ingredients FOR SELECT USING (true);
  END IF;
END $$;

-- 3.2 Write policies: Allow all write for operational POS / Back-office services
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_groups' AND policyname = 'Allow all write product_variant_groups') THEN
    CREATE POLICY "Allow all write product_variant_groups" ON public.product_variant_groups FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_options' AND policyname = 'Allow all write product_variant_options') THEN
    CREATE POLICY "Allow all write product_variant_options" ON public.product_variant_options FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_group_assignments' AND policyname = 'Allow all write product_variant_group_assignments') THEN
    CREATE POLICY "Allow all write product_variant_group_assignments" ON public.product_variant_group_assignments FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_option_assignments' AND policyname = 'Allow all write product_variant_option_assignments') THEN
    CREATE POLICY "Allow all write product_variant_option_assignments" ON public.product_variant_option_assignments FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'order_item_variant_selections' AND policyname = 'Allow all write order_item_variant_selections') THEN
    CREATE POLICY "Allow all write order_item_variant_selections" ON public.order_item_variant_selections FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variant_option_ingredients' AND policyname = 'Allow all write product_variant_option_ingredients') THEN
    CREATE POLICY "Allow all write product_variant_option_ingredients" ON public.product_variant_option_ingredients FOR ALL USING (true);
  END IF;
END $$;

-- 3.3 Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variant_groups;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variant_options;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variant_group_assignments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variant_option_assignments;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_item_variant_selections;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 4. VALIDATION & ORDER DISPATCH STORED PROCEDURE
-- Validates:
--   - product exists & is available
--   - variant_id belongs to product and is available
--   - option_id belongs to group, group is assigned to product, option is assigned and available
--   - required group constraints & max_selections = 1
--   - computes authoritative unit_price = resolved_base + option_price_deltas + modifier_price_deltas
--   - inserts order_items + order_item_variant_selections atomically
CREATE OR REPLACE FUNCTION public.dispatch_order_with_selections(
  p_order_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_prod RECORD;
  v_var RECORD;
  v_sel RECORD;
  v_grp RECORD;
  v_opt RECORD;
  v_mod RECORD;
  v_mod_text TEXT;
  v_clean_mod_name TEXT;
  v_base_price NUMERIC(10,2);
  v_effective_unit_price NUMERIC(10,2);
  v_item_id UUID;
  v_status TEXT;
  v_station_target TEXT;
  v_inserted_items JSONB := '[]'::jsonb;
  v_assigned_groups RECORD;
  v_sel_count INT;
  v_min_req INT;
  v_max_req INT;
  v_is_req BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    id UUID,
    product_id UUID,
    variant_id UUID,
    temperature TEXT,
    size_label TEXT,
    quantity INT,
    unit_price NUMERIC,
    station_target TEXT,
    status TEXT,
    modifiers JSONB,
    notes TEXT,
    variant_selections JSONB
  )
  LOOP
    -- 1. Validate Product
    SELECT id, name, base_price, station_target, is_available
    INTO v_prod
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % does not exist', v_item.product_id;
    END IF;

    -- 2. Validate Variant (if provided)
    v_base_price := v_prod.base_price;
    IF v_item.variant_id IS NOT NULL THEN
      SELECT id, product_id, temperature, size_label, price, is_available
      INTO v_var
      FROM public.product_variants
      WHERE id = v_item.variant_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant % does not exist', v_item.variant_id;
      END IF;

      IF v_var.product_id != v_item.product_id THEN
        RAISE EXCEPTION 'Variant % belongs to product %, not %', v_item.variant_id, v_var.product_id, v_item.product_id;
      END IF;

      v_base_price := v_var.price;
    END IF;

    v_effective_unit_price := v_base_price;

    -- 3. Validate Group cardinality & Requirements for this product
    FOR v_assigned_groups IN
      SELECT
        ga.group_id,
        COALESCE(ga.min_selections, g.min_selections) AS min_selections,
        COALESCE(ga.max_selections, g.max_selections) AS max_selections,
        COALESCE(ga.is_required, g.is_required) AS is_required,
        g.name AS group_name
      FROM public.product_variant_group_assignments ga
      JOIN public.product_variant_groups g ON g.id = ga.group_id
      WHERE ga.product_id = v_item.product_id AND ga.is_active = true AND g.is_active = true
    LOOP
      v_sel_count := 0;
      IF v_item.variant_selections IS NOT NULL AND jsonb_array_length(v_item.variant_selections) > 0 THEN
        SELECT count(*) INTO v_sel_count
        FROM jsonb_to_recordset(v_item.variant_selections) AS s(group_id UUID, option_id UUID)
        WHERE s.group_id = v_assigned_groups.group_id;
      END IF;

      IF v_assigned_groups.is_required AND v_sel_count < v_assigned_groups.min_selections THEN
        RAISE EXCEPTION 'Selection required for % on %', v_assigned_groups.group_name, v_prod.name;
      END IF;

      IF v_sel_count > v_assigned_groups.max_selections THEN
        RAISE EXCEPTION 'Maximum % selections exceeded for % on %', v_assigned_groups.max_selections, v_assigned_groups.group_name, v_prod.name;
      END IF;
    END LOOP;

    -- 4. Calculate Option Deltas from authoritative catalog
    IF v_item.variant_selections IS NOT NULL AND jsonb_array_length(v_item.variant_selections) > 0 THEN
      FOR v_sel IN SELECT * FROM jsonb_to_recordset(v_item.variant_selections) AS s(
        group_id UUID,
        option_id UUID
      )
      LOOP
        SELECT
          oa.price_delta,
          oa.is_available,
          g.name AS group_name,
          o.name AS option_name
        INTO v_opt
        FROM public.product_variant_option_assignments oa
        JOIN public.product_variant_options o ON o.id = oa.option_id
        JOIN public.product_variant_groups g ON g.id = o.group_id
        WHERE oa.product_id = v_item.product_id
          AND oa.option_id = v_sel.option_id
          AND o.group_id = v_sel.group_id
          AND o.is_active = true;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Option % is not valid or active for product % in group %', v_sel.option_id, v_item.product_id, v_sel.group_id;
        END IF;

        IF NOT v_opt.is_available THEN
          RAISE EXCEPTION 'Option % (%) is currently unavailable for %', v_opt.option_name, v_sel.option_id, v_prod.name;
        END IF;

        v_effective_unit_price := v_effective_unit_price + v_opt.price_delta;
      END LOOP;
    END IF;

    -- 5. Calculate Modifiers Delta (if any)
    IF v_item.modifiers IS NOT NULL AND jsonb_array_length(v_item.modifiers) > 0 THEN
      FOR v_mod_text IN SELECT jsonb_array_elements_text(v_item.modifiers)
      LOOP
        v_clean_mod_name := regexp_replace(v_mod_text, '\s*\(\+[^\)]+\)\s*$', '');
        SELECT price_delta INTO v_mod
        FROM public.product_modifiers
        WHERE (product_id = v_item.product_id OR product_id IS NULL)
          AND name = v_clean_mod_name
        ORDER BY product_id NULLS LAST
        LIMIT 1;

        IF FOUND AND v_mod.price_delta IS NOT NULL THEN
          v_effective_unit_price := v_effective_unit_price + v_mod.price_delta;
        END IF;
      END LOOP;
    END IF;

    -- 6. Insert Order Item
    v_item_id := COALESCE(v_item.id, gen_random_uuid());
    v_status := COALESCE(NULLIF(upper(v_item.status), ''), 'PENDING');
    v_station_target := COALESCE(v_item.station_target, v_prod.station_target, 'bar');

    INSERT INTO public.order_items (
      id,
      order_id,
      product_id,
      variant_id,
      temperature,
      size_label,
      quantity,
      unit_price,
      station_target,
      status,
      modifiers,
      notes,
      is_depleted
    ) VALUES (
      v_item_id,
      p_order_id,
      v_item.product_id,
      v_item.variant_id,
      COALESCE(v_item.temperature, v_var.temperature),
      COALESCE(v_item.size_label, v_var.size_label),
      COALESCE(v_item.quantity, 1),
      v_effective_unit_price,
      v_station_target,
      v_status,
      COALESCE(v_item.modifiers, '[]'::jsonb),
      v_item.notes,
      false
    );

    -- 7. Insert Order Item Variant Selections
    IF v_item.variant_selections IS NOT NULL AND jsonb_array_length(v_item.variant_selections) > 0 THEN
      FOR v_sel IN SELECT * FROM jsonb_to_recordset(v_item.variant_selections) AS s(
        group_id UUID,
        option_id UUID
      )
      LOOP
        SELECT
          oa.price_delta,
          g.name AS group_name,
          o.name AS option_name
        INTO v_opt
        FROM public.product_variant_option_assignments oa
        JOIN public.product_variant_options o ON o.id = oa.option_id
        JOIN public.product_variant_groups g ON g.id = o.group_id
        WHERE oa.product_id = v_item.product_id
          AND oa.option_id = v_sel.option_id
          AND o.group_id = v_sel.group_id;

        INSERT INTO public.order_item_variant_selections (
          order_item_id,
          product_id,
          group_id,
          option_id,
          group_name_snapshot,
          option_name_snapshot,
          price_delta_snapshot
        ) VALUES (
          v_item_id,
          v_item.product_id,
          v_sel.group_id,
          v_sel.option_id,
          v_opt.group_name,
          v_opt.option_name,
          v_opt.price_delta
        );
      END LOOP;
    END IF;

    v_inserted_items := v_inserted_items || jsonb_build_object(
      'id', v_item_id,
      'product_id', v_item.product_id,
      'unit_price', v_effective_unit_price,
      'status', v_status
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'items', v_inserted_items
  );
END;
$$;

-- 5. CONSOLIDATED AUTHORITATIVE INVENTORY DEPLETION FUNCTION
-- Handles:
--   A. Variant-specific BOM or Base BOM fallback
--   B. Additive Flavor Option ingredients (product_variant_option_ingredients)
--   C. Add-on modifier ingredients (product_modifiers)
CREATE OR REPLACE FUNCTION public.fn_deplete_inventory_on_item_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing RECORD;
  v_mod RECORD;
  v_mod_text TEXT;
  v_clean_mod_name TEXT;
  v_balance_before NUMERIC;
  v_current_stock NUMERIC;
  v_deduction NUMERIC;
  v_mods JSONB;
  v_has_variant_bom BOOLEAN := false;
  v_flavor_opt RECORD;
BEGIN
  -- Only deplete when transitioning to READY or SERVED and not already depleted
  IF (NEW.status IN ('READY', 'SERVED')
      AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('READY', 'SERVED'))
      AND NEW.is_depleted = false) THEN

    -- A. Check if item has a variant-specific BOM defined
    IF NEW.variant_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.product_ingredients
        WHERE variant_id = NEW.variant_id
      ) INTO v_has_variant_bom;
    END IF;

    IF v_has_variant_bom THEN
      -- Deplete variant-specific BOM
      FOR v_ing IN
        SELECT
          pi.inventory_item_id,
          pi.amount,
          pi.conversion_factor,
          ii.current_stock AS stock_now
        FROM public.product_ingredients pi
        JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
        WHERE pi.variant_id = NEW.variant_id
        ORDER BY pi.inventory_item_id
      LOOP
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
    ELSE
      -- Deplete base product BOM (where variant_id IS NULL or no variant BOM exists)
      FOR v_ing IN
        SELECT
          pi.inventory_item_id,
          pi.amount,
          pi.conversion_factor,
          ii.current_stock AS stock_now
        FROM public.product_ingredients pi
        JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
        WHERE pi.product_id = NEW.product_id
          AND (pi.variant_id IS NULL)
        ORDER BY pi.inventory_item_id
      LOOP
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
    END IF;

    -- B. Deplete Additive Flavor Option Ingredients (from order_item_variant_selections)
    FOR v_flavor_opt IN
      SELECT
        pvoi.inventory_item_id,
        pvoi.amount,
        pvoi.conversion_factor
      FROM public.order_item_variant_selections oivs
      JOIN public.product_variant_option_ingredients pvoi
        ON pvoi.product_id = oivs.product_id
       AND pvoi.option_id = oivs.option_id
      WHERE oivs.order_item_id = NEW.id
      ORDER BY pvoi.inventory_item_id
    LOOP
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_flavor_opt.inventory_item_id
      FOR UPDATE;

      IF FOUND THEN
        v_deduction := (v_flavor_opt.amount * NEW.quantity * v_flavor_opt.conversion_factor);
        v_current_stock := v_balance_before - v_deduction;

        UPDATE public.inventory_items
        SET current_stock = v_current_stock, updated_at = now()
        WHERE id = v_flavor_opt.inventory_item_id;

        INSERT INTO public.stock_movements (
          inventory_item_id,
          movement_type,
          change_amount,
          balance_before,
          balance_after,
          reference_id
        ) VALUES (
          v_flavor_opt.inventory_item_id,
          'SALE_DEPLETION',
          -v_deduction,
          v_balance_before,
          v_current_stock,
          NEW.order_id::text
        );
      END IF;
    END LOOP;

    -- C. Deplete Selected Modifiers (if linked to inventory)
    v_mods := public.fn_normalize_modifiers_jsonb(NEW.modifiers);
    IF v_mods IS NOT NULL AND jsonb_array_length(v_mods) > 0 THEN
      FOR v_mod_text IN SELECT jsonb_array_elements_text(v_mods)
      LOOP
        v_clean_mod_name := regexp_replace(v_mod_text, '\s*\(\+[^\)]+\)\s*$', '');

        FOR v_mod IN
          SELECT
            pm.inventory_item_id,
            pm.amount_delta,
            COALESCE(pm.unit, ii.unit) AS unit,
            ii.current_stock AS stock_now
          FROM public.product_modifiers pm
          JOIN public.inventory_items ii ON ii.id = pm.inventory_item_id
          WHERE (pm.product_id = NEW.product_id OR pm.product_id IS NULL)
            AND pm.name = v_clean_mod_name
            AND pm.inventory_item_id IS NOT NULL
            AND pm.amount_delta > 0
          ORDER BY pm.inventory_item_id
        LOOP
          SELECT current_stock INTO v_balance_before
          FROM public.inventory_items
          WHERE id = v_mod.inventory_item_id
          FOR UPDATE;

          IF FOUND THEN
            v_deduction := (v_mod.amount_delta * NEW.quantity);
            v_current_stock := v_balance_before - v_deduction;

            UPDATE public.inventory_items
            SET current_stock = v_current_stock, updated_at = now()
            WHERE id = v_mod.inventory_item_id;

            INSERT INTO public.stock_movements (
              inventory_item_id,
              movement_type,
              change_amount,
              balance_before,
              balance_after,
              reference_id
            ) VALUES (
              v_mod.inventory_item_id,
              'SALE_DEPLETION',
              -v_deduction,
              v_balance_before,
              v_current_stock,
              NEW.order_id::text
            );
          END IF;
        END LOOP;
      END LOOP;
    END IF;

    -- Mark item depleted to prevent double-depletion
    NEW.is_depleted := true;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- 6. UPGRADE cancel_order_item_with_restoral
-- Restores recipe BOM, flavor ingredients, and modifier ingredients when cancelled pre-prep
CREATE OR REPLACE FUNCTION public.cancel_order_item_with_restoral(
  p_order_item_id UUID,
  p_reason TEXT DEFAULT 'Customer Cancellation',
  p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_prod_ing RECORD;
  v_flavor_opt RECORD;
  v_mod RECORD;
  v_mod_text TEXT;
  v_clean_mod_name TEXT;
  v_mods JSONB;
  v_is_post_prep BOOLEAN := false;
  v_balance_before NUMERIC;
  v_current_stock NUMERIC;
  v_restoral NUMERIC;
  v_has_variant_bom BOOLEAN := false;
BEGIN
  SELECT * INTO v_item
  FROM public.order_items
  WHERE id = p_order_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
  END IF;

  IF v_item.status = 'CANCELLED' THEN
    RETURN jsonb_build_object('success', true, 'already_cancelled', true);
  END IF;

  v_is_post_prep := (v_item.status IN ('ready', 'served') OR v_item.is_depleted);

  -- If item was prepared and depleted, log as kitchen/bar waste rather than restocking spoiled food
  IF v_is_post_prep THEN
    INSERT INTO public.waste_logs (
      product_id,
      quantity,
      cost_loss,
      reason,
      logged_by_id,
      notes
    ) VALUES (
      v_item.product_id,
      v_item.quantity,
      (v_item.unit_price * v_item.quantity),
      COALESCE(p_reason, 'Post-Prep Cancellation Spoilage'),
      p_staff_id,
      'Auto-logged from order item void'
    );
  ELSIF v_item.is_depleted THEN
    -- If it was somehow depleted pre-prep, restore inventory stock
    IF v_item.variant_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.product_ingredients WHERE variant_id = v_item.variant_id
      ) INTO v_has_variant_bom;
    END IF;

    IF v_has_variant_bom THEN
      FOR v_prod_ing IN
        SELECT inventory_item_id, amount, conversion_factor
        FROM public.product_ingredients
        WHERE variant_id = v_item.variant_id
      LOOP
        SELECT current_stock INTO v_balance_before FROM public.inventory_items WHERE id = v_prod_ing.inventory_item_id FOR UPDATE;
        v_restoral := (v_prod_ing.amount * v_item.quantity * v_prod_ing.conversion_factor);
        v_current_stock := v_balance_before + v_restoral;
        UPDATE public.inventory_items SET current_stock = v_current_stock, updated_at = now() WHERE id = v_prod_ing.inventory_item_id;
        INSERT INTO public.stock_movements (
          inventory_item_id, movement_type, change_amount, balance_before, balance_after, reference_id
        ) VALUES (
          v_prod_ing.inventory_item_id, 'RESTOCK_RETURN', v_restoral, v_balance_before, v_current_stock, v_item.order_id::text
        );
      END LOOP;
    ELSE
      FOR v_prod_ing IN
        SELECT inventory_item_id, amount, conversion_factor
        FROM public.product_ingredients
        WHERE product_id = v_item.product_id AND variant_id IS NULL
      LOOP
        SELECT current_stock INTO v_balance_before FROM public.inventory_items WHERE id = v_prod_ing.inventory_item_id FOR UPDATE;
        v_restoral := (v_prod_ing.amount * v_item.quantity * v_prod_ing.conversion_factor);
        v_current_stock := v_balance_before + v_restoral;
        UPDATE public.inventory_items SET current_stock = v_current_stock, updated_at = now() WHERE id = v_prod_ing.inventory_item_id;
        INSERT INTO public.stock_movements (
          inventory_item_id, movement_type, change_amount, balance_before, balance_after, reference_id
        ) VALUES (
          v_prod_ing.inventory_item_id, 'RESTOCK_RETURN', v_restoral, v_balance_before, v_current_stock, v_item.order_id::text
        );
      END LOOP;
    END IF;

    -- Restore flavor ingredients
    FOR v_flavor_opt IN
      SELECT pvoi.inventory_item_id, pvoi.amount, pvoi.conversion_factor
      FROM public.order_item_variant_selections oivs
      JOIN public.product_variant_option_ingredients pvoi
        ON pvoi.product_id = oivs.product_id AND pvoi.option_id = oivs.option_id
      WHERE oivs.order_item_id = v_item.id
    LOOP
      SELECT current_stock INTO v_balance_before FROM public.inventory_items WHERE id = v_flavor_opt.inventory_item_id FOR UPDATE;
      v_restoral := (v_flavor_opt.amount * v_item.quantity * v_flavor_opt.conversion_factor);
      v_current_stock := v_balance_before + v_restoral;
      UPDATE public.inventory_items SET current_stock = v_current_stock, updated_at = now() WHERE id = v_flavor_opt.inventory_item_id;
      INSERT INTO public.stock_movements (
        inventory_item_id, movement_type, change_amount, balance_before, balance_after, reference_id
      ) VALUES (
        v_flavor_opt.inventory_item_id, 'RESTOCK_RETURN', v_restoral, v_balance_before, v_current_stock, v_item.order_id::text
      );
    END LOOP;

    -- Restore modifier ingredients
    v_mods := public.fn_normalize_modifiers_jsonb(v_item.modifiers);
    IF v_mods IS NOT NULL AND jsonb_array_length(v_mods) > 0 THEN
      FOR v_mod_text IN SELECT jsonb_array_elements_text(v_mods)
      LOOP
        v_clean_mod_name := regexp_replace(v_mod_text, '\s*\(\+[^\)]+\)\s*$', '');
        FOR v_mod IN
          SELECT pm.inventory_item_id, pm.amount_delta
          FROM public.product_modifiers pm
          WHERE (pm.product_id = v_item.product_id OR pm.product_id IS NULL)
            AND pm.name = v_clean_mod_name
            AND pm.inventory_item_id IS NOT NULL
            AND pm.amount_delta > 0
        LOOP
          SELECT current_stock INTO v_balance_before FROM public.inventory_items WHERE id = v_mod.inventory_item_id FOR UPDATE;
          v_restoral := (v_mod.amount_delta * v_item.quantity);
          v_current_stock := v_balance_before + v_restoral;
          UPDATE public.inventory_items SET current_stock = v_current_stock, updated_at = now() WHERE id = v_mod.inventory_item_id;
          INSERT INTO public.stock_movements (
            inventory_item_id, movement_type, change_amount, balance_before, balance_after, reference_id
          ) VALUES (
            v_mod.inventory_item_id, 'RESTOCK_RETURN', v_restoral, v_balance_before, v_current_stock, v_item.order_id::text
          );
        END LOOP;
      END LOOP;
    END IF;
  END IF;

  UPDATE public.order_items
  SET status = 'CANCELLED',
      updated_at = now()
  WHERE id = p_order_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'status', 'CANCELLED',
    'is_post_prep', v_is_post_prep
  );
END;
$$;

-- 7. UPGRADE transfer_order_items_to_tab
-- Copies order_item_variant_selections when splitting or transferring line items
CREATE OR REPLACE FUNCTION public.transfer_order_items_to_tab(
  p_source_tab_id UUID,
  p_target_tab_id UUID DEFAULT NULL,
  p_table_id UUID DEFAULT NULL,
  p_new_tab_name TEXT DEFAULT NULL,
  p_item_transfers JSONB DEFAULT '[]'::jsonb,
  p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_tab RECORD;
  v_target_tab_id UUID := p_target_tab_id;
  v_target_order_id UUID := NULL;
  v_transfer RECORD;
  v_item RECORD;
  v_item_id UUID;
  v_qty_to_move INT;
  v_new_item_id UUID;
  v_new_order_number TEXT;
  v_effective_table_id UUID := p_table_id;
BEGIN
  -- 1. Lock and verify source tab
  SELECT id, table_id, customer_name, order_type, order_channel, operating_mode, status
  INTO v_source_tab
  FROM public.tabs
  WHERE id = p_source_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source tab not found: %', p_source_tab_id;
  END IF;

  IF v_effective_table_id IS NULL THEN
    v_effective_table_id := v_source_tab.table_id;
  END IF;

  -- 2. If target tab is not provided, create a new sub-tab on the table
  IF v_target_tab_id IS NULL THEN
    INSERT INTO public.tabs (
      table_id,
      customer_name,
      order_type,
      order_channel,
      opened_by_id,
      operating_mode,
      status
    ) VALUES (
      v_effective_table_id,
      COALESCE(NULLIF(trim(p_new_tab_name), ''), 'Senior Citizen / Split Tab'),
      v_source_tab.order_type,
      v_source_tab.order_channel,
      p_staff_id,
      COALESCE(v_source_tab.operating_mode, 'CAFE'),
      'OPEN'
    ) RETURNING id INTO v_target_tab_id;
  ELSE
    PERFORM 1 FROM public.tabs WHERE id = v_target_tab_id FOR UPDATE;
  END IF;

  -- 3. Find or create an open order for the target tab
  SELECT id INTO v_target_order_id
  FROM public.orders
  WHERE tab_id = v_target_tab_id AND status = 'OPEN'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_target_order_id IS NULL THEN
    v_new_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));
    INSERT INTO public.orders (
      tab_id,
      order_number,
      order_type,
      order_channel,
      status
    ) VALUES (
      v_target_tab_id,
      v_new_order_number,
      v_source_tab.order_type,
      v_source_tab.order_channel,
      'OPEN'
    ) RETURNING id INTO v_target_order_id;
  END IF;

  -- 4. Process each item transfer
  FOR v_transfer IN SELECT * FROM jsonb_to_recordset(p_item_transfers) AS x(order_item_id UUID, quantity INT)
  LOOP
    v_item_id := v_transfer.order_item_id;
    v_qty_to_move := COALESCE(v_transfer.quantity, 1);

    SELECT * INTO v_item
    FROM public.order_items
    WHERE id = v_item_id
    FOR UPDATE;

    IF FOUND AND v_item.status != 'CANCELLED' THEN
      IF v_qty_to_move >= v_item.quantity THEN
        -- Transfer entire line item
        UPDATE public.order_items
        SET order_id = v_target_order_id,
            updated_at = now()
        WHERE id = v_item_id;
      ELSE
        -- Split line item: decrement source quantity and insert new item on target order
        UPDATE public.order_items
        SET quantity = v_item.quantity - v_qty_to_move,
            updated_at = now()
        WHERE id = v_item_id;

        v_new_item_id := gen_random_uuid();
        INSERT INTO public.order_items (
          id,
          order_id,
          product_id,
          quantity,
          unit_price,
          modifiers,
          notes,
          status,
          station_target,
          is_depleted,
          variant_id,
          temperature,
          size_label
        ) VALUES (
          v_new_item_id,
          v_target_order_id,
          v_item.product_id,
          v_qty_to_move,
          v_item.unit_price,
          v_item.modifiers,
          v_item.notes,
          v_item.status,
          v_item.station_target,
          v_item.is_depleted,
          v_item.variant_id,
          v_item.temperature,
          v_item.size_label
        );

        -- Duplicate variant selections to new item
        INSERT INTO public.order_item_variant_selections (
          order_item_id,
          product_id,
          group_id,
          option_id,
          group_name_snapshot,
          option_name_snapshot,
          price_delta_snapshot
        )
        SELECT
          v_new_item_id,
          product_id,
          group_id,
          option_id,
          group_name_snapshot,
          option_name_snapshot,
          price_delta_snapshot
        FROM public.order_item_variant_selections
        WHERE order_item_id = v_item_id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'source_tab_id', p_source_tab_id,
    'target_tab_id', v_target_tab_id,
    'target_order_id', v_target_order_id
  );
END;
$$;

-- 8. UPGRADE dispatch_order_round_atomic (Rich thermal chits with flavor)
CREATE OR REPLACE FUNCTION public.dispatch_order_round_atomic(
  p_order_id UUID
)
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
  v_item_display_name TEXT;
  v_flavor_label TEXT;
  v_desc_parts TEXT[];
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

  -- 3. Build rich items json for thermal print chit
  FOR v_item IN 
    SELECT 
      oi.id AS order_item_id, 
      oi.product_id, 
      oi.quantity, 
      oi.station_target, 
      oi.notes, 
      oi.modifiers,
      oi.unit_price,
      p.name AS product_name,
      COALESCE(oi.temperature, pv.temperature) AS temperature,
      COALESCE(oi.size_label, pv.size_label) AS size_label,
      (
        SELECT string_agg(oivs.option_name_snapshot, ', ' ORDER BY oivs.created_at)
        FROM public.order_item_variant_selections oivs
        WHERE oivs.order_item_id = oi.id
      ) AS flavor_snapshot
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.created_at ASC
  LOOP
    v_desc_parts := ARRAY[]::TEXT[];
    IF v_item.flavor_snapshot IS NOT NULL AND v_item.flavor_snapshot != '' THEN
      v_desc_parts := array_append(v_desc_parts, v_item.flavor_snapshot);
    END IF;
    IF v_item.temperature IS NOT NULL AND v_item.temperature NOT IN ('NONE', 'ROOM') THEN
      v_desc_parts := array_append(v_desc_parts, CASE WHEN v_item.temperature = 'HOT' THEN 'Hot' ELSE 'Iced' END);
    END IF;
    IF v_item.size_label IS NOT NULL AND v_item.size_label != 'Standard' THEN
      v_desc_parts := array_append(v_desc_parts, v_item.size_label);
    END IF;

    v_item_display_name := v_item.product_name;
    IF array_length(v_desc_parts, 1) > 0 THEN
      v_item_display_name := v_item_display_name || ' (' || array_to_string(v_desc_parts, ' · ') || ')';
    END IF;

    v_items_json := v_items_json || jsonb_build_object(
      'name', v_item_display_name,
      'productName', v_item.product_name,
      'flavor', v_item.flavor_snapshot,
      'temperature', v_item.temperature,
      'size', v_item.size_label,
      'quantity', v_item.quantity,
      'price', v_item.unit_price,
      'unit_price', v_item.unit_price,
      'total', (v_item.unit_price * v_item.quantity),
      'stationTarget', v_item.station_target,
      'modifiers', v_item.modifiers,
      'notes', v_item.notes
    );
  END LOOP;

  -- 4. Enqueue Kitchen and Bar chits
  v_chit_data := jsonb_build_object(
    'orderId', v_order.id,
    'orderNumber', v_order.order_number,
    'roundNumber', v_order.round_number,
    'orderType', v_order.order_type,
    'tableNumber', COALESCE(v_table_number, 'Takeout/Counter'),
    'customerName', COALESCE(v_tab.customer_name, 'Guest'),
    'serverName', COALESCE(v_staff_name, 'Staff'),
    'dispatchedAt', now(),
    'items', v_items_json
  );

  INSERT INTO public.print_jobs (
    job_type,
    status,
    payload,
    created_at
  ) VALUES (
    'ORDER_CHIT',
    'PENDING',
    v_chit_data,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'items_count', jsonb_array_length(v_items_json)
  );
END;
$$;

-- 9. SEED MASTER CATALOG: FLAVOR GROUP, OPTIONS, LATTE PRODUCT, ASSIGNMENTS & RECIPES
DO $$
DECLARE
  v_coffee_cat_id UUID;
  v_latte_id UUID;
  v_flavor_group_id UUID := '20000000-0000-0000-0000-000000000010';
  v_opt_classic_id UUID := '30000000-0000-0000-0000-000000000041';
  v_opt_spanish_id UUID := '30000000-0000-0000-0000-000000000042';
  v_opt_caramel_id UUID := '30000000-0000-0000-0000-000000000043';
  v_opt_vanilla_id UUID := '30000000-0000-0000-0000-000000000044';
  v_beans_inv_id UUID := 'b1000001-0000-0000-0000-000000000001';
  v_milk_inv_id UUID := 'b1000004-0000-0000-0000-000000000004';
  v_condensed_inv_id UUID := 'b1000026-0000-0000-0000-000000000026';
  v_caramel_inv_id UUID := 'b1000027-0000-0000-0000-000000000027';
  v_vanilla_inv_id UUID := 'b1000028-0000-0000-0000-000000000028';
BEGIN
  -- A. Get Coffee Category
  SELECT id INTO v_coffee_cat_id FROM public.categories WHERE slug = 'coffee' LIMIT 1;
  IF v_coffee_cat_id IS NULL THEN
    SELECT id INTO v_coffee_cat_id FROM public.categories LIMIT 1;
  END IF;

  -- B. Ensure Flavor Ingredient Items exist in inventory_items
  INSERT INTO public.inventory_items (id, sku, name, category, current_stock, unit, min_alert_level, unit_cost, supplier_name)
  VALUES
    (v_condensed_inv_id, 'SYR-001', 'Sweetened Condensed Milk', 'SYRUPS_MIXERS', 15.000, 'kg', 3.000, 18.00, 'Local Dairy Farm'),
    (v_caramel_inv_id, 'SYR-002', 'Artisan Caramel Sauce', 'SYRUPS_MIXERS', 10.000, 'L', 2.000, 24.00, 'Gourmet Pantry'),
    (v_vanilla_inv_id, 'SYR-003', 'Madagascar Vanilla Extract', 'SYRUPS_MIXERS', 8.000, 'L', 1.500, 32.00, 'Gourmet Pantry')
  ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category;

  -- C. Ensure Latte product exists
  SELECT id INTO v_latte_id FROM public.products WHERE lower(name) = 'latte' LIMIT 1;
  IF v_latte_id IS NULL THEN
    v_latte_id := 'e1111111-0000-0000-0000-000000000004';
    INSERT INTO public.products (
      id, category_id, name, image_url, description, base_price, station_target, is_resold_outside_food, original_cost, auto_86, allergens, dietary, is_available
    ) VALUES (
      v_latte_id,
      v_coffee_cat_id,
      'Latte',
      'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=600&q=80',
      'Espresso with silky textured milk and microfoam',
      190.00,
      'bar',
      false,
      NULL,
      false,
      ARRAY['DAIRY'],
      ARRAY['Vegetarian'],
      true
    )
    ON CONFLICT (name) DO UPDATE SET
      base_price = EXCLUDED.base_price
    RETURNING id INTO v_latte_id;
  END IF;

  -- Seed Latte Temperature / Size Variants (HOT Standard, COLD Standard if missing)
  IF NOT EXISTS (
    SELECT 1 FROM public.product_variants WHERE product_id = v_latte_id
  ) THEN
    INSERT INTO public.product_variants (product_id, temperature, size_label, price, sort_order, is_available)
    VALUES
      (v_latte_id, 'HOT', 'Standard', 180.00, 1, true),
      (v_latte_id, 'COLD', 'Standard', 195.00, 2, true);
  END IF;

  -- Base BOM for Latte: 0.018 kg espresso beans + 0.220 L fresh milk
  IF NOT EXISTS (
    SELECT 1 FROM public.product_ingredients 
    WHERE product_id = v_latte_id AND inventory_item_id = v_beans_inv_id AND variant_id IS NULL
  ) THEN
    INSERT INTO public.product_ingredients (product_id, inventory_item_id, amount, unit, conversion_factor)
    VALUES (v_latte_id, v_beans_inv_id, 0.018, 'kg', 1.0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.product_ingredients 
    WHERE product_id = v_latte_id AND inventory_item_id = v_milk_inv_id AND variant_id IS NULL
  ) THEN
    INSERT INTO public.product_ingredients (product_id, inventory_item_id, amount, unit, conversion_factor)
    VALUES (v_latte_id, v_milk_inv_id, 0.220, 'L', 1.0);
  END IF;

  -- D. Seed Master Reusable Product Variant Group: Flavor
  INSERT INTO public.product_variant_groups (
    id, code, name, min_selections, max_selections, is_required, allows_duplicates, is_active, sort_order
  ) VALUES (
    v_flavor_group_id, 'flavor', 'Flavor', 0, 1, false, false, true, 1
  )
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    min_selections = EXCLUDED.min_selections,
    max_selections = EXCLUDED.max_selections,
    is_required = EXCLUDED.is_required;

  -- E. Seed Reusable Options: Classic, Spanish, Caramel, Vanilla
  INSERT INTO public.product_variant_options (
    id, group_id, code, name, default_price_delta, is_active, sort_order
  ) VALUES
    (v_opt_classic_id, v_flavor_group_id, 'classic', 'Classic', 0.00, true, 1),
    (v_opt_spanish_id, v_flavor_group_id, 'spanish', 'Spanish', 25.00, true, 2),
    (v_opt_caramel_id, v_flavor_group_id, 'caramel', 'Caramel', 30.00, true, 3),
    (v_opt_vanilla_id, v_flavor_group_id, 'vanilla', 'Vanilla', 25.00, true, 4)
  ON CONFLICT (group_id, code) DO UPDATE SET
    name = EXCLUDED.name,
    default_price_delta = EXCLUDED.default_price_delta,
    sort_order = EXCLUDED.sort_order;

  -- F. Assign Flavor Group explicitly to Latte
  INSERT INTO public.product_variant_group_assignments (
    product_id, group_id, min_selections, max_selections, is_required, sort_order, is_active
  ) VALUES (
    v_latte_id, v_flavor_group_id, 0, 1, false, 1, true
  )
  ON CONFLICT (product_id, group_id) DO UPDATE SET
    is_active = true,
    sort_order = EXCLUDED.sort_order;

  -- G. Assign Options to Latte with deltas
  INSERT INTO public.product_variant_option_assignments (
    product_id, option_id, price_delta, is_default, is_available, sort_order
  ) VALUES
    (v_latte_id, v_opt_classic_id, 0.00, true, true, 1),
    (v_latte_id, v_opt_spanish_id, 25.00, false, true, 2),
    (v_latte_id, v_opt_caramel_id, 30.00, false, true, 3),
    (v_latte_id, v_opt_vanilla_id, 25.00, false, true, 4)
  ON CONFLICT (product_id, option_id) DO UPDATE SET
    price_delta = EXCLUDED.price_delta,
    is_default = EXCLUDED.is_default,
    is_available = true,
    sort_order = EXCLUDED.sort_order;

  -- H. Seed Additive Recipe BOM for Flavor Options on Latte
  -- Spanish Latte adds 0.030 kg Condensed Milk
  INSERT INTO public.product_variant_option_ingredients (
    product_id, option_id, inventory_item_id, amount, unit, conversion_factor
  ) VALUES
    (v_latte_id, v_opt_spanish_id, v_condensed_inv_id, 0.030, 'kg', 1.0),
    (v_latte_id, v_opt_caramel_id, v_caramel_inv_id, 0.025, 'L', 1.0),
    (v_latte_id, v_opt_vanilla_id, v_vanilla_inv_id, 0.020, 'L', 1.0)
  ON CONFLICT (product_id, option_id, inventory_item_id) DO UPDATE SET
    amount = EXCLUDED.amount,
    unit = EXCLUDED.unit;
END $$;
