-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Door Charge & KDS Realtime Voids
-- Migration: 20261112000001_door_charge_and_kds_voids.sql
-- ==============================================================================

-- 1. Extend public.venue_events for Door Charge & Revenue Split
ALTER TABLE public.venue_events
  ADD COLUMN IF NOT EXISTS has_door_charge BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS door_charge_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS split_type TEXT NOT NULL DEFAULT 'percentage' CHECK (split_type IN ('percentage', 'flat_per_ticket')),
  ADD COLUMN IF NOT EXISTS artist_split_value NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS venue_split_value NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS artist_payout_status TEXT NOT NULL DEFAULT 'unsettled' CHECK (artist_payout_status IN ('unsettled', 'paid')),
  ADD COLUMN IF NOT EXISTS artist_payout_notes TEXT,
  ADD COLUMN IF NOT EXISTS artist_payout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS artist_paid_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_venue_events_door_charge ON public.venue_events (has_door_charge, event_date);

-- 2. Link order_items optionally to an event
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.venue_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_event_id ON public.order_items (event_id);

-- 3. Seed Menu Category 'Door Charge' and Menu Item 'Event Door Charge'
INSERT INTO public.categories (id, name, slug, sort_order)
VALUES ('c6666666-6666-6666-6666-666666666666', 'Door Charge', 'door_charge', 0)
ON CONFLICT (slug) DO UPDATE
SET name = 'Door Charge', sort_order = 0;

INSERT INTO public.products (
  id,
  category_id,
  name,
  description,
  base_price,
  station_target,
  is_available
)
VALUES (
  'd1000001-0000-0000-0000-000000000001',
  'c6666666-6666-6666-6666-666666666666',
  'Event Door Charge',
  'Live Jazz Performance & Admission Cover Charge',
  0.00,
  'bar',
  true
)
ON CONFLICT (name) DO NOTHING;

-- 4. RPC to get Event Door Charge Summary & Artist Settlement
CREATE OR REPLACE FUNCTION public.get_event_door_charge_summary(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_tickets_sold INT := 0;
  v_gross_sales NUMERIC(10, 2) := 0.00;
  v_artist_share NUMERIC(10, 2) := 0.00;
  v_venue_share NUMERIC(10, 2) := 0.00;
BEGIN
  SELECT * INTO v_event
  FROM public.venue_events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Event not found');
  END IF;

  -- Count billed/settled door charge items linked directly to this event or on event date
  SELECT 
    COALESCE(SUM(oi.quantity), 0),
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00)
  INTO v_tickets_sold, v_gross_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.tabs t ON t.id = o.tab_id
  JOIN public.categories c ON c.slug = 'door_charge'
  JOIN public.products p ON p.id = oi.product_id AND p.category_id = c.id
  WHERE oi.status != 'CANCELLED'
    AND (
      oi.event_id = p_event_id 
      OR (oi.event_id IS NULL AND (t.created_at AT TIME ZONE 'Asia/Manila')::DATE = v_event.event_date)
    );

  IF v_event.split_type = 'percentage' THEN
    v_artist_share := ROUND((v_gross_sales * (v_event.artist_split_value / 100.0)), 2);
    v_venue_share := v_gross_sales - v_artist_share;
  ELSE -- 'flat_per_ticket'
    v_artist_share := ROUND((v_tickets_sold * v_event.artist_split_value), 2);
    v_venue_share := v_gross_sales - v_artist_share;
    IF v_venue_share < 0 THEN
      v_venue_share := 0.00;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'event_id', v_event.id,
    'title', v_event.title,
    'has_door_charge', v_event.has_door_charge,
    'door_charge_amount', v_event.door_charge_amount,
    'split_type', v_event.split_type,
    'artist_split_value', v_event.artist_split_value,
    'venue_split_value', v_event.venue_split_value,
    'tickets_sold', v_tickets_sold,
    'gross_sales', v_gross_sales,
    'artist_share', v_artist_share,
    'venue_share', v_venue_share,
    'artist_payout_status', v_event.artist_payout_status,
    'artist_payout_notes', v_event.artist_payout_notes,
    'artist_payout_at', v_event.artist_payout_at
  );
END;
$$;

-- 5. RPC to settle / record artist payout
CREATE OR REPLACE FUNCTION public.settle_artist_door_charge_payout(
  p_event_id UUID,
  p_staff_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.venue_events
  SET artist_payout_status = 'paid',
      artist_payout_notes = p_notes,
      artist_payout_at = now(),
      artist_paid_by_id = p_staff_id,
      updated_at = now()
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', p_event_id,
    'artist_payout_status', 'paid',
    'artist_payout_at', now()
  );
END;
$$;

-- 6. RPC to cancel an entire station ticket/round directly from KDS
CREATE OR REPLACE FUNCTION public.cancel_station_ticket_with_restoral(
  p_order_id UUID,
  p_station_target TEXT,
  p_staff_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT 'Cancelled at KDS Station'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_cancelled_count INT := 0;
BEGIN
  FOR v_item IN
    SELECT id 
    FROM public.order_items
    WHERE order_id = p_order_id
      AND station_target = p_station_target::public.station_target
      AND status != 'CANCELLED'
  LOOP
    PERFORM public.cancel_order_item_with_restoral(v_item.id, p_reason, p_staff_id);
    v_cancelled_count := v_cancelled_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'cancelled_items_count', v_cancelled_count
  );
END;
$$;

-- 7. Fix dispatch_order_with_selections (remove nonexistent oa.id, support event_id)
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
    event_id UUID,
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
      event_id,
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
      v_item.event_id,
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

-- 8. Clean up ambiguous cancel_order_item_with_restoral overloads
-- Drop any legacy signature of cancel_order_item_with_restoral where parameter names/types conflict
DO $$
DECLARE
  v_fn RECORD;
BEGIN
  -- Drop functions that have different signature than canonical (p_order_item_id UUID, p_reason TEXT, p_staff_id UUID)
  FOR v_fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cancel_order_item_with_restoral'
      AND proargnames::text[] <> ARRAY['p_order_item_id', 'p_reason', 'p_staff_id']
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', v_fn.signature);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_door_charge_summary(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.settle_artist_door_charge_payout(UUID, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_station_ticket_with_restoral(UUID, TEXT, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_order_with_selections(UUID, JSONB) TO anon, authenticated, service_role;
