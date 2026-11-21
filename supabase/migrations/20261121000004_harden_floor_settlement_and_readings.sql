-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Floor Movement & Bill Settlement Audit Hardening
-- Migration: 20261121000004_harden_floor_settlement_and_readings.sql
--
-- Fixes & Hardening:
--   1. public.payments.group_tab_ids: Links table-group settlements atomically
--      without creating bogus ₱0 CASH payment rows that skew X/Y/Z readings.
--   2. public.settle_tab_and_record_payment:
--      - Adds p_group_tab_ids UUID[] DEFAULT NULL so Entire-Table settlements
--        aggregate ALL tabs' non-cancelled items onto a single receipt & bill,
--        cascade all tabs/orders/items atomically, and prevent deadlocks.
--      - Separates split-tender vs single-tender change/tendered math.
--   3. public.cancel_order_item_with_restoral:
--      - Fixes SQLSTATE 22P02 enum crash ('ready','served' -> 'PREPARING','READY','SERVED').
--   4. public.dispatch_order_with_depletion & dispatch_order_round_atomic:
--      - Excludes Door Charge & cancelled items from Runner Chits.
--      - Safe non-numeric table handling ('Window', 'Conference').
--      - Fixes non-existent print_jobs columns in dispatch_order_round_atomic.
--   5. public.transfer_order_items_to_tab:
--      - Preserves round_number, event_id, and stage timestamps on split items.
--   6. public.close_shift_and_generate_z_reading:
--      - Fixes cafe_net_sales / event_net_sales key lookup & vat_exempt_sales slip field.
-- ==============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS group_tab_ids UUID[] DEFAULT NULL;

-- Drop all existing overloads of settle_tab_and_record_payment cleanly
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'settle_tab_and_record_payment'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END;
$$;

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

  -- Split tender variables
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
  -- Normalize group tab list (always includes primary p_tab_id)
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
  ), ARRAY[]::UUID[]) INTO v_clean_group_ids;

  -- 1. Lock all participating tabs in deterministic order to avoid deadlocks
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

  -- 2. Staff information & drawer target determination
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

  -- 3. Aggregate all non-cancelled order items across the settled tab(s)
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

  -- 4. Philippine Statutory Tax & Discount computations
  IF p_vatable_sales IS NOT NULL AND p_vat_amount IS NOT NULL THEN
    v_vatable_sales := p_vatable_sales;
    v_vat_amount := p_vat_amount;
    v_vat_exempt_sales := COALESCE(p_vat_exempt_sales, 0.00);
  ELSIF p_discount_amount > 0 AND (p_discount_type IN ('SENIOR_CITIZEN', 'PWD') OR p_discount_type IS NULL) THEN
    v_vat_exempt_sales := ROUND((v_gross_sales / 1.12), 2);
    v_vatable_sales := 0.00;
    v_vat_amount := 0.00;
  ELSE
    v_vatable_sales := ROUND((GREATEST(0, p_amount - v_service_charge) / 1.12), 2);
    v_vat_amount := GREATEST(0, p_amount - v_service_charge) - v_vatable_sales;
    v_vat_exempt_sales := 0.00;
  END IF;

  -- 5. Split-Tenders vs Single-Tender Evaluation
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

    -- Update primary payment record with overall tax & discount fields
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
    -- Single tender checkout
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

  -- 6. Record Cash Drawer Transaction for CASH portions
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

  -- 7. Thermal Print Jobs (Receipt vs Pure Drawer Kick)
  v_receipt_data := jsonb_build_object(
    'receiptNumber', 'MD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(v_payment_id::text from 1 for 4)),
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
    'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI'),
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

  -- 8. Update Tab(s) status & order cascade
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

    -- Auto-release physical table occupancy if no more open tabs remain on the table
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

-- ==============================================================================
-- 2. Fix cancel_order_item_with_restoral (uppercase public.item_status enum)
-- ==============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = 'cancel_order_item_with_restoral'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', r.sig);
  END LOOP;
