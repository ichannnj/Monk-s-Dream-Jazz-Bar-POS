-- ==============================================================================
-- Monk's Dream Jazz Bar and Cafe: Fix Printing, Drawer Solenoid, Settlement & Readings
-- Migration: 20261108000006_fix_printing_drawer_settlement_and_readings.sql
--
-- 1. Merges rich items & variant descriptors directly into dispatch_order_with_depletion.
-- 2. Upgrades settle_tab_and_record_payment with drawer_target scoping ('main' vs 'bar'),
--    tendered/change in receipts, safe non-numeric table_number regex handling,
--    DRAWER_KICK support when print is suppressed, and automatic table occupancy release.
-- 3. Fixes complete_off_premise_tab to remove erroneous 10% SC multiplier on Online Delivery
--    and populates statutory 12% VAT metrics.
-- 4. Overhauls get_current_x_reading: removes MIN(uuid)/MAX(uuid) crash, restores discount_total,
--    restores reading_type = 'X_READING', receipt numbers, and preserves opening float.
-- 5. Upgrades cancel_order_item_with_restoral to log to public.waste_logs on post-prep voids.
-- ==============================================================================

-- 1. MERGE RICH ITEMS INTO dispatch_order_with_depletion
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
  -- Lock Order and retrieve associated Tab info
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

  -- Ensure order status remains OPEN while dispatched
  UPDATE public.orders
  SET status = 'OPEN', updated_at = now()
  WHERE id = p_order_id;

  -- Parse numeric table number safely without throwing syntax errors on non-numeric names
  IF v_table_number IS NOT NULL THEN
    v_parsed_table_num := NULLIF(regexp_replace(v_table_number, '[^0-9]', '', 'g'), '')::integer;
  END IF;

  -- Build rich items json for thermal print chit
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
    LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.created_at ASC
  LOOP
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

  -- Atomically enqueue Runner Chit print job for the thermal terminal
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


-- 2. UPGRADE settle_tab_and_record_payment
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
  p_should_print_receipt BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab RECORD;
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
  v_tendered NUMERIC(10, 2);
  v_change NUMERIC(10, 2) := 0.00;
  v_parsed_table_num INT := NULL;
  v_open_tabs_remaining INT := 0;
