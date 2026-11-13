-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Order State Timers & Door Charge Lifecycle
-- Migration: 20261113000001_order_state_timers_and_door_charge_lifecycle.sql
-- ==============================================================================

-- 1. Ensure Columns for Per-State Elapsed Timers on public.order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'preparing_at'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN preparing_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'ready_at'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN ready_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'state_changed_at'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN state_changed_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- 1b. Backfill state_changed_at for existing items
UPDATE public.order_items
SET state_changed_at = COALESCE(delivered_at, updated_at, created_at, now())
WHERE state_changed_at IS NULL;

-- 1c. Create Index for fast state timer queries
CREATE INDEX IF NOT EXISTS idx_order_items_state_changed_at ON public.order_items (state_changed_at);

-- 2. Trigger Function: Maintain Per-State Timestamps on order_items
CREATE OR REPLACE FUNCTION public.fn_set_order_item_delivered_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Track state transition timestamps
  IF NEW.status = 'PENDING' THEN
    NEW.state_changed_at := COALESCE(NEW.created_at, now());
  ELSIF NEW.status = 'PREPARING' THEN
    NEW.preparing_at := COALESCE(NEW.preparing_at, OLD.preparing_at, now());
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.state_changed_at := now();
    END IF;
  ELSIF NEW.status = 'READY' THEN
    NEW.ready_at := COALESCE(NEW.ready_at, OLD.ready_at, now());
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.state_changed_at := now();
    END IF;
  ELSIF NEW.status = 'SERVED' THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, OLD.delivered_at, now());
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.state_changed_at := now();
    END IF;
  ELSIF NEW.status = 'CANCELLED' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      NEW.state_changed_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_item_delivered_at ON public.order_items;
CREATE TRIGGER trg_set_order_item_delivered_at
BEFORE INSERT OR UPDATE OF status, delivered_at, preparing_at, ready_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_order_item_delivered_at();

-- 3. Ensure Canonical Door Charge Category and Product Exist
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
ON CONFLICT (id) DO UPDATE
SET name = 'Event Door Charge',
    category_id = 'c6666666-6666-6666-6666-666666666666',
    is_available = true;

-- 4. Overhaul dispatch_order_with_selections
-- Fixes unassigned v_var record, supports dynamic door charge price, sets door charge to SERVED
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
  v_var_temp TEXT;
  v_var_size TEXT;
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
  v_is_door_charge BOOLEAN;
  v_now TIMESTAMPTZ := now();
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
    variant_selections JSONB,
    category_slug TEXT
  )
  LOOP
    -- Reset loop-scoped scalar variables
    v_var_temp := NULL;
    v_var_size := NULL;

    -- 1. Validate Product
    SELECT id, name, category_id, base_price, station_target, is_available
    INTO v_prod
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN
      -- If product is Event Door Charge UUID, ensure it resolves
      IF v_item.product_id = 'd1000001-0000-0000-0000-000000000001'::uuid THEN
        SELECT id, name, category_id, base_price, station_target, is_available
        INTO v_prod
        FROM public.products
        WHERE id = 'd1000001-0000-0000-0000-000000000001'::uuid;
      END IF;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Product % does not exist', v_item.product_id;
      END IF;
    END IF;

    -- Detect Door Charge items
    v_is_door_charge := (
      v_prod.id = 'd1000001-0000-0000-0000-000000000001'::uuid
      OR v_item.category_slug = 'door_charge'
      OR v_prod.category_id = 'c6666666-6666-6666-6666-666666666666'::uuid
      OR v_prod.name ILIKE '%door charge%'
    );

    -- 2. Base Price Determination
    IF v_is_door_charge AND v_item.unit_price IS NOT NULL AND v_item.unit_price > 0 THEN
      v_base_price := v_item.unit_price;
    ELSE
      v_base_price := v_prod.base_price;
    END IF;

    -- Validate Variant (if provided)
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

      v_var_temp := v_var.temperature;
      v_var_size := v_var.size_label;
      v_base_price := v_var.price;
    END IF;

    v_effective_unit_price := v_base_price;

    -- 3. Validate Flavor Variant Groups cardinality & assignments (skip for door charge)
    IF NOT v_is_door_charge THEN
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
    END IF;

    -- 6. Insert Order Item
    v_item_id := COALESCE(v_item.id, gen_random_uuid());

    IF v_is_door_charge THEN
      v_status := 'SERVED'::public.item_status;
      v_station_target := 'bar'::public.station_target;
    ELSE
      v_status := COALESCE(NULLIF(upper(v_item.status), '')::public.item_status, 'PENDING'::public.item_status);
      v_station_target := COALESCE(NULLIF(lower(v_item.station_target), '')::public.station_target, v_prod.station_target, 'bar'::public.station_target);
    END IF;

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
      is_depleted,
      delivered_at,
      state_changed_at
    ) VALUES (
      v_item_id,
      p_order_id,
      v_item.product_id,
      v_item.event_id,
      v_item.variant_id,
      COALESCE(v_item.temperature, v_var_temp),
      COALESCE(v_item.size_label, v_var_size),
      COALESCE(v_item.quantity, 1),
      v_effective_unit_price,
      v_station_target,
      v_status,
      COALESCE(v_item.modifiers, '[]'::jsonb),
      v_item.notes,
      false,
      CASE WHEN v_status = 'SERVED' THEN v_now ELSE NULL END,
      v_now
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
      'status', v_status,
      'delivered_at', CASE WHEN v_status = 'SERVED' THEN v_now ELSE NULL END,
      'state_changed_at', v_now
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'items', v_inserted_items
  );
