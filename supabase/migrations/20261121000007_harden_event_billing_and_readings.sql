-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Harden Event Billing, Transfers, Stock & Readings
-- Migration: 20261121000007_harden_event_billing_and_readings.sql
-- ==============================================================================
-- 1. dispatch_order_with_selections: Allow explicit 0.00 Door Charge unit_price
--    without falling back to product base_price.
-- 2. cancel_order_item_with_restoral: Fix unreachable stock-restoral ELSIF branch
--    when pre-prep items are marked depleted.
-- 3. transfer_order_items_to_tab: Preserve source tab operating_mode even when
--    splitting an Event-mode check after the 6:00 AM trigger cutoff.
-- 4. settle_tab_and_record_payment: Deduplicate rapid prepaid retries
--    (p_keep_open_for_prep = true) and format receipt timestamp in Asia/Manila.
-- 5. complete_off_premise_tab: Never fabricate DIGITAL_WALLET payment for unpaid
--    TAKEOUT orders (strictly reserve auto-payment for ONLINE_DELIVERY).
-- 6. get_event_door_charge_summary: Exclude cancelled orders/items and align
--    unlinked event_id date matching to the 6:00 AM Asia/Manila business day.
-- 7. get_current_x_reading:
--    - Exclude Y/Z cash variance audit logs from safe_drops
--    - Use strict > closed_at cutoff to avoid Z-close variance leakage at now()
--    - Prevent per-drawer Y/Z closes from wiping consolidated totals
--    - Sum main + bar floats (or defaults) accurately for consolidated scope
--    - Count distinct checkouts (tab_id) so split tenders do not inflate tx_count

-- 1. dispatch_order_with_selections (allow explicit >= 0 Door Charge unit_price)
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
    v_var_temp := NULL;
    v_var_size := NULL;

    SELECT id, name, category_id, base_price, station_target, is_available
    INTO v_prod
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND THEN
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

    v_is_door_charge := (
      v_prod.id = 'd1000001-0000-0000-0000-000000000001'::uuid
      OR v_item.category_slug = 'door_charge'
      OR v_prod.category_id = 'c6666666-6666-6666-6666-666666666666'::uuid
      OR v_prod.name ILIKE '%door charge%'
    );

    -- Allow explicit 0.00 door charge price when event has no door charge
    IF v_is_door_charge AND v_item.unit_price IS NOT NULL AND v_item.unit_price >= 0 THEN
      v_base_price := v_item.unit_price;
    ELSE
      v_base_price := v_prod.base_price;
    END IF;

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
    )
    ON CONFLICT (id) DO NOTHING;

    IF v_item.variant_selections IS NOT NULL AND jsonb_array_length(v_item.variant_selections) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM public.order_item_variant_selections WHERE order_item_id = v_item_id) THEN
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

-- 2. cancel_order_item_with_restoral (make PENDING stock restoral reachable)
CREATE OR REPLACE FUNCTION public.cancel_order_item_with_restoral(
  p_order_item_id UUID,
  p_staff_id UUID DEFAULT NULL::UUID,
  p_reason TEXT DEFAULT 'Customer Cancellation'
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
  v_ing RECORD;
  v_ing_qty NUMERIC(10,3);
  v_balance_before NUMERIC(10,3);
  v_balance_after NUMERIC(10,3);
  v_restored_stock BOOLEAN := false;
  v_waste_logged BOOLEAN := false;
  v_waste_reason public.waste_reason;
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

  SELECT c.slug, p.name INTO v_cat_slug, v_prod_name
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE p.id = v_item.product_id;

  v_is_door_charge := (
    v_cat_slug = 'door_charge'
    OR v_item.product_id = 'd1000001-0000-0000-0000-000000000001'::UUID
    OR COALESCE(v_prod_name, '') ILIKE '%door charge%'
  );

  -- Only items that entered prep/ready/served are post-prep waste; PENDING depleted items restore stock
  v_is_post_prep := (v_item.status IN ('PREPARING', 'READY', 'SERVED'));

  IF COALESCE(p_reason, '') ILIKE '%prep%' THEN
    v_waste_reason := 'PREPARATION_ERROR';
  ELSIF COALESCE(p_reason, '') ILIKE '%spill%' OR COALESCE(p_reason, '') ILIKE '%drop%' THEN
    v_waste_reason := 'DROPPED_SPILL';
  ELSIF COALESCE(p_reason, '') ILIKE '%expir%' THEN
    v_waste_reason := 'EXPIRED';
  ELSIF COALESCE(p_reason, '') ILIKE '%staff%' OR COALESCE(p_reason, '') ILIKE '%tast%' THEN
    v_waste_reason := 'STAFF_TASTING';
  ELSE
    v_waste_reason := 'CUSTOMER_RETURN';
  END IF;

  IF NOT v_is_door_charge THEN
    FOR v_ing IN
      SELECT
        pi.inventory_item_id,
        pi.amount,
        COALESCE(pi.conversion_factor, 1.0) AS conversion_factor,
        COALESCE(ii.unit_cost, 0.00) AS unit_cost
      FROM public.product_ingredients pi
      JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
      WHERE pi.product_id = v_item.product_id
        AND (pi.variant_id IS NULL OR pi.variant_id = v_item.variant_id)
    LOOP
      v_ing_qty := (v_ing.amount * v_item.quantity * v_ing.conversion_factor);

      IF v_is_post_prep THEN
        INSERT INTO public.waste_logs (
          inventory_item_id,
          quantity,
          cost_lost,
          reason,
          reported_by_id
        ) VALUES (
          v_ing.inventory_item_id,
          v_ing_qty,
          ROUND((v_ing_qty * v_ing.unit_cost)::numeric, 2),
          v_waste_reason,
          p_staff_id
        );
        v_waste_logged := true;
      ELSIF COALESCE(v_item.is_depleted, false) THEN
        SELECT current_stock INTO v_balance_before
        FROM public.inventory_items
        WHERE id = v_ing.inventory_item_id
        FOR UPDATE;

        v_balance_after := COALESCE(v_balance_before, 0) + v_ing_qty;

        UPDATE public.inventory_items
        SET current_stock = v_balance_after, updated_at = now()
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
          v_ing_qty,
          COALESCE(v_balance_before, 0),
          v_balance_after,
          'RESTORE-' || substring(p_order_item_id::text from 1 for 8)
        );
        v_restored_stock := true;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.order_items
  SET status = 'CANCELLED',
      is_depleted = false,
      state_changed_at = now(),
      notes = COALESCE(notes || ' | Voided: ' || p_reason, 'Voided: ' || p_reason),
      updated_at = now()
  WHERE id = p_order_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'status', 'CANCELLED',
    'restoredStock', v_restored_stock,
    'wasteLogged', v_waste_logged,
    'is_door_charge', v_is_door_charge
  );