BEGIN
  -- 1. Lock and retrieve Tab
  SELECT id, table_id, customer_name, order_type, order_channel, external_order_ref, status, operating_mode, is_prepaid, ticket_number
  INTO v_tab
  FROM public.tabs
  WHERE id = p_tab_id
  FOR UPDATE;

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
  ELSIF (v_tab.order_channel IS NOT NULL AND v_tab.order_channel ILIKE '%bar%')
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

  -- 3. Aggregate all non-cancelled order items
  FOR v_item IN 
    SELECT 
      oi.id AS order_item_id, 
      oi.product_id, 
      oi.quantity, 
      oi.unit_price, 
      oi.modifiers, 
      oi.notes, 
      oi.station_target,
      p.name AS product_name,
      pv.temperature,
      pv.size_label
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.products p ON p.id = oi.product_id
    LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
    WHERE o.tab_id = p_tab_id AND oi.status != 'CANCELLED'
    ORDER BY oi.created_at ASC
  LOOP
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

    v_items_subtotal := v_items_subtotal + (v_item.unit_price * v_item.quantity);

    v_items_json := v_items_json || jsonb_build_object(
      'name', v_item_display_name,
      'productName', v_item.product_name,
      'temperature', v_item.temperature,
      'size', v_item.size_label,
      'quantity', v_item.quantity,
      'price', v_item.unit_price,
      'unit_price', v_item.unit_price,
      'stationTarget', v_item.station_target,
      'total', (v_item.unit_price * v_item.quantity),
      'modifiers', COALESCE(v_item.modifiers, '[]'::jsonb),
      'notes', COALESCE(v_item.notes, ''),
      'isCorkage', (COALESCE(v_item.notes, '') ILIKE '%corkage%')
    );
  END LOOP;

  v_gross_sales := v_items_subtotal + COALESCE(p_corkage_amount, 0);

  -- 4. Calculate or fallback VAT metrics
  IF p_vatable_sales IS NOT NULL AND p_vat_amount IS NOT NULL THEN
    v_vatable_sales := p_vatable_sales;
    v_vat_amount := p_vat_amount;
    v_vat_exempt_sales := COALESCE(p_vat_exempt_sales, 0.00);
  ELSIF p_discount_amount > 0 AND (p_discount_type IN ('SENIOR_CITIZEN', 'PWD') OR p_discount_type IS NULL) THEN
    v_vat_exempt_sales := ROUND((v_gross_sales / 1.12), 2);
    v_vatable_sales := 0.00;
    v_vat_amount := 0.00;
  ELSE
    v_vatable_sales := ROUND(((p_amount - v_service_charge) / 1.12), 2);
    v_vat_amount := (p_amount - v_service_charge) - v_vatable_sales;
    v_vat_exempt_sales := 0.00;
  END IF;

  v_tendered := COALESCE(p_tendered_amount, p_amount);
  IF p_payment_method = 'CASH' AND v_tendered > p_amount THEN
    v_change := v_tendered - p_amount;
  END IF;

  -- 5. Insert or append payment record
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
    drawer_target
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
    v_effective_drawer
  ) RETURNING id INTO v_payment_id;

  -- 6. Record Cash Drawer Transaction for CASH settlement
  IF p_payment_method = 'CASH' THEN
    INSERT INTO public.cash_drawer_transactions (
      action_type,
      amount,
      reason,
      performed_by_id,
      payment_id,
      drawer_target
    ) VALUES (
      'SALE',
      p_amount,
      CASE
        WHEN v_tab.order_type = 'TAKEOUT' THEN 'Takeout Settlement (' || COALESCE(v_tab.ticket_number, 'To-Go') || ' • ' || v_tab.customer_name || ')'
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
    'customer_name', v_tab.customer_name,
    'customerName', v_tab.customer_name,
    'tabName', v_tab.customer_name,
    'order_type', v_tab.order_type,
    'orderType', v_tab.order_type,
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'operatingMode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'payment_method', p_payment_method::text,
    'paymentMethod', p_payment_method::text,
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
    'total', p_amount,
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
    'drawer_target', v_effective_drawer
  );

  IF p_should_print_receipt THEN
    INSERT INTO public.print_jobs (job_type, receipt_data, status)
    VALUES ('RECEIPT', v_receipt_data, 'PENDING');
  ELSIF p_payment_method = 'CASH' THEN
    -- If receipt printing was suppressed, enqueue a pure drawer kick job so the register still opens!
    INSERT INTO public.print_jobs (job_type, receipt_data, status)
    VALUES ('DRAWER_KICK', jsonb_build_object('isDiagnosticKick', true, 'drawer_target', v_effective_drawer), 'PENDING');
  END IF;

  -- 8. Update Tab status & order cascade
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
        corkage_amount = p_corkage_amount,
        has_corkage_fee = (p_corkage_amount > 0),
        updated_at = now()
    WHERE id = p_tab_id;

    UPDATE public.orders
    SET status = 'COMPLETED',
        updated_at = now()
    WHERE tab_id = p_tab_id AND status IN ('OPEN', 'IN_PREPARATION', 'READY_TO_SERVE');

    UPDATE public.order_items
    SET status = 'SERVED',
        updated_at = now()
    WHERE order_id IN (SELECT id FROM public.orders WHERE tab_id = p_tab_id)
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
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'status', v_final_status,
    'is_prepaid', true,
    'payment_channel', p_payment_channel,
    'reference_number', p_reference_number,
    'drawer_target', v_effective_drawer
  );
END;
$$;