END;
$$;

-- 5. Exclude Door Charge from Station Runner Print Chits
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

  -- 3. Build rich items json for thermal print chit (exclude door charge)
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
      pv.temperature,
      pv.size_label
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.order_id = p_order_id
      AND (c.slug IS NULL OR c.slug != 'door_charge')
      AND p.name != 'Event Door Charge'
    ORDER BY oi.created_at ASC
  LOOP
    -- Format readable item description with temperature and size
    v_item_display_name := v_item.product_name;
    IF v_item.temperature IS NOT NULL AND v_item.temperature NOT IN ('NONE', 'ROOM') THEN
      v_item_display_name := v_item_display_name || ' (' || 
        CASE WHEN v_item.temperature = 'HOT' THEN 'Hot' ELSE 'Iced' END;
      IF v_item.size_label IS NOT NULL AND v_item.size_label != 'Standard' THEN
        v_item_display_name := v_item_display_name || ' · ' || v_item.size_label;
      END IF;
      v_item_display_name := v_item_display_name || ')';
    ELSIF v_item.size_label IS NOT NULL AND v_item.size_label != 'Standard' THEN
      v_item_display_name := v_item_display_name || ' (' || v_item.size_label || ')';
    END IF;

    v_items_json := v_items_json || jsonb_build_object(
      'name', v_item_display_name,
      'productName', v_item.product_name,
      'temperature', v_item.temperature,
      'size', v_item.size_label,
      'quantity', v_item.quantity,
      'price', v_item.unit_price,
      'unit_price', v_item.unit_price,
      'total', (v_item.unit_price * v_item.quantity),
      'station', v_item.station_target,
      'stationTarget', v_item.station_target,
      'modifiers', COALESCE(v_item.modifiers, '[]'::jsonb),
      'notes', COALESCE(v_item.notes, '')
    );
  END LOOP;

  -- 4. Atomically enqueue Runner Chit print job for the thermal terminal only if kitchen/bar items exist
  IF jsonb_array_length(v_items_json) > 0 THEN
    v_chit_data := jsonb_build_object(
      'orderId', p_order_id,
      'orderNumber', v_order.order_number,
      'roundNumber', COALESCE(v_order.round_number, 1),
      'tableNumber', CASE WHEN v_table_number IS NOT NULL THEN (regexp_replace(v_table_number, '[^0-9]', '', 'g'))::integer ELSE NULL END,
      'tableLabel', v_table_number,
      'tabName', v_tab.customer_name,
      'waiterName', COALESCE(v_staff_name, 'Staff'),
      'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI'),
      'items', v_items_json
    );

    INSERT INTO public.print_jobs (
      job_type,
      printer_target,
      status,
      payload
    ) VALUES (
      'ORDER_CHIT',
      'station:runner',
      'PENDING',
      v_chit_data
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'items_count', jsonb_array_length(v_items_json)
  );
END;
$$;