END;
$$;

-- 3. transfer_order_items_to_tab (preserve source operating_mode past 6 AM cutoff)
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
  v_source_round INT := 1;
BEGIN
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

    -- Explicitly preserve source tab's operating_mode past BEFORE INSERT 6 AM trigger
    UPDATE public.tabs
    SET operating_mode = COALESCE(v_source_tab.operating_mode, 'CAFE'),
        updated_at = now()
    WHERE id = v_target_tab_id
      AND operating_mode IS DISTINCT FROM COALESCE(v_source_tab.operating_mode, 'CAFE');
  ELSE
    PERFORM 1 FROM public.tabs WHERE id = v_target_tab_id FOR UPDATE;
  END IF;

  IF v_effective_table_id IS NOT NULL THEN
    UPDATE public.tables
    SET is_occupied = true, updated_at = now()
    WHERE id = v_effective_table_id;
  END IF;

  SELECT id INTO v_target_order_id
  FROM public.orders
  WHERE tab_id = v_target_tab_id AND status != 'CANCELLED'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_target_order_id IS NULL THEN
    SELECT COALESCE(MAX(round_number), 1) INTO v_source_round
    FROM public.orders WHERE tab_id = p_source_tab_id;

    v_new_order_number := 'ORD-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));
    INSERT INTO public.orders (
      tab_id,
      order_number,
      order_type,
      order_channel,
      round_number,
      status
    ) VALUES (
      v_target_tab_id,
      v_new_order_number,
      v_source_tab.order_type,
      v_source_tab.order_channel,
      COALESCE(v_source_round, 1),
      'OPEN'
    ) RETURNING id INTO v_target_order_id;
  END IF;

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
        UPDATE public.order_items
        SET order_id = v_target_order_id,
            updated_at = now()
        WHERE id = v_item_id;
      ELSE
        UPDATE public.order_items
        SET quantity = v_item.quantity - v_qty_to_move,
            updated_at = now()
        WHERE id = v_item_id;

        v_new_item_id := gen_random_uuid();
        INSERT INTO public.order_items (
          id,
          order_id,
          product_id,
          event_id,
          quantity,
          unit_price,
          modifiers,
          notes,
          status,
          station_target,
          is_depleted,
          variant_id,
          temperature,
          size_label,
          preparing_at,
          ready_at,
          delivered_at,
          state_changed_at
        ) VALUES (
          v_new_item_id,
          v_target_order_id,
          v_item.product_id,
          v_item.event_id,
          v_qty_to_move,
          v_item.unit_price,
          v_item.modifiers,
          v_item.notes,
          v_item.status,
          v_item.station_target,
          v_item.is_depleted,
          v_item.variant_id,
          v_item.temperature,
          v_item.size_label,
          v_item.preparing_at,
          v_item.ready_at,
          v_item.delivered_at,
          v_item.state_changed_at
        );

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

