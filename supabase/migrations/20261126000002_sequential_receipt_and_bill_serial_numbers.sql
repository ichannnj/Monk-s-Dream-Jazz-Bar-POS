-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Sequential Receipt & Bill Serial Numbers
-- Migration: 20261126000002_sequential_receipt_and_bill_serial_numbers.sql
--
-- Replaces random UUID-hex receipt/check/bill identifiers with unbroken,
-- PostgreSQL-backed sequential serial numbers for accounting & audit tracking:
--   1. public.payments.receipt_number: MD-000001, MD-000002, ... (never resets)
--   2. public.tabs.bill_number:        BILL-000001, BILL-000002, ... (pre-payment)
--   3. Split-tender rows in a single checkout share ONE MD-xxxxxx serial.
--   4. Chronological backfill of existing tabs, payments, and Y/Z readings.
--   5. Updated settle_tab_and_record_payment, complete_off_premise_tab, and
--      get_current_x_reading RPCs.
-- ==============================================================================

-- 1. Sequences & Columns
CREATE SEQUENCE IF NOT EXISTS public.receipt_serial_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.bill_serial_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS receipt_number TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_receipt_number
  ON public.payments (receipt_number);

ALTER TABLE public.tabs
  ADD COLUMN IF NOT EXISTS bill_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tabs_bill_number
  ON public.tabs (bill_number)
  WHERE bill_number IS NOT NULL;

-- 2. Helper Functions
CREATE OR REPLACE FUNCTION public.next_receipt_serial()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'MD-' || lpad(nextval('public.receipt_serial_seq')::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.next_bill_serial()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'BILL-' || lpad(nextval('public.bill_serial_seq')::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_tab_bill_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.bill_number IS NULL OR btrim(NEW.bill_number) = '' THEN
    NEW.bill_number := public.next_bill_serial();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_tab_bill_number ON public.tabs;
CREATE TRIGGER trg_assign_tab_bill_number
  BEFORE INSERT ON public.tabs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_tab_bill_number_trigger();

CREATE OR REPLACE FUNCTION public.get_or_assign_tab_bill_number(p_tab_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill_number TEXT;
BEGIN
  SELECT bill_number INTO v_bill_number
  FROM public.tabs
  WHERE id = p_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_bill_number IS NULL OR btrim(v_bill_number) = '' THEN
    v_bill_number := public.next_bill_serial();
    UPDATE public.tabs
    SET bill_number = v_bill_number,
        updated_at = now()
    WHERE id = p_tab_id;
  END IF;

  RETURN v_bill_number;
END;
$$;

-- 3. Chronological Historical Backfill
DO $$
DECLARE
  v_max_bill BIGINT := 0;
  v_max_receipt BIGINT := 0;
BEGIN
  -- Backfill tabs.bill_number chronologically
  WITH numbered_tabs AS (
    SELECT
      id,
      row_number() OVER (ORDER BY created_at ASC, id ASC) AS seq_num
    FROM public.tabs
    WHERE bill_number IS NULL
  )
  UPDATE public.tabs t
  SET bill_number = 'BILL-' || lpad(nt.seq_num::text, 6, '0')
  FROM numbered_tabs nt
  WHERE t.id = nt.id;

  SELECT COALESCE(MAX(NULLIF(regexp_replace(bill_number, '[^0-9]', '', 'g'), '')::BIGINT), 0)
  INTO v_max_bill
  FROM public.tabs
  WHERE bill_number ~ '^BILL-[0-9]+$';

  IF v_max_bill > 0 THEN
    PERFORM setval('public.bill_serial_seq', v_max_bill, true);
  ELSE
    PERFORM setval('public.bill_serial_seq', 1, false);
  END IF;

  -- Backfill payments.receipt_number chronologically, grouping split-tender rows
  -- from the same checkout (same tab_id within the same second) into one serial.
  WITH checkout_groups AS (
    SELECT
      id,
      COALESCE(tab_id::text, id::text) || ':' || to_char(date_trunc('second', created_at), 'YYYY-MM-DD HH24:MI:SS') AS grp_key,
      created_at
    FROM public.payments
    WHERE receipt_number IS NULL
  ),
  ordered_groups AS (
    SELECT
      grp_key,
      row_number() OVER (ORDER BY MIN(created_at) ASC, MIN(id::text) ASC) AS seq_num
    FROM checkout_groups
    GROUP BY grp_key
  )
  UPDATE public.payments p
  SET receipt_number = 'MD-' || lpad(og.seq_num::text, 6, '0')
  FROM checkout_groups cg
  JOIN ordered_groups og ON og.grp_key = cg.grp_key
  WHERE p.id = cg.id;

  SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_number, '[^0-9]', '', 'g'), '')::BIGINT), 0)
  INTO v_max_receipt
  FROM public.payments
  WHERE receipt_number ~ '^MD-[0-9]+$';

  IF v_max_receipt > 0 THEN
    PERFORM setval('public.receipt_serial_seq', v_max_receipt, true);
  ELSE
    PERFORM setval('public.receipt_serial_seq', 1, false);
  END IF;

  -- Synchronize historical Y & Z readings first/last receipt numbers
  UPDATE public.pos_y_readings y
  SET
    first_receipt_no = COALESCE(pf.receipt_number, y.first_receipt_no),
    last_receipt_no = COALESCE(pl.receipt_number, y.last_receipt_no)
  FROM public.payments pf, public.payments pl
  WHERE y.first_payment_id = pf.id
    AND y.last_payment_id = pl.id;

  UPDATE public.pos_z_readings z
  SET
    first_receipt_no = COALESCE(pf.receipt_number, z.first_receipt_no),
    last_receipt_no = COALESCE(pl.receipt_number, z.last_receipt_no)
  FROM public.payments pf, public.payments pl
  WHERE z.first_payment_id = pf.id
    AND z.last_payment_id = pl.id;