END;
$$;

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
  v_ing RECORD;
  v_cat_slug TEXT;
  v_prod_name TEXT;
  v_is_door_charge BOOLEAN := false;
  v_is_post_prep BOOLEAN := false;
  v_waste_reason public.waste_reason := 'CUSTOMER_RETURN';
  v_ing_qty NUMERIC;
  v_balance_before NUMERIC;
  v_balance_after NUMERIC;
  v_restored_stock BOOLEAN := false;
  v_waste_logged BOOLEAN := false;
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

  -- Uppercase enum values matching public.item_status ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED')
  v_is_post_prep := (v_item.status IN ('PREPARING', 'READY', 'SERVED') OR COALESCE(v_item.is_depleted, false));

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

-- ==============================================================================
-- 3. Fix dispatch_order_with_depletion (Exclude Door Charge + full variants)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_order_with_depletion(
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
  v_parsed_table_num INT := NULL;
BEGIN
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

  UPDATE public.orders
  SET status = 'OPEN', updated_at = now()
  WHERE id = p_order_id AND status != 'COMPLETED';

  IF v_table_number IS NOT NULL THEN
    v_parsed_table_num := NULLIF(regexp_replace(v_table_number, '[^0-9]', '', 'g'), '')::integer;
  END IF;

  -- Build rich items JSON for runner print chit (strictly excluding Door Charge & cancelled items)
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
        SELECT string_agg(oivs.option_name_snapshot, ', ' ORDER BY oivs.created_at ASC)
        FROM public.order_item_variant_selections oivs
        WHERE oivs.order_item_id = oi.id
      ) AS flavor_summary
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.categories c ON c.id = p.category_id
    LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.order_id = p_order_id
      AND oi.status != 'CANCELLED'
      AND oi.product_id != 'd1000001-0000-0000-0000-000000000001'::uuid
      AND (c.slug IS NULL OR c.slug != 'door_charge')
      AND p.name NOT ILIKE '%door charge%'
    ORDER BY oi.created_at ASC
  LOOP
    v_item_display_name := v_item.product_name;
    IF v_item.flavor_summary IS NOT NULL AND v_item.flavor_summary <> '' THEN
      v_item_display_name := v_item_display_name || ' (' || v_item.flavor_summary;
      IF v_item.temperature IS NOT NULL AND v_item.temperature NOT IN ('NONE', 'ROOM') THEN
        v_item_display_name := v_item_display_name || ' · ' || CASE WHEN v_item.temperature = 'HOT' THEN 'Hot' ELSE 'Iced' END;
      END IF;
      IF v_item.size_label IS NOT NULL AND v_item.size_label != 'Standard' THEN
        v_item_display_name := v_item_display_name || ' · ' || v_item.size_label;
      END IF;
      v_item_display_name := v_item_display_name || ')';
    ELSIF v_item.temperature IS NOT NULL AND v_item.temperature NOT IN ('NONE', 'ROOM') THEN
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

  IF jsonb_array_length(v_items_json) > 0 THEN
    v_chit_data := jsonb_build_object(
      'orderId', p_order_id,
      'orderNumber', v_order.order_number,
      'roundNumber', COALESCE(v_order.round_number, 1),
      'tableNumber', v_parsed_table_num,
      'tableLabel', v_table_number,
      'tabName', v_tab.customer_name,
      'waiterName', COALESCE(v_staff_name, 'Staff'),
      'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI'),
      'items', v_items_json
    );

    INSERT INTO public.print_jobs (
      job_type,
      receipt_data,
      status
    ) VALUES (
      'RUNNER_CHIT',
      v_chit_data,
      'PENDING'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'status', 'OPEN',
    'printJobQueued', (jsonb_array_length(v_items_json) > 0)
  );
END;
$$;

