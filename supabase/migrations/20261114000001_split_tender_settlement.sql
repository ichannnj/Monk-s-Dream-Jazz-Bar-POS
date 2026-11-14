-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Split-Tender Settlement & Multi-Payment Persistence
-- Migration: 20261114000001_split_tender_settlement.sql
--
-- Extends public.settle_tab_and_record_payment to support optional split tenders
-- via p_tenders JSONB, recording separate rows in public.payments and precise
-- cash drawer movements while remaining 100% backward compatible for single tenders.
-- ==============================================================================

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
  p_tenders JSONB DEFAULT NULL
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
  v_tender_breakdown JSONB := '[]'::jsonb;
  v_has_cash_tender BOOLEAN := false;
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
      oi.status,
      oi.station_target,
      oi.notes,
      oi.temperature,
      oi.size_label,
      oi.modifiers,
      oi.created_at,
      p.name AS product_name
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE o.tab_id = p_tab_id
      AND oi.status != 'CANCELLED'
    ORDER BY o.round_number ASC, oi.created_at ASC
  LOOP
    v_item_display_name := COALESCE(v_item.product_name, 'Custom Item');
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
    v_vatable_sales := ROUND(((p_amount - v_service_charge) / 1.12), 2);
    v_vat_amount := (p_amount - v_service_charge) - v_vatable_sales;
    v_vat_exempt_sales := 0.00;
  END IF;

  v_tendered := COALESCE(p_tendered_amount, p_amount);
  IF p_payment_method = 'CASH' AND v_tendered > p_amount THEN
    v_change := v_tendered - p_amount;
  END IF;

  -- 5. Split-Tenders Evaluation
  IF p_tenders IS NOT NULL AND jsonb_typeof(p_tenders) = 'array' AND jsonb_array_length(p_tenders) > 0 THEN
    v_has_split_tenders := true;
  END IF;

  IF v_has_split_tenders THEN
    -- Iterate through each split tender row
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
        drawer_target
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
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        v_effective_drawer
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
    -- Single tender checkout (Standard)
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
    'drawer_target', v_effective_drawer,
    'tender_breakdown', v_tender_breakdown,
    'is_split_payment', v_has_split_tenders
  );
END;
$$;