-- 4. settle_tab_and_record_payment (prepaid double-tap dedup & Asia/Manila receipt timestamp)
CREATE OR REPLACE FUNCTION public.settle_tab_and_record_payment(
  p_tab_id UUID,
  p_staff_id UUID,
  p_payment_method public.payment_method,
  p_amount NUMERIC,
  p_corkage_amount NUMERIC DEFAULT 0.00,
  p_discount_amount NUMERIC DEFAULT 0.00,
  p_tip_amount NUMERIC DEFAULT 0.00,
  p_notes TEXT DEFAULT NULL,
  p_keep_open_for_prep BOOLEAN DEFAULT false,
  p_payment_channel TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL,
  p_service_charge NUMERIC DEFAULT 0.00,
  p_vatable_sales NUMERIC DEFAULT NULL,
  p_vat_amount NUMERIC DEFAULT NULL,
  p_vat_exempt_sales NUMERIC DEFAULT NULL,
  p_discount_type TEXT DEFAULT NULL,
  p_senior_pwd_id TEXT DEFAULT NULL,
  p_senior_pwd_name TEXT DEFAULT NULL,
  p_tendered_amount NUMERIC DEFAULT NULL,
  p_drawer_target TEXT DEFAULT NULL,
  p_should_print_receipt BOOLEAN DEFAULT true,
  p_tenders JSONB DEFAULT NULL,
  p_group_tab_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab RECORD;
  v_all_tab_ids UUID[];
  v_clean_group_ids UUID[];
  v_payment_id UUID;
  v_staff_name TEXT := 'Staff';
  v_staff_role TEXT := '';
  v_table_number TEXT := NULL;
  v_receipt_data JSONB;
  v_final_status public.tab_status;
  v_items_json JSONB := '[]'::jsonb;
  v_item RECORD;
  v_item_display_name TEXT;
  v_items_subtotal NUMERIC(10, 2) := 0.00;
  v_vatable_sales NUMERIC(10, 2);
  v_vat_amount NUMERIC(10, 2);
  v_vat_exempt_sales NUMERIC(10, 2);
  v_gross_sales NUMERIC(10, 2) := 0.00;
  v_service_charge NUMERIC(10, 2) := COALESCE(p_service_charge, 0.00);
  v_effective_drawer TEXT := 'main';
  v_tendered NUMERIC(10, 2) := 0.00;
  v_change NUMERIC(10, 2) := 0.00;
  v_parsed_table_num INT := NULL;
  v_open_tabs_remaining INT := 0;

  v_tender RECORD;
  v_has_split_tenders BOOLEAN := false;
  v_tender_method_text TEXT;
  v_tender_method public.payment_method;
  v_tender_amount NUMERIC(10, 2);
  v_tender_tendered NUMERIC(10, 2);
  v_tender_channel TEXT;
  v_tender_ref TEXT;
  v_tender_row_id UUID;
  v_total_cash_amount NUMERIC(10, 2) := 0.00;
  v_total_tendered_sum NUMERIC(10, 2) := 0.00;
  v_tender_breakdown JSONB := '[]'::jsonb;
  v_has_cash_tender BOOLEAN := false;
BEGIN
  SELECT ARRAY(
    SELECT DISTINCT t_id
    FROM unnest(ARRAY[p_tab_id] || COALESCE(p_group_tab_ids, ARRAY[]::UUID[])) AS u(t_id)
    WHERE t_id IS NOT NULL
    ORDER BY t_id
  ) INTO v_all_tab_ids;

  SELECT NULLIF(ARRAY(
    SELECT DISTINCT g_id
    FROM unnest(COALESCE(p_group_tab_ids, ARRAY[]::UUID[])) AS u(g_id)
    WHERE g_id IS NOT NULL AND g_id <> p_tab_id
    ORDER BY g_id
  ), ARRAY[]::UUID[]) INTO v_clean_group_ids;

  PERFORM 1 FROM public.tabs WHERE id = ANY(v_all_tab_ids) ORDER BY id FOR UPDATE;

  SELECT id, table_id, customer_name, order_type, order_channel, external_order_ref, status, operating_mode, is_prepaid, ticket_number
  INTO v_tab
  FROM public.tabs
  WHERE id = p_tab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tab not found: %', p_tab_id;
  END IF;

  IF (v_tab.status = 'BILLED' OR v_tab.status = 'CLOSED') AND NOT p_keep_open_for_prep THEN
    SELECT id INTO v_payment_id FROM public.payments WHERE tab_id = p_tab_id ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'tab_id', v_tab.id,
      'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
      'status', v_tab.status,
      'is_prepaid', true,
      'payment_channel', p_payment_channel,
      'reference_number', p_reference_number
    );
  END IF;

  -- Idempotency guard for rapid double-tap on prepaid takeout intake
  IF p_keep_open_for_prep AND COALESCE(v_tab.is_prepaid, false) THEN
    SELECT id INTO v_payment_id
    FROM public.payments
    WHERE tab_id = p_tab_id
      AND created_at > now() - interval '30 seconds'
      AND ABS(amount - p_amount) < 0.01
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_payment_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'tab_id', v_tab.id,
        'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
        'status', v_tab.status,
        'is_prepaid', true,
        'deduplicated', true
      );
    END IF;
  END IF;

  IF p_staff_id IS NOT NULL THEN
    SELECT display_name, COALESCE(role::text, '') INTO v_staff_name, v_staff_role
    FROM public.users WHERE id = p_staff_id;
  END IF;

  IF p_drawer_target IS NOT NULL AND lower(p_drawer_target) IN ('main', 'bar') THEN
    v_effective_drawer := lower(p_drawer_target);
  ELSIF (v_tab.order_channel IS NOT NULL AND (v_tab.order_channel::text) ILIKE '%bar%')
     OR v_staff_role IN ('station_bar', 'station_cafe', 'bartender', 'barista') THEN
    v_effective_drawer := 'bar';
  ELSE
    v_effective_drawer := 'main';
  END IF;

  IF v_tab.table_id IS NOT NULL THEN
    SELECT table_number INTO v_table_number FROM public.tables WHERE id = v_tab.table_id;
    IF v_table_number IS NOT NULL THEN
      v_parsed_table_num := NULLIF(regexp_replace(v_table_number, '[^0-9]', '', 'g'), '')::integer;
    END IF;
  END IF;

  FOR v_item IN
    SELECT
      oi.id AS order_item_id,
      oi.product_id,
      oi.quantity,
      oi.unit_price,
      oi.status,
      oi.station_target,
      oi.notes,
      COALESCE(oi.temperature, pv.temperature) AS temperature,
      COALESCE(oi.size_label, pv.size_label) AS size_label,
      oi.modifiers,
      oi.created_at,
      p.name AS product_name,
      (
        SELECT string_agg(oivs.option_name_snapshot, ', ' ORDER BY oivs.created_at ASC)
        FROM public.order_item_variant_selections oivs
        WHERE oivs.order_item_id = oi.id
      ) AS flavor_summary
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE o.tab_id = ANY(v_all_tab_ids)
      AND oi.status != 'CANCELLED'
    ORDER BY o.round_number ASC, oi.created_at ASC
  LOOP
    v_item_display_name := COALESCE(v_item.product_name, 'Custom Item');
    IF v_item.flavor_summary IS NOT NULL AND v_item.flavor_summary <> '' THEN
      v_item_display_name := v_item_display_name || ' (' || v_item.flavor_summary || ')';
    END IF;
    v_items_subtotal := v_items_subtotal + (v_item.unit_price * v_item.quantity);

    v_items_json := v_items_json || jsonb_build_object(
      'id', v_item.order_item_id,
      'product_id', v_item.product_id,
      'productName', v_item_display_name,
      'name', v_item_display_name,
      'quantity', v_item.quantity,
      'unit_price', v_item.unit_price,
      'unitPrice', v_item.unit_price,
      'price', v_item.unit_price,
      'totalPrice', (v_item.unit_price * v_item.quantity),
      'status', v_item.status,
      'station_target', v_item.station_target,
      'notes', v_item.notes,
      'temperature', v_item.temperature,
      'sizeLabel', v_item.size_label,
      'modifiers', COALESCE(v_item.modifiers, '[]'::jsonb)
    );
  END LOOP;

  v_gross_sales := v_items_subtotal;

  IF p_vatable_sales IS NOT NULL AND p_vat_amount IS NOT NULL THEN
    v_vatable_sales := p_vatable_sales;
    v_vat_amount := p_vat_amount;
    v_vat_exempt_sales := COALESCE(p_vat_exempt_sales, 0.00);
  ELSIF p_discount_amount > 0 AND (p_discount_type IN ('SENIOR_CITIZEN', 'PWD') OR p_discount_type IS NULL) THEN
    v_vat_exempt_sales := ROUND((v_gross_sales / 1.12), 2);
    v_vatable_sales := 0.00;
    v_vat_amount := 0.00;
  ELSE
    v_vatable_sales := ROUND((GREATEST(0, p_amount - v_service_charge - COALESCE(p_corkage_amount, 0.00)) / 1.12), 2);
    v_vat_amount := GREATEST(0, p_amount - v_service_charge - COALESCE(p_corkage_amount, 0.00)) - v_vatable_sales;
    v_vat_exempt_sales := 0.00;
  END IF;

  IF p_tenders IS NOT NULL AND jsonb_typeof(p_tenders) = 'array' AND jsonb_array_length(p_tenders) > 0 THEN
    v_has_split_tenders := true;
  END IF;

  IF v_has_split_tenders THEN
    v_change := 0.00;
    v_total_tendered_sum := 0.00;

    FOR v_tender IN SELECT * FROM jsonb_to_recordset(p_tenders) AS x(
      payment_method TEXT,
      amount NUMERIC,
      tendered_amount NUMERIC,
      payment_channel TEXT,
      reference_number TEXT,
      notes TEXT
    ) LOOP
      v_tender_method_text := upper(COALESCE(v_tender.payment_method, 'CASH'));
      v_tender_method := v_tender_method_text::public.payment_method;
      v_tender_amount := COALESCE(v_tender.amount, 0.00);
      v_tender_tendered := COALESCE(v_tender.tendered_amount, v_tender_amount);
      v_tender_channel := v_tender.payment_channel;
      v_tender_ref := v_tender.reference_number;
      v_total_tendered_sum := v_total_tendered_sum + v_tender_tendered;

      IF v_tender_method = 'CASH' THEN
        v_has_cash_tender := true;
        v_total_cash_amount := v_total_cash_amount + v_tender_amount;
        IF v_tender_tendered > v_tender_amount THEN
          v_change := v_change + (v_tender_tendered - v_tender_amount);
        END IF;
      END IF;

      INSERT INTO public.payments (
        tab_id,
        staff_id,
        payment_method,
        amount,
        corkage_amount,
        discount_amount,
        tip_amount,
        notes,
        operating_mode,
        payment_channel,
        reference_number,
        service_charge,
        vatable_sales,
        vat_amount,
        vat_exempt_sales,
        discount_type,
        senior_pwd_id,
        senior_pwd_name,
        drawer_target,
        group_tab_ids
      ) VALUES (
        p_tab_id,
        p_staff_id,
        v_tender_method,
        v_tender_amount,
        0.00,
        0.00,
        0.00,
        COALESCE(v_tender.notes, p_notes, 'Split Tender'),
        COALESCE(v_tab.operating_mode, 'CAFE'),
        v_tender_channel,
        v_tender_ref,
        0.00,
        0.00,
        0.00,
        0.00,
        NULL,
        NULL,
        NULL,
        v_effective_drawer,
        v_clean_group_ids
      ) RETURNING id INTO v_tender_row_id;

      IF v_payment_id IS NULL THEN
        v_payment_id := v_tender_row_id;
      END IF;

      v_tender_breakdown := v_tender_breakdown || jsonb_build_object(
        'payment_id', v_tender_row_id,
        'payment_method', v_tender_method_text,
        'paymentMethod', v_tender_method_text,
        'amount', v_tender_amount,
        'tendered', v_tender_tendered,
        'payment_channel', v_tender_channel,
        'paymentChannel', v_tender_channel,
        'reference_number', v_tender_ref,
        'referenceNumber', v_tender_ref
      );
    END LOOP;

    v_tendered := GREATEST(p_amount, v_total_tendered_sum);

    UPDATE public.payments
    SET corkage_amount = p_corkage_amount,
        discount_amount = p_discount_amount,
        tip_amount = p_tip_amount,
        service_charge = v_service_charge,
        vatable_sales = v_vatable_sales,
        vat_amount = v_vat_amount,
        vat_exempt_sales = v_vat_exempt_sales,
        discount_type = p_discount_type,
        senior_pwd_id = p_senior_pwd_id,
        senior_pwd_name = p_senior_pwd_name
    WHERE id = v_payment_id;

  ELSE
    v_tendered := COALESCE(p_tendered_amount, p_amount);
    IF p_payment_method = 'CASH' AND v_tendered > p_amount THEN
      v_change := v_tendered - p_amount;
    END IF;

    INSERT INTO public.payments (
      tab_id,
      staff_id,
      payment_method,
      amount,
      corkage_amount,
      discount_amount,
      tip_amount,
      notes,
      operating_mode,
      payment_channel,
      reference_number,
      service_charge,
      vatable_sales,
      vat_amount,
      vat_exempt_sales,
      discount_type,
      senior_pwd_id,
      senior_pwd_name,
      drawer_target,
      group_tab_ids
    ) VALUES (
      p_tab_id,
      p_staff_id,
      p_payment_method,
      p_amount,
      p_corkage_amount,
      p_discount_amount,
      p_tip_amount,
      p_notes,
      COALESCE(v_tab.operating_mode, 'CAFE'),
      p_payment_channel,
      p_reference_number,
      v_service_charge,
      v_vatable_sales,
      v_vat_amount,
      v_vat_exempt_sales,
      p_discount_type,
      p_senior_pwd_id,
      p_senior_pwd_name,
      v_effective_drawer,
      v_clean_group_ids
    ) RETURNING id INTO v_payment_id;

    IF p_payment_method = 'CASH' THEN
      v_has_cash_tender := true;
      v_total_cash_amount := p_amount;
    END IF;

    v_tender_breakdown := jsonb_build_array(
      jsonb_build_object(
        'payment_id', v_payment_id,
        'payment_method', p_payment_method::text,
        'paymentMethod', p_payment_method::text,
        'amount', p_amount,
        'tendered', v_tendered,
        'payment_channel', p_payment_channel,
        'paymentChannel', p_payment_channel,
        'reference_number', p_reference_number,
        'referenceNumber', p_reference_number
      )
    );
  END IF;

  IF v_has_cash_tender AND v_total_cash_amount > 0 THEN
    INSERT INTO public.cash_drawer_transactions (
      action_type,
      amount,
      reason,
      performed_by_id,
      payment_id,
      drawer_target
    ) VALUES (
      'SALE',
      v_total_cash_amount,
      CASE
        WHEN v_tab.order_type = 'TAKEOUT' THEN 'Takeout Settlement (' || COALESCE(v_tab.ticket_number, 'To-Go') || ' • ' || v_tab.customer_name || ')'
        WHEN v_clean_group_ids IS NOT NULL THEN 'Table Group Settlement (' || COALESCE(v_table_number, v_tab.customer_name) || ')'
        ELSE 'Tab Settlement (' || v_tab.customer_name || ')'
      END,
      p_staff_id,
      v_payment_id,
      v_effective_drawer
    );
  END IF;

  v_receipt_data := jsonb_build_object(
    'receiptNumber', 'MD-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(v_payment_id::text from 1 for 4)),
    'payment_id', v_payment_id,
    'paymentId', v_payment_id,
    'tab_id', v_tab.id,
    'tabId', v_tab.id,
    'table_id', v_tab.table_id,
    'tableId', v_tab.table_id,
    'tableNumber', v_parsed_table_num,
    'tableLabel', v_table_number,
    'ticket_number', v_tab.ticket_number,
    'ticketNumber', v_tab.ticket_number,
    'customer_name', CASE WHEN v_clean_group_ids IS NOT NULL THEN COALESCE(v_table_number, v_tab.customer_name) || ' (All Tabs)' ELSE v_tab.customer_name END,
    'customerName', CASE WHEN v_clean_group_ids IS NOT NULL THEN COALESCE(v_table_number, v_tab.customer_name) || ' (All Tabs)' ELSE v_tab.customer_name END,
    'tabName', CASE WHEN v_clean_group_ids IS NOT NULL THEN 'All Tabs (' || (array_length(v_all_tab_ids, 1))::text || ')' ELSE v_tab.customer_name END,
    'order_type', v_tab.order_type,
    'orderType', v_tab.order_type,
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'operatingMode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'payment_method', CASE WHEN v_has_split_tenders THEN 'SPLIT' ELSE p_payment_method::text END,
    'paymentMethod', CASE WHEN v_has_split_tenders THEN 'SPLIT' ELSE p_payment_method::text END
  ) || jsonb_build_object(
    'payment_channel', p_payment_channel,
    'paymentChannel', p_payment_channel,
    'reference_number', p_reference_number,
    'referenceNumber', p_reference_number,
    'items', v_items_json,
    'subtotal', v_items_subtotal,
    'grossSales', v_gross_sales,
    'corkage_amount', p_corkage_amount,
    'corkageAmount', p_corkage_amount,
    'corkageFee', p_corkage_amount,
    'discount_amount', p_discount_amount,
    'discountAmount', p_discount_amount,
    'discount', p_discount_amount,
    'discountType', p_discount_type,
    'service_charge', v_service_charge,
    'serviceCharge', v_service_charge,
    'tip_amount', p_tip_amount,
    'tipAmount', p_tip_amount,
    'amount', p_amount,
    'total', p_amount
  ) || jsonb_build_object(
    'tendered', v_tendered,
    'change', v_change,
    'vatableSales', v_vatable_sales,
    'vatAmount', v_vat_amount,
    'vatExemptSales', v_vat_exempt_sales,
    'senior_pwd_id', p_senior_pwd_id,
    'seniorPwdId', p_senior_pwd_id,
    'senior_pwd_name', p_senior_pwd_name,
    'seniorPwdName', p_senior_pwd_name,
    'staff_name', v_staff_name,
    'staffName', v_staff_name,
    'waiterName', v_staff_name,
    'cashierName', v_staff_name,
    'settled_at', now(),
    'settledAt', now(),
    'timestamp', to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH24:MI'),
    'drawer_target', v_effective_drawer,
    'tender_breakdown', v_tender_breakdown,
    'tenderBreakdown', v_tender_breakdown,
    'isSplitPayment', v_has_split_tenders
  );

  IF p_should_print_receipt THEN
    INSERT INTO public.print_jobs (job_type, receipt_data, status)
    VALUES ('RECEIPT', v_receipt_data, 'PENDING');
  ELSIF v_has_cash_tender THEN
    INSERT INTO public.print_jobs (job_type, receipt_data, status)
    VALUES ('DRAWER_KICK', jsonb_build_object('isDiagnosticKick', true, 'drawer_target', v_effective_drawer), 'PENDING');
  END IF;

  IF p_keep_open_for_prep THEN
    v_final_status := 'OPEN';
    UPDATE public.tabs
    SET is_prepaid = true,
        corkage_amount = p_corkage_amount,
        has_corkage_fee = (p_corkage_amount > 0),
        updated_at = now()
    WHERE id = p_tab_id;
  ELSE
    v_final_status := 'BILLED';
    UPDATE public.tabs
    SET status = 'BILLED',
        is_prepaid = true,
        corkage_amount = CASE WHEN id = p_tab_id THEN p_corkage_amount ELSE corkage_amount END,
        has_corkage_fee = CASE WHEN id = p_tab_id THEN (p_corkage_amount > 0) ELSE has_corkage_fee END,
        updated_at = now()
    WHERE id = ANY(v_all_tab_ids);

    UPDATE public.orders
    SET status = 'COMPLETED',
        updated_at = now()
    WHERE tab_id = ANY(v_all_tab_ids) AND status IN ('OPEN', 'IN_PREPARATION', 'READY_TO_SERVE');

    UPDATE public.order_items
    SET status = 'SERVED',
        delivered_at = COALESCE(delivered_at, now()),
        state_changed_at = now(),
        updated_at = now()
    WHERE order_id IN (SELECT id FROM public.orders WHERE tab_id = ANY(v_all_tab_ids))
      AND status NOT IN ('SERVED', 'CANCELLED');

    IF v_tab.table_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_open_tabs_remaining
      FROM public.tabs
      WHERE table_id = v_tab.table_id AND status = 'OPEN';

      IF v_open_tabs_remaining = 0 THEN
        UPDATE public.tables
        SET is_occupied = false,
            updated_at = now()
        WHERE id = v_tab.table_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'tab_id', v_tab.id,
    'group_tab_ids', v_clean_group_ids,
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'status', v_final_status,
    'amount', p_amount,
    'service_charge', v_service_charge,
    'vatable_sales', v_vatable_sales,
    'vat_amount', v_vat_amount,
    'vat_exempt_sales', v_vat_exempt_sales,
    'drawer_target', v_effective_drawer,
    'is_split', v_has_split_tenders,
    'receipt_data', v_receipt_data
  );