-- ==============================================================================
-- 4. Fix dispatch_order_round_atomic (safe table number + valid print_jobs cols)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.dispatch_order_round_atomic(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.dispatch_order_with_depletion(p_order_id);
END;
$$;

-- ==============================================================================
-- 5. Harden transfer_order_items_to_tab (preserve round_number, event_id & stage times)
-- ==============================================================================
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

    v_new_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));
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

-- ==============================================================================
-- 6. Fix close_shift_and_generate_y_reading & close_shift_and_generate_z_reading
--    - Eliminates nonexistent users.full_name column reference (uses username).
--    - Fixes cafe_net_sales / event_net_sales key lookup & vat_exempt_sales slip field.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.close_shift_and_generate_y_reading(
  p_drawer TEXT DEFAULT 'main',
  p_counted_cash NUMERIC DEFAULT 0.00,
  p_outgoing_staff_id UUID DEFAULT NULL,
  p_incoming_staff_name TEXT DEFAULT 'Incoming Staff',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_x_data JSONB;
  v_outgoing_name TEXT := 'Staff';
  v_variance NUMERIC(10, 2);
  v_expected_cash NUMERIC(10, 2);
  v_y_record RECORD;
  v_opened_at TIMESTAMPTZ;
BEGIN
  v_x_data := public.get_current_x_reading(p_drawer, 'shift');
  v_expected_cash := (v_x_data->>'expected_cash')::NUMERIC;
  v_variance := p_counted_cash - v_expected_cash;
  v_opened_at := (v_x_data->>'opened_at')::TIMESTAMPTZ;

  IF p_outgoing_staff_id IS NOT NULL THEN
    SELECT COALESCE(display_name, username, role::text)
    INTO v_outgoing_name
    FROM public.users
    WHERE id = p_outgoing_staff_id;
  END IF;

  INSERT INTO public.pos_y_readings (
    drawer_target,
    opened_at,
    closed_at,
    outgoing_staff_id,
    outgoing_staff_name,
    incoming_staff_name,
    gross_sales,
    net_sales,
    cafe_net_sales,
    event_net_sales,
    cafe_tx_count,
    event_tx_count,
    discount_total,
    vatable_sales,
    vat_amount,
    vat_exempt_sales,
    service_charge,
    tender_cash,
    tender_card,
    tender_digital,
    tender_delivery,
    total_tender,
    opening_float,
    cash_in,
    cash_out,
    safe_drops,
    expected_cash,
    counted_cash,
    variance,
    transaction_count,
    first_payment_id,
    last_payment_id,
    first_receipt_no,
    last_receipt_no,
    notes,
    metadata
  ) VALUES (
    p_drawer,
    v_opened_at,
    now(),
    p_outgoing_staff_id,
    v_outgoing_name,
    p_incoming_staff_name,
    COALESCE((v_x_data->>'gross_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'net_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cafe_net_sales')::NUMERIC, (v_x_data->>'cafe_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'event_net_sales')::NUMERIC, (v_x_data->>'event_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cafe_tx_count')::INT, 0),
    COALESCE((v_x_data->>'event_tx_count')::INT, 0),
    COALESCE((v_x_data->>'discount_total')::NUMERIC, (v_x_data->>'discounts')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'vatable_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'vat_amount')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'vat_exempt_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'service_charge')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_cash')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_card')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_digital')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_delivery')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'total_tender')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'opening_float')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cash_in')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cash_out')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'safe_drops')::NUMERIC, 0.00),
    v_expected_cash,
    p_counted_cash,
    v_variance,
    COALESCE((v_x_data->>'transaction_count')::INT, 0),
    (v_x_data->>'first_payment_id')::UUID,
    (v_x_data->>'last_payment_id')::UUID,
    v_x_data->>'first_receipt_no',
    v_x_data->>'last_receipt_no',
    p_notes,
    v_x_data
  )
  RETURNING * INTO v_y_record;

  IF v_variance <> 0 THEN
    INSERT INTO public.cash_drawer_transactions (
      action_type,
      amount,
      reason,
      performed_by_id,
      drawer_target
    ) VALUES (
      'DROP',
      v_variance,
      format('Y-Handover #%s Cash Variance (%s)', v_y_record.y_number, CASE WHEN v_variance > 0 THEN 'Surplus' ELSE 'Shortage' END),
      p_outgoing_staff_id,
      p_drawer
    );
  END IF;

  INSERT INTO public.print_jobs (
    job_type,
    receipt_data,
    status
  ) VALUES (
    'Y_READING',
    jsonb_build_object(
      'reading_type', 'Y_READING',
      'y_number', v_y_record.y_number,
      'drawer_target', v_y_record.drawer_target,
      'opened_at', v_y_record.opened_at,
      'closed_at', v_y_record.closed_at,
      'outgoing_staff_name', v_y_record.outgoing_staff_name,
      'incoming_staff_name', v_y_record.incoming_staff_name,
      'gross_sales', v_y_record.gross_sales,
      'net_sales', v_y_record.net_sales,
      'cafe_net_sales', v_y_record.cafe_net_sales,
      'event_net_sales', v_y_record.event_net_sales,
      'discount_total', v_y_record.discount_total,
      'vatable_sales', v_y_record.vatable_sales,
      'vat_amount', v_y_record.vat_amount,
      'vat_exempt_sales', v_y_record.vat_exempt_sales,
      'service_charge', v_y_record.service_charge,
      'tender_cash', v_y_record.tender_cash,
      'tender_card', v_y_record.tender_card,
      'tender_digital', v_y_record.tender_digital,
      'tender_delivery', v_y_record.tender_delivery,
      'total_tender', v_y_record.total_tender,
      'opening_float', v_y_record.opening_float,
      'expected_cash', v_y_record.expected_cash,
      'counted_cash', v_y_record.counted_cash,
      'variance', v_y_record.variance,
      'transaction_count', v_y_record.transaction_count,
      'first_receipt_no', v_y_record.first_receipt_no,
      'last_receipt_no', v_y_record.last_receipt_no,
      'notes', v_y_record.notes
    ),
    'PENDING'
  );

  RETURN to_jsonb(v_y_record);
