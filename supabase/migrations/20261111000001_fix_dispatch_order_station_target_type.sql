-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Fix dispatch_order_with_selections Station Target Type
-- Migration: 20261111000001_fix_dispatch_order_station_target_type.sql
-- Description:
--   Fixes type mismatch in dispatch_order_with_selections() where:
--   1. v_item.station_target (TEXT from jsonb_to_recordset) was COALESCE'd with
--      v_prod.station_target (public.station_target ENUM) causing PostgreSQL error:
--      "COALESCE types text and station_target cannot be matched"
--   2. Ensures v_station_target is properly typed as public.station_target ENUM.
-- ==============================================================================

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
  v_status public.item_status;
  v_station_target public.station_target;
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

    -- 3. Validate Flavor Variant Groups cardinality & assignments
    FOR v_assigned_groups IN
      SELECT
        g.id AS group_id,
        g.name AS group_name,
        pga.is_required,
        pga.min_selections,
        pga.max_selections
      FROM public.product_variant_group_assignments pga
      JOIN public.product_variant_groups g ON g.id = pga.group_id
      WHERE pga.product_id = v_item.product_id
        AND g.is_active = true
    LOOP
      v_sel_count := 0;
      IF v_item.variant_selections IS NOT NULL AND jsonb_array_length(v_item.variant_selections) > 0 THEN
        SELECT COUNT(*) INTO v_sel_count
        FROM jsonb_to_recordset(v_item.variant_selections) AS s(group_id UUID, option_id UUID)
        WHERE s.group_id = v_assigned_groups.group_id;
      END IF;

      v_min_req := COALESCE(v_assigned_groups.min_selections, CASE WHEN v_assigned_groups.is_required THEN 1 ELSE 0 END);
      v_max_req := COALESCE(v_assigned_groups.max_selections, 1);

      IF v_sel_count < v_min_req THEN
        RAISE EXCEPTION 'Product "%" requires at least % selection(s) for flavor group "%" (received %)',
          v_prod.name, v_min_req, v_assigned_groups.group_name, v_sel_count;
      END IF;

      IF v_sel_count > v_max_req THEN
        RAISE EXCEPTION 'Product "%" permits at most % selection(s) for flavor group "%" (received %)',
          v_prod.name, v_max_req, v_assigned_groups.group_name, v_sel_count;
      END IF;
    END LOOP;

    -- 4. Validate and Price Variant Selections
    IF v_item.variant_selections IS NOT NULL AND jsonb_array_length(v_item.variant_selections) > 0 THEN
      FOR v_sel IN SELECT * FROM jsonb_to_recordset(v_item.variant_selections) AS s(
        group_id UUID,
        option_id UUID
      )
      LOOP
        SELECT
          oa.id,
          oa.price_delta,
          oa.is_available,
          o.name AS option_name
        INTO v_opt
        FROM public.product_variant_option_assignments oa
        JOIN public.product_variant_options o ON o.id = oa.option_id
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
    v_status := COALESCE(NULLIF(upper(v_item.status), '')::public.item_status, 'PENDING'::public.item_status);
    v_station_target := COALESCE(NULLIF(lower(v_item.station_target), '')::public.station_target, v_prod.station_target, 'bar'::public.station_target);

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