END;
$$;

-- 4. Update settle_tab_and_record_payment to allocate & persist sequential receipt_number
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
  v_receipt_number TEXT;
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

  SELECT id, table_id, customer_name, order_type, order_channel, external_order_ref, status, operating_mode, is_prepaid, ticket_number, bill_number
  INTO v_tab
  FROM public.tabs
  WHERE id = p_tab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tab not found: %', p_tab_id;
  END IF;

  IF (v_tab.status = 'BILLED' OR v_tab.status = 'CLOSED') AND NOT p_keep_open_for_prep THEN
    SELECT id, receipt_number INTO v_payment_id, v_receipt_number
    FROM public.payments
    WHERE tab_id = p_tab_id
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'receipt_number', v_receipt_number,
      'bill_number', v_tab.bill_number,
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
    SELECT id, receipt_number INTO v_payment_id, v_receipt_number
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
        'receipt_number', v_receipt_number,
        'bill_number', v_tab.bill_number,
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
  v_vatable_sales := COALESCE(p_vatable_sales, 0.00);
  v_vat_amount := COALESCE(p_vat_amount, 0.00);
  v_vat_exempt_sales := COALESCE(p_vat_exempt_sales, 0.00);

  IF p_tenders IS NOT NULL AND jsonb_typeof(p_tenders) = 'array' AND jsonb_array_length(p_tenders) > 0 THEN
    v_has_split_tenders := true;
  END IF;

  -- Allocate ONE sequential receipt number for this entire checkout
  v_receipt_number := public.next_receipt_serial();

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
        group_tab_ids,
        receipt_number
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
        v_clean_group_ids,
        v_receipt_number
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
      group_tab_ids,
      receipt_number
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
      v_clean_group_ids,
      v_receipt_number
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
    'receiptNumber', v_receipt_number,
    'receipt_number', v_receipt_number,
    'billNumber', v_tab.bill_number,
    'bill_number', v_tab.bill_number,
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
    'netAfterDiscount', GREATEST(0, v_items_subtotal - p_discount_amount),
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
    'receipt_number', v_receipt_number,
    'bill_number', v_tab.bill_number,
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