END;
$$;

CREATE OR REPLACE FUNCTION public.close_shift_and_generate_z_reading(
  p_drawer TEXT DEFAULT 'consolidated',
  p_counted_cash NUMERIC DEFAULT 0.00,
  p_performed_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_x_data JSONB;
  v_user_name TEXT := 'Admin';
  v_variance NUMERIC(10, 2);
  v_expected_cash NUMERIC(10, 2);
  v_z_record RECORD;
  v_opened_at TIMESTAMPTZ;
BEGIN
  v_x_data := public.get_current_x_reading(p_drawer, 'day');
  v_expected_cash := (v_x_data->>'expected_cash')::NUMERIC;
  v_variance := p_counted_cash - v_expected_cash;
  v_opened_at := (v_x_data->>'opened_at')::TIMESTAMPTZ;

  IF p_performed_by IS NOT NULL THEN
    SELECT COALESCE(display_name, username, role::text)
    INTO v_user_name
    FROM public.users
    WHERE id = p_performed_by;
  END IF;

  INSERT INTO public.pos_z_readings (
    drawer_target,
    opened_at,
    closed_at,
    performed_by,
    performed_by_name,
    gross_sales,
    net_sales,
    cafe_net_sales,
    event_net_sales,
    cafe_tx_count,
    event_tx_count,
    discount_total,
    vatable_sales,
    vat_amount,
    vat_exempt_sales,
    service_charge,
    tender_cash,
    tender_card,
    tender_digital,
    tender_delivery,
    total_tender,
    opening_float,
    cash_in,
    cash_out,
    safe_drops,
    expected_cash,
    counted_cash,
    variance,
    transaction_count,
    first_payment_id,
    last_payment_id,
    first_receipt_no,
    last_receipt_no,
    notes,
    metadata
  ) VALUES (
    p_drawer,
    v_opened_at,
    now(),
    p_performed_by,
    v_user_name,
    COALESCE((v_x_data->>'gross_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'net_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cafe_net_sales')::NUMERIC, (v_x_data->>'cafe_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'event_net_sales')::NUMERIC, (v_x_data->>'event_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cafe_tx_count')::INT, 0),
    COALESCE((v_x_data->>'event_tx_count')::INT, 0),
    COALESCE((v_x_data->>'discount_total')::NUMERIC, (v_x_data->>'discounts')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'vatable_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'vat_amount')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'vat_exempt_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'service_charge')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_cash')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_card')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_digital')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'tender_delivery')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'total_tender')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'opening_float')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cash_in')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cash_out')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'safe_drops')::NUMERIC, 0.00),
    v_expected_cash,
    p_counted_cash,
    v_variance,
    COALESCE((v_x_data->>'transaction_count')::INT, 0),
    (v_x_data->>'first_payment_id')::UUID,
    (v_x_data->>'last_payment_id')::UUID,
    v_x_data->>'first_receipt_no',
    v_x_data->>'last_receipt_no',
    p_notes,
    v_x_data
  )
  RETURNING * INTO v_z_record;

  IF v_variance <> 0 THEN
    INSERT INTO public.cash_drawer_transactions (
      action_type,
      amount,
      reason,
      performed_by_id,
      drawer_target
    ) VALUES (
      'DROP',
      v_variance,
      format('Z-Close #%s Cash Variance (%s)', v_z_record.z_number, CASE WHEN v_variance > 0 THEN 'Surplus' ELSE 'Shortage' END),
      p_performed_by,
      p_drawer
    );
  END IF;

  INSERT INTO public.print_jobs (
    job_type,
    receipt_data,
    status
  ) VALUES (
    'Z_READING',
    jsonb_build_object(
      'reading_type', 'Z_READING',
      'z_number', v_z_record.z_number,
      'drawer_target', v_z_record.drawer_target,
      'opened_at', v_z_record.opened_at,
      'closed_at', v_z_record.closed_at,
      'performed_by_name', v_z_record.performed_by_name,
      'gross_sales', v_z_record.gross_sales,
      'net_sales', v_z_record.net_sales,
      'cafe_net_sales', v_z_record.cafe_net_sales,
      'event_net_sales', v_z_record.event_net_sales,
      'discount_total', v_z_record.discount_total,
      'vatable_sales', v_z_record.vatable_sales,
      'vat_amount', v_z_record.vat_amount,
      'vat_exempt_sales', v_z_record.vat_exempt_sales,
      'service_charge', v_z_record.service_charge,
      'tender_cash', v_z_record.tender_cash,
      'tender_card', v_z_record.tender_card,
      'tender_digital', v_z_record.tender_digital,
      'tender_delivery', v_z_record.tender_delivery,
      'total_tender', v_z_record.total_tender,
      'opening_float', v_z_record.opening_float,
      'expected_cash', v_z_record.expected_cash,
      'counted_cash', v_z_record.counted_cash,
      'variance', v_z_record.variance,
      'transaction_count', v_z_record.transaction_count,
      'first_receipt_no', v_z_record.first_receipt_no,
      'last_receipt_no', v_z_record.last_receipt_no,
      'notes', v_z_record.notes
    ),
    'PENDING'
  );

  RETURN to_jsonb(v_z_record);
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_tab_and_record_payment(
  UUID, UUID, public.payment_method, NUMERIC, NUMERIC, NUMERIC, NUMERIC,
  TEXT, BOOLEAN, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT,
  TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, JSONB, UUID[]
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_order_item_with_restoral(UUID, TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_order_with_depletion(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_order_round_atomic(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_order_items_to_tab(UUID, UUID, UUID, TEXT, JSONB, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_shift_and_generate_y_reading(TEXT, NUMERIC, UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_shift_and_generate_z_reading(TEXT, NUMERIC, UUID, TEXT) TO anon, authenticated, service_role;