END;
$$;

-- 5. complete_off_premise_tab (strictly avoid fabricating payment for unpaid TAKEOUT)
CREATE OR REPLACE FUNCTION public.complete_off_premise_tab(
  p_tab_id UUID,
  p_staff_id UUID DEFAULT NULL::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab RECORD;
  v_payment_id UUID;
  v_items_subtotal NUMERIC(10, 2) := 0.00;
  v_vatable_sales NUMERIC(10, 2) := 0.00;
  v_vat_amount NUMERIC(10, 2) := 0.00;
  v_grand_total NUMERIC(10, 2) := 0.00;
  v_payment_method public.payment_method;
BEGIN
  SELECT * INTO v_tab
  FROM public.tabs
  WHERE id = p_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tab not found: %', p_tab_id;
  END IF;

  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE tab_id = p_tab_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Never allow unpaid TAKEOUT tabs to auto-fabricate a digital wallet payment
  IF v_payment_id IS NULL AND v_tab.order_type = 'TAKEOUT' THEN
    RAISE EXCEPTION 'Takeout tab % must be paid at cashier before handoff completion', p_tab_id;
  END IF;

  UPDATE public.tabs
  SET status = 'BILLED',
      is_prepaid = true,
      updated_at = now()
  WHERE id = p_tab_id;

  UPDATE public.orders
  SET status = 'COMPLETED',
      updated_at = now()
  WHERE tab_id = p_tab_id AND status != 'CANCELLED';

  UPDATE public.order_items
  SET status = 'SERVED',
      delivered_at = COALESCE(delivered_at, now()),
      state_changed_at = now(),
      updated_at = now()
  WHERE order_id IN (SELECT id FROM public.orders WHERE tab_id = p_tab_id)
    AND status NOT IN ('SERVED', 'CANCELLED');

  IF v_payment_id IS NULL AND v_tab.order_type = 'ONLINE_DELIVERY' THEN
    SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0.00)
    INTO v_items_subtotal
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.tab_id = p_tab_id AND oi.status != 'CANCELLED';

    v_grand_total := v_items_subtotal;
    v_vatable_sales := ROUND(v_grand_total / 1.12, 2);
    v_vat_amount := v_grand_total - v_vatable_sales;

    IF (v_tab.order_channel::text) ILIKE '%grab%' THEN
      v_payment_method := 'GRAB_PAY_IN_APP';
    ELSIF (v_tab.order_channel::text) ILIKE '%panda%' THEN
      v_payment_method := 'FOODPANDA_IN_APP';
    ELSE
      v_payment_method := 'DIGITAL_WALLET';
    END IF;

    INSERT INTO public.payments (
      tab_id,
      staff_id,
      payment_method,
      amount,
      service_charge,
      vatable_sales,
      vat_amount,
      vat_exempt_sales,
      operating_mode,
      notes,
      drawer_target
    ) VALUES (
      p_tab_id,
      p_staff_id,
      v_payment_method,
      v_grand_total,
      0.00,
      v_vatable_sales,
      v_vat_amount,
      0.00,
      COALESCE(v_tab.operating_mode, 'CAFE'),
      'Auto-settled off-premise fulfillment',
      'main'
    ) RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tab_id', p_tab_id,
    'payment_id', v_payment_id,
    'status', 'BILLED'
  );