-- 5. Update complete_off_premise_tab to allocate sequential receipt_number
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
  v_receipt_number TEXT;
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

  SELECT id, receipt_number INTO v_payment_id, v_receipt_number
  FROM public.payments
  WHERE tab_id = p_tab_id
  ORDER BY created_at DESC
  LIMIT 1;

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
    v_vatable_sales := 0.00;
    v_vat_amount := 0.00;

    IF (v_tab.order_channel::text) ILIKE '%grab%' THEN
      v_payment_method := 'GRAB_PAY_IN_APP';
    ELSIF (v_tab.order_channel::text) ILIKE '%panda%' THEN
      v_payment_method := 'FOODPANDA_IN_APP';
    ELSE
      v_payment_method := 'DIGITAL_WALLET';
    END IF;

    v_receipt_number := public.next_receipt_serial();

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
      drawer_target,
      receipt_number
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
      'main',
      v_receipt_number
    ) RETURNING id INTO v_payment_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tab_id', p_tab_id,
    'payment_id', v_payment_id,
    'receipt_number', v_receipt_number,
    'status', 'BILLED'
  );
END;
$$;

-- 6. Update get_current_x_reading to use actual sequential payments.receipt_number
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
  v_event_sales NUMERIC(10, 2) := 0.00;
  v_cafe_sales NUMERIC(10, 2) := 0.00;
  v_event_tx_count INT := 0;
  v_cafe_tx_count INT := 0;
BEGIN
  v_business_day_start := date_trunc('day', (now() AT TIME ZONE 'Asia/Manila') - interval '6 hours') + interval '6 hours';
  v_business_day_start := v_business_day_start AT TIME ZONE 'Asia/Manila';

  SELECT MAX(closed_at) INTO v_last_z_time
  FROM public.pos_z_readings
  WHERE (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  IF p_scope = 'shift' THEN
    SELECT MAX(closed_at) INTO v_last_y_time
    FROM public.pos_y_readings
    WHERE (p_drawer = 'consolidated' OR drawer_target = p_drawer);

    v_reading_cutoff := GREATEST(
      COALESCE(v_last_z_time, '-infinity'::timestamptz),
      COALESCE(v_last_y_time, '-infinity'::timestamptz)
    );
  ELSE
    v_reading_cutoff := COALESCE(v_last_z_time, '-infinity'::timestamptz);
  END IF;

  IF v_reading_cutoff > v_business_day_start THEN
    v_opened_at := v_reading_cutoff;
    v_is_strict_after := true;
  ELSE
    v_opened_at := v_business_day_start;
    v_is_strict_after := false;
  END IF;

  SELECT
    COALESCE(SUM((amount - service_charge) + discount_amount), 0.00),
    COALESCE(SUM(discount_amount), 0.00),
    COALESCE(SUM(amount - service_charge), 0.00),
    COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN payment_method = 'DIGITAL_WALLET' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN payment_method IN ('GRAB_PAY_IN_APP', 'FOODPANDA_IN_APP') THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(service_charge), 0.00),
    COALESCE(SUM(vatable_sales), 0.00),
    COALESCE(SUM(vat_amount), 0.00),
    COALESCE(SUM(vat_exempt_sales), 0.00),
    COUNT(DISTINCT COALESCE(tab_id::text, id::text)),
    (ARRAY_AGG(id ORDER BY created_at ASC, id ASC))[1],
    (ARRAY_AGG(id ORDER BY created_at DESC, id DESC))[1],
    (ARRAY_AGG(receipt_number ORDER BY created_at ASC, id ASC))[1],
    (ARRAY_AGG(receipt_number ORDER BY created_at DESC, id DESC))[1],
    COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN (amount - service_charge) ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN operating_mode != 'EVENT' OR operating_mode IS NULL THEN (amount - service_charge) ELSE 0 END), 0.00),
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
    v_first_rno,
    v_last_rno,
    v_event_sales,
    v_cafe_sales,
    v_event_tx_count,
    v_cafe_tx_count
  FROM public.payments
  WHERE (CASE WHEN v_is_strict_after THEN created_at > v_opened_at ELSE created_at >= v_opened_at END)
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  v_total_tender := v_tender_cash + v_tender_card + v_tender_digital + v_tender_delivery;

  IF v_first_pid IS NOT NULL AND v_first_rno IS NULL THEN
    v_first_rno := 'MD-' || to_char(v_opened_at AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(v_first_pid::text from 1 for 4));
  END IF;
  IF v_last_pid IS NOT NULL AND v_last_rno IS NULL THEN
    v_last_rno := 'MD-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(v_last_pid::text from 1 for 4));
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_or_assign_tab_bill_number(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_receipt_serial() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.next_bill_serial() TO authenticated, service_role;