-- 3. FIX complete_off_premise_tab (0% Service Charge & VAT Breakdown for Delivery)
CREATE OR REPLACE FUNCTION public.complete_off_premise_tab(
  p_tab_id UUID,
  p_staff_id UUID DEFAULT NULL
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

  -- Mark tab as BILLED (closed)
  UPDATE public.tabs
  SET status = 'BILLED',
      updated_at = now()
  WHERE id = p_tab_id;

  -- Cascade orders to COMPLETED and items to SERVED
  UPDATE public.orders
  SET status = 'COMPLETED',
      updated_at = now()
  WHERE tab_id = p_tab_id AND status != 'CANCELLED';

  UPDATE public.order_items
  SET status = 'SERVED',
      updated_at = now()
  WHERE order_id IN (SELECT id FROM public.orders WHERE tab_id = p_tab_id)
    AND status != 'CANCELLED';

  -- Check if a payment already exists
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE tab_id = p_tab_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no payment exists yet (e.g. Online Delivery intake completed via Runner or KDS handoff), create it
  IF v_payment_id IS NULL THEN
    SELECT COALESCE(SUM(unit_price * quantity), 0.00)
    INTO v_items_subtotal
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.tab_id = p_tab_id AND oi.status != 'CANCELLED';

    -- Online Delivery strictly 0% Service Charge
    v_grand_total := v_items_subtotal;
    v_vatable_sales := ROUND(v_grand_total / 1.12, 2);
    v_vat_amount := v_grand_total - v_vatable_sales;

    IF v_tab.order_channel ILIKE '%grab%' THEN
      v_payment_method := 'GRAB_PAY_IN_APP';
    ELSIF v_tab.order_channel ILIKE '%panda%' THEN
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


-- 4. OVERHAUL get_current_x_reading (Eliminate MIN(uuid) crash, restore keys & float)
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
  v_opening_float NUMERIC(10, 2) := 0.00;
  v_cash_in NUMERIC(10, 2) := 0.00;
  v_cash_out NUMERIC(10, 2) := 0.00;
  v_safe_drops NUMERIC(10, 2) := 0.00;
  v_expected_cash NUMERIC(10, 2) := 0.00;
  v_default_float NUMERIC(10, 2) := 200.00;
  v_cafe_sales NUMERIC(10, 2) := 0.00;
  v_event_sales NUMERIC(10, 2) := 0.00;
  v_cafe_tx_count INT := 0;
  v_event_tx_count INT := 0;
BEGIN
  -- Determine baseline cutoff from prior readings
  SELECT MAX(closed_at)
  INTO v_last_z_time
  FROM public.pos_z_readings
  WHERE (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  IF p_scope = 'shift' THEN
    SELECT MAX(closed_at)
    INTO v_last_y_time
    FROM public.pos_y_readings
    WHERE (p_drawer = 'consolidated' OR drawer_target = p_drawer);

    v_opened_at := GREATEST(v_last_z_time, v_last_y_time);
  ELSE
    v_opened_at := v_last_z_time;
  END IF;

  IF v_opened_at IS NULL THEN
    v_opened_at := date_trunc('day', now());
  END IF;

  IF p_drawer = 'bar' THEN
    v_default_float := 150.00;
  ELSIF p_drawer = 'consolidated' THEN
    v_default_float := 350.00;
  ELSE
    v_default_float := 200.00;
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
    COUNT(*),
    (ARRAY_AGG(id ORDER BY created_at ASC))[1],
    (ARRAY_AGG(id ORDER BY created_at DESC))[1],
    COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN operating_mode != 'EVENT' OR operating_mode IS NULL THEN amount ELSE 0 END), 0.00),
    COUNT(*) FILTER (WHERE operating_mode = 'EVENT'),
    COUNT(*) FILTER (WHERE operating_mode != 'EVENT' OR operating_mode IS NULL)
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
  WHERE created_at >= v_opened_at
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  v_total_tender := v_tender_cash + v_tender_card + v_tender_digital + v_tender_delivery;

  -- Build receipt numbers
  IF v_first_pid IS NOT NULL THEN
    v_first_rno := 'MD-' || to_char(v_opened_at, 'YYYYMMDD') || '-' || upper(substring(v_first_pid::text from 1 for 4));
    v_last_rno := 'MD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(v_last_pid::text from 1 for 4));
  END IF;

  -- Drawer Transactions aggregation
  SELECT
    COALESCE(SUM(CASE WHEN action_type = 'FLOAT' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_IN' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_OUT' THEN abs(amount) ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'DROP' THEN abs(amount) ELSE 0 END), 0.00)
  INTO
    v_opening_float,
    v_cash_in,
    v_cash_out,
    v_safe_drops
  FROM public.cash_drawer_transactions
  WHERE created_at >= v_opened_at
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  -- Preserve default opening float if no explicit float was deposited
  IF v_opening_float = 0 THEN
    v_opening_float := v_default_float;
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
    'cafe_tx_count', v_cafe_tx_count,
    'event_tx_count', v_event_tx_count
  );
END;
$$;


-- 5. UPGRADE cancel_order_item_with_restoral (Log to public.waste_logs on Post-Prep Voids)
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

  v_is_post_prep := (v_item.status IN ('ready', 'served') OR v_item.is_depleted);

  -- If the item was prepared and depleted, log as kitchen/bar waste rather than restocking spoiled food
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
    -- If it was somehow depleted pre-prep, restore ingredient Bill of Materials
    FOR v_prod_ing IN
      SELECT ingredient_id, quantity
      FROM public.product_ingredients
      WHERE product_id = v_item.product_id
    LOOP
      UPDATE public.inventory_items
      SET current_stock = current_stock + (v_prod_ing.quantity * v_item.quantity),
          updated_at = now()
      WHERE id = v_prod_ing.ingredient_id;

      INSERT INTO public.inventory_stock_movements (
        ingredient_id,
        movement_type,
        quantity_delta,
        reason,
        performed_by_id
      ) VALUES (
        v_prod_ing.ingredient_id,
        'CANCEL_RESTORE',
        (v_prod_ing.quantity * v_item.quantity),
        'Void restoral: ' || COALESCE(p_reason, 'Customer Cancellation'),
        p_staff_id
      );
    END LOOP;
  END IF;

  -- Mark item cancelled
  UPDATE public.order_items
  SET status = 'CANCELLED',
      updated_at = now()
  WHERE id = p_order_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'is_post_prep', v_is_post_prep,
    'waste_logged', v_is_post_prep
  );
END;
$$;