END;
$$;

-- 6. get_event_door_charge_summary (exclude cancelled tabs/orders & align to 6 AM Manila business day)
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

  SELECT
    COALESCE(SUM(oi.quantity), 0),
    COALESCE(SUM(oi.quantity * oi.unit_price), 0.00)
  INTO v_tickets_sold, v_gross_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.tabs t ON t.id = o.tab_id
  JOIN public.products p ON p.id = oi.product_id
  LEFT JOIN public.categories c ON c.id = p.category_id
  WHERE oi.status != 'CANCELLED'
    AND o.status != 'CANCELLED'
    AND t.status != 'CLOSED'
    AND (
      c.slug = 'door_charge'
      OR oi.product_id = 'd1000001-0000-0000-0000-000000000001'::UUID
    )
    AND (
      oi.event_id = p_event_id
      OR (
        oi.event_id IS NULL
        AND ((t.created_at AT TIME ZONE 'Asia/Manila') - interval '6 hours')::DATE = v_event.event_date
      )
    );

  IF v_event.split_type = 'percentage' THEN
    v_artist_share := ROUND((v_gross_sales * (v_event.artist_split_value / 100.0)), 2);
    v_venue_share := v_gross_sales - v_artist_share;
  ELSE
    v_artist_share := ROUND((v_tickets_sold * v_event.artist_split_value), 2);
    v_venue_share := GREATEST(0.00, v_gross_sales - v_artist_share);
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