-- 6. RPC: Atomic Upsert of Door Charge on Tab
CREATE OR REPLACE FUNCTION public.upsert_tab_door_charge(
  p_tab_id UUID,
  p_quantity INT,
  p_unit_price NUMERIC,
  p_event_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab RECORD;
  v_order_id UUID;
  v_existing_item RECORD;
  v_door_charge_prod_id CONSTANT UUID := 'd1000001-0000-0000-0000-000000000001'::UUID;
BEGIN
  SELECT * INTO v_tab FROM public.tabs WHERE id = p_tab_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tab not found: %', p_tab_id;
  END IF;

  -- 1. Find existing active door charge item on this tab
  SELECT oi.* INTO v_existing_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.tab_id = p_tab_id
    AND (
      oi.product_id = v_door_charge_prod_id
      OR oi.product_id IN (
        SELECT id FROM public.products WHERE category_id = 'c6666666-6666-6666-6666-666666666666'::UUID
      )
    )
    AND oi.status != 'CANCELLED'
  ORDER BY oi.created_at DESC
  LIMIT 1;

  -- If quantity <= 0, cancel existing item if any
  IF p_quantity <= 0 THEN
    IF v_existing_item.id IS NOT NULL THEN
      UPDATE public.order_items
      SET status = 'CANCELLED',
          state_changed_at = now(),
          notes = COALESCE(p_notes, 'Door charge removed / voided'),
          updated_at = now()
      WHERE id = v_existing_item.id;

      RETURN jsonb_build_object('success', true, 'action', 'removed', 'item_id', v_existing_item.id);
    END IF;
    RETURN jsonb_build_object('success', true, 'action', 'none');
  END IF;

  -- 2. If exists, update quantity and price
  IF v_existing_item.id IS NOT NULL THEN
    UPDATE public.order_items
    SET quantity = p_quantity,
        unit_price = p_unit_price,
        event_id = COALESCE(p_event_id, v_existing_item.event_id),
        notes = COALESCE(p_notes, v_existing_item.notes),
        status = 'SERVED',
        state_changed_at = now(),
        updated_at = now()
    WHERE id = v_existing_item.id;

    RETURN jsonb_build_object(
      'success', true, 
      'action', 'updated', 
      'item_id', v_existing_item.id,
      'quantity', p_quantity,
      'unit_price', p_unit_price
    );
  END IF;

  -- 3. Otherwise find or create an order on this tab to attach the door charge
  SELECT id INTO v_order_id
  FROM public.orders
  WHERE tab_id = p_tab_id AND status != 'CANCELLED'
  ORDER BY round_number ASC, created_at ASC
  LIMIT 1;

  IF v_order_id IS NULL THEN
    INSERT INTO public.orders (
      tab_id,
      order_number,
      order_type,
      order_channel,
      round_number,
      status
    ) VALUES (
      p_tab_id,
      '#DC-' || substring(p_tab_id::text from 1 for 4),
      v_tab.order_type,
      v_tab.order_channel,
      1,
      'OPEN'
    ) RETURNING id INTO v_order_id;
  END IF;

  -- Insert Door Charge item directly as SERVED
  INSERT INTO public.order_items (
    order_id,
    product_id,
    event_id,
    quantity,
    unit_price,
    station_target,
    status,
    notes,
    delivered_at,
    state_changed_at,
    is_depleted
  ) VALUES (
    v_order_id,
    v_door_charge_prod_id,
    p_event_id,
    p_quantity,
    p_unit_price,
    'bar',
    'SERVED',
    p_notes,
    now(),
    now(),
    false
  ) RETURNING id INTO v_existing_item.id;

  RETURN jsonb_build_object(
    'success', true, 
    'action', 'inserted', 
    'item_id', v_existing_item.id,
    'order_id', v_order_id,
    'quantity', p_quantity,
    'unit_price', p_unit_price
  );
END;
$$;

-- 7. Update cancel_order_item_with_restoral to avoid logging waste for door charge
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
  v_cat_slug TEXT;
  v_prod_name TEXT;
  v_is_door_charge BOOLEAN := false;
  v_is_post_prep BOOLEAN := false;
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

  -- Detect Door Charge items
  SELECT c.slug, p.name INTO v_cat_slug, v_prod_name
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE p.id = v_item.product_id;

  v_is_door_charge := (
    v_cat_slug = 'door_charge' 
    OR v_item.product_id = 'd1000001-0000-0000-0000-000000000001'::UUID 
    OR v_prod_name ILIKE '%door charge%'
  );

  v_is_post_prep := (v_item.status IN ('ready', 'served') OR v_item.is_depleted);

  -- Only log food/beverage waste if NOT door charge cover
  IF v_is_post_prep AND NOT v_is_door_charge THEN
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
  END IF;

  -- Update order item status to CANCELLED
  UPDATE public.order_items
  SET status = 'CANCELLED',
      state_changed_at = now(),
      notes = COALESCE(notes || ' | Voided: ' || p_reason, 'Voided: ' || p_reason),
      updated_at = now()
  WHERE id = p_order_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'status', 'CANCELLED',
    'is_door_charge', v_is_door_charge
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.dispatch_order_with_selections(UUID, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_order_round_atomic(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_tab_door_charge(UUID, INT, NUMERIC, UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_item_with_restoral(UUID, TEXT, UUID) TO anon, authenticated, service_role;