-- 7. get_current_x_reading (isolated consolidated scope, variance-drop safe, accurate float & tx_count)
CREATE OR REPLACE FUNCTION public.get_current_x_reading(
  p_drawer TEXT DEFAULT 'consolidated',
  p_scope TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opened_at TIMESTAMPTZ;
  v_last_z_time TIMESTAMPTZ;
  v_last_y_time TIMESTAMPTZ;
  v_reading_cutoff TIMESTAMPTZ;
  v_is_strict_after BOOLEAN := false;
  v_business_day_start TIMESTAMPTZ;
  v_gross_sales NUMERIC(10, 2) := 0.00;
  v_discounts NUMERIC(10, 2) := 0.00;
  v_net_sales NUMERIC(10, 2) := 0.00;
  v_vatable_sales NUMERIC(10, 2) := 0.00;
  v_vat_amount NUMERIC(10, 2) := 0.00;
  v_vat_exempt_sales NUMERIC(10, 2) := 0.00;
  v_service_charge NUMERIC(10, 2) := 0.00;
  v_tender_cash NUMERIC(10, 2) := 0.00;
  v_tender_card NUMERIC(10, 2) := 0.00;
  v_tender_digital NUMERIC(10, 2) := 0.00;
  v_tender_delivery NUMERIC(10, 2) := 0.00;
  v_total_tender NUMERIC(10, 2) := 0.00;
  v_tx_count INT := 0;
  v_first_pid UUID := NULL;
  v_last_pid UUID := NULL;
  v_first_rno TEXT := NULL;
  v_last_rno TEXT := NULL;
  v_main_float NUMERIC(10, 2) := 0.00;
  v_bar_float NUMERIC(10, 2) := 0.00;
  v_cons_float NUMERIC(10, 2) := 0.00;
  v_opening_float NUMERIC(10, 2) := 0.00;
  v_cash_in NUMERIC(10, 2) := 0.00;
  v_cash_out NUMERIC(10, 2) := 0.00;
  v_safe_drops NUMERIC(10, 2) := 0.00;
  v_expected_cash NUMERIC(10, 2) := 0.00;
  v_cafe_sales NUMERIC(10, 2) := 0.00;
  v_event_sales NUMERIC(10, 2) := 0.00;
  v_cafe_tx_count INT := 0;
  v_event_tx_count INT := 0;
BEGIN
  v_business_day_start :=
    (date_trunc('day', (now() AT TIME ZONE 'Asia/Manila') - interval '6 hours') + interval '6 hours')
    AT TIME ZONE 'Asia/Manila';

  -- Closing bar/main individually must NOT reset consolidated cutoff, whereas closing consolidated resets all
  SELECT MAX(closed_at)
  INTO v_last_z_time
  FROM public.pos_z_readings
  WHERE drawer_target = p_drawer
     OR (p_drawer <> 'consolidated' AND drawer_target = 'consolidated');

  IF p_scope = 'shift' THEN
    SELECT MAX(closed_at)
    INTO v_last_y_time
    FROM public.pos_y_readings
    WHERE drawer_target = p_drawer
       OR (p_drawer <> 'consolidated' AND drawer_target = 'consolidated');

    v_reading_cutoff := GREATEST(v_last_z_time, v_last_y_time);
  ELSE
    v_reading_cutoff := v_last_z_time;
  END IF;

  IF v_reading_cutoff IS NOT NULL THEN
    v_opened_at := v_reading_cutoff;
    v_is_strict_after := true;
  ELSE
    v_opened_at := v_business_day_start;
    v_is_strict_after := false;
  END IF;

  -- Sales & Tender aggregation from payments
  SELECT
    COALESCE(SUM(amount + discount_amount), 0.00),
    COALESCE(SUM(discount_amount), 0.00),
    COALESCE(SUM(amount), 0.00),
    COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN payment_method = 'DIGITAL_WALLET' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN payment_method IN ('GRAB_PAY_IN_APP', 'FOODPANDA_IN_APP') THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(service_charge), 0.00),
    COALESCE(SUM(vatable_sales), 0.00),
    COALESCE(SUM(vat_amount), 0.00),
    COALESCE(SUM(vat_exempt_sales), 0.00),
    COUNT(DISTINCT COALESCE(tab_id::text, id::text)),
    (ARRAY_AGG(id ORDER BY created_at ASC))[1],
    (ARRAY_AGG(id ORDER BY created_at DESC))[1],
    COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN operating_mode != 'EVENT' OR operating_mode IS NULL THEN amount ELSE 0 END), 0.00),
    COUNT(DISTINCT COALESCE(tab_id::text, id::text)) FILTER (WHERE operating_mode = 'EVENT'),
    COUNT(DISTINCT COALESCE(tab_id::text, id::text)) FILTER (WHERE operating_mode != 'EVENT' OR operating_mode IS NULL)
  INTO
    v_gross_sales,
    v_discounts,
    v_net_sales,
    v_tender_cash,
    v_tender_card,
    v_tender_digital,
    v_tender_delivery,
    v_service_charge,
    v_vatable_sales,
    v_vat_amount,
    v_vat_exempt_sales,
    v_tx_count,
    v_first_pid,
    v_last_pid,
    v_event_sales,
    v_cafe_sales,
    v_event_tx_count,
    v_cafe_tx_count
  FROM public.payments
  WHERE (CASE WHEN v_is_strict_after THEN created_at > v_opened_at ELSE created_at >= v_opened_at END)
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  v_total_tender := v_tender_cash + v_tender_card + v_tender_digital + v_tender_delivery;

  IF v_first_pid IS NOT NULL THEN
    v_first_rno := 'MD-' || to_char(v_opened_at AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(v_first_pid::text from 1 for 4));
    v_last_rno := 'MD-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(v_last_pid::text from 1 for 4));
  END IF;

  -- Drawer Transactions aggregation (excluding Y/Z close cash variance audit logs from safe_drops)
  SELECT
    COALESCE(SUM(CASE WHEN action_type = 'FLOAT' AND COALESCE(drawer_target, 'main') = 'main' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'FLOAT' AND drawer_target = 'bar' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'FLOAT' AND drawer_target = 'consolidated' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_IN' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_OUT' THEN abs(amount) ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'DROP' AND COALESCE(reason, '') NOT ILIKE '%Variance%' THEN abs(amount) ELSE 0 END), 0.00)
  INTO
    v_main_float,
    v_bar_float,
    v_cons_float,
    v_cash_in,
    v_cash_out,
    v_safe_drops
  FROM public.cash_drawer_transactions
  WHERE (CASE WHEN v_is_strict_after THEN created_at > v_opened_at ELSE created_at >= v_opened_at END)
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  IF p_drawer = 'bar' THEN
    v_opening_float := CASE WHEN v_bar_float > 0 THEN v_bar_float ELSE 150.00 END;
  ELSIF p_drawer = 'consolidated' THEN
    v_opening_float := v_cons_float
      + (CASE WHEN v_main_float > 0 THEN v_main_float ELSE 200.00 END)
      + (CASE WHEN v_bar_float > 0 THEN v_bar_float ELSE 150.00 END);
  ELSE
    v_opening_float := CASE WHEN v_main_float > 0 THEN v_main_float ELSE 200.00 END;
  END IF;

  v_expected_cash := v_opening_float + v_tender_cash + v_cash_in - v_cash_out - v_safe_drops;

  RETURN jsonb_build_object(
    'reading_type', 'X_READING',
    'scope', p_scope,
    'drawer_target', p_drawer,
    'opened_at', v_opened_at,
    'generated_at', now(),
    'gross_sales', v_gross_sales,
    'discounts', v_discounts,
    'discount_total', v_discounts,
    'net_sales', v_net_sales,
    'vatable_sales', v_vatable_sales,
    'vat_amount', v_vat_amount,
    'vat_exempt_sales', v_vat_exempt_sales,
    'service_charge', v_service_charge,
    'tender_cash', v_tender_cash,
    'tender_card', v_tender_card,
    'tender_digital', v_tender_digital,
    'tender_delivery', v_tender_delivery,
    'total_tender', v_total_tender,
    'transaction_count', v_tx_count,
    'opening_float', v_opening_float,
    'cash_in', v_cash_in,
    'cash_out', v_cash_out,
    'safe_drops', v_safe_drops,
    'expected_cash', v_expected_cash,
    'first_payment_id', v_first_pid,
    'last_payment_id', v_last_pid,
    'first_receipt_no', v_first_rno,
    'last_receipt_no', v_last_rno,
    'first_receipt_number', v_first_rno,
    'last_receipt_number', v_last_rno,
    'cafe_net_sales', v_cafe_sales,
    'event_net_sales', v_event_sales,
    'cafe_sales', v_cafe_sales,
    'event_sales', v_event_sales,
    'cafe_tx_count', v_cafe_tx_count,
    'event_tx_count', v_event_tx_count
  );
END;
$$;
