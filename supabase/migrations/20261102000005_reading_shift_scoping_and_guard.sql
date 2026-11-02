-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Reading Shift Scoping, Open Tabs Guard & Auto Audit
-- Migration: 20261102000005_reading_shift_scoping_and_guard.sql
-- ==============================================================================

-- 1. Function to inspect active open tabs before shift close (Safety Guard)
CREATE OR REPLACE FUNCTION public.check_unsettled_tabs(
  p_drawer TEXT DEFAULT 'consolidated'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_tab_count INT := 0;
  v_open_tabs JSONB := '[]'::jsonb;
BEGIN
  SELECT 
    COUNT(*),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'tab_name', t.tab_name,
          'table_id', t.table_id,
          'opened_at', t.opened_at,
          'status', t.status
        )
      ), 
      '[]'::jsonb
    )
  INTO v_open_tab_count, v_open_tabs
  FROM public.tabs t
  WHERE t.status = 'OPEN';

  RETURN jsonb_build_object(
    'open_tab_count', v_open_tab_count,
    'open_tabs', v_open_tabs
  );
END;
$$;

-- 2. Enhanced X-Reading Generator supporting both 'day' and 'shift' scoping
CREATE OR REPLACE FUNCTION public.get_current_x_reading(
  p_drawer TEXT DEFAULT 'consolidated',
  p_scope TEXT DEFAULT 'day' -- 'day' (Z cumulative) or 'shift' (Y shift handover)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_z_time TIMESTAMPTZ;
  v_last_y_time TIMESTAMPTZ;
  v_opened_at TIMESTAMPTZ;
  v_gross_sales NUMERIC(10, 2) := 0.00;
  v_discount_total NUMERIC(10, 2) := 0.00;
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
  v_opening_float NUMERIC(10, 2) := 0.00;
  v_cash_in NUMERIC(10, 2) := 0.00;
  v_cash_out NUMERIC(10, 2) := 0.00;
  v_safe_drops NUMERIC(10, 2) := 0.00;
  v_expected_cash NUMERIC(10, 2) := 0.00;
  v_default_float NUMERIC(10, 2) := 200.00;
BEGIN
  -- Determine baseline shift start time
  -- 1. Find last Z reading
  SELECT MAX(closed_at)
  INTO v_last_z_time
  FROM public.pos_z_readings
  WHERE (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  -- 2. If scope is 'shift' (for Y-Reading), also check last Y reading
  IF p_scope = 'shift' THEN
    SELECT MAX(closed_at)
    INTO v_last_y_time
    FROM public.pos_y_readings
    WHERE (p_drawer = 'consolidated' OR drawer_target = p_drawer);

    -- Baseline is the latest of last Z, last Y, or beginning of today
    v_opened_at := GREATEST(v_last_z_time, v_last_y_time);
  ELSE
    -- Day scope (Z reading / standard X reading)
    v_opened_at := v_last_z_time;
  END IF;

  IF v_opened_at IS NULL THEN
    v_opened_at := date_trunc('day', now());
  END IF;

  -- Default float amounts based on drawer
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
    COUNT(*),
    (ARRAY_AGG(id ORDER BY created_at ASC))[1],
    (ARRAY_AGG(id ORDER BY created_at DESC))[1]
  INTO
    v_gross_sales,
    v_discount_total,
    v_net_sales,
    v_tender_cash,
    v_tender_card,
    v_tender_digital,
    v_tender_delivery,
    v_tx_count,
    v_first_pid,
    v_last_pid
  FROM public.payments
  WHERE created_at >= v_opened_at
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  v_total_tender := v_tender_cash + v_tender_card + v_tender_digital + v_tender_delivery;

  -- Fiscal calculations (PH BIR standard: VAT 12% inclusive, Service Charge 10%)
  IF v_net_sales > 0 THEN
    v_service_charge := ROUND((v_net_sales * 0.10) / 1.10, 2);
    v_vatable_sales := ROUND((v_net_sales - v_service_charge) / 1.12, 2);
    v_vat_amount := (v_net_sales - v_service_charge) - v_vatable_sales;
  END IF;

  -- Drawer actions aggregation
  SELECT
    COALESCE(SUM(CASE WHEN action_type = 'FLOAT' THEN amount ELSE 0 END), v_default_float),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_IN' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_OUT' THEN ABS(amount) ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'DROP' THEN ABS(amount) ELSE 0 END), 0.00)
  INTO
    v_opening_float,
    v_cash_in,
    v_cash_out,
    v_safe_drops
  FROM public.cash_drawer_transactions
  WHERE created_at >= v_opened_at
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  IF v_opening_float = 0 THEN
    v_opening_float := v_default_float;
  END IF;

  v_expected_cash := v_opening_float + v_tender_cash + v_cash_in - v_cash_out - v_safe_drops;

  RETURN jsonb_build_object(
    'reading_type', 'X_READING',
    'drawer_target', p_drawer,
    'scope', p_scope,
    'opened_at', v_opened_at,
    'generated_at', now(),
    'gross_sales', v_gross_sales,
    'discount_total', v_discount_total,
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
    'opening_float', v_opening_float,
    'cash_in', v_cash_in,
    'cash_out', v_cash_out,
    'safe_drops', v_safe_drops,
    'expected_cash', v_expected_cash,
    'transaction_count', v_tx_count,
    'first_payment_id', v_first_pid,
    'last_payment_id', v_last_pid,
    'first_receipt_no', COALESCE(SUBSTRING(v_first_pid::text, 1, 8), 'N/A'),
    'last_receipt_no', COALESCE(SUBSTRING(v_last_pid::text, 1, 8), 'N/A')
  );
END;
$$;

-- 3. Update Y-Reading closer to use 'shift' scope
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
  -- Obtain shift-scoped calculation (strictly since last handover/close)
  v_x_data := public.get_current_x_reading(p_drawer, 'shift');
  v_expected_cash := (v_x_data->>'expected_cash')::NUMERIC;
  v_variance := p_counted_cash - v_expected_cash;
  v_opened_at := (v_x_data->>'opened_at')::TIMESTAMPTZ;

  -- Resolve outgoing staff name
  IF p_outgoing_staff_id IS NOT NULL THEN
    SELECT COALESCE(display_name, full_name, role::text)
    INTO v_outgoing_name
    FROM public.users
    WHERE id = p_outgoing_staff_id;
  END IF;

  -- Insert permanent Y-reading record
  INSERT INTO public.pos_y_readings (
    drawer_target,
    opened_at,
    closed_at,
    outgoing_staff_id,
    outgoing_staff_name,
    incoming_staff_name,
    gross_sales,
    net_sales,
    discount_total,
    vatable_sales,
    vat_amount,
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
    (v_x_data->>'gross_sales')::NUMERIC,
    (v_x_data->>'net_sales')::NUMERIC,
    (v_x_data->>'discount_total')::NUMERIC,
    (v_x_data->>'vatable_sales')::NUMERIC,
    (v_x_data->>'vat_amount')::NUMERIC,
    (v_x_data->>'service_charge')::NUMERIC,
    (v_x_data->>'tender_cash')::NUMERIC,
    (v_x_data->>'tender_card')::NUMERIC,
    (v_x_data->>'tender_digital')::NUMERIC,
    (v_x_data->>'tender_delivery')::NUMERIC,
    (v_x_data->>'total_tender')::NUMERIC,
    (v_x_data->>'opening_float')::NUMERIC,
    (v_x_data->>'cash_in')::NUMERIC,
    (v_x_data->>'cash_out')::NUMERIC,
    (v_x_data->>'safe_drops')::NUMERIC,
    v_expected_cash,
    p_counted_cash,
    v_variance,
    (v_x_data->>'transaction_count')::INT,
    (v_x_data->>'first_payment_id')::UUID,
    (v_x_data->>'last_payment_id')::UUID,
    v_x_data->>'first_receipt_no',
    v_x_data->>'last_receipt_no',
    p_notes,
    v_x_data
  )
  RETURNING * INTO v_y_record;

  -- Record cash drawer transaction for handover discrepancy if any
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

  -- Enqueue thermal print job into print_jobs queue
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
      'discount_total', v_y_record.discount_total,
      'vatable_sales', v_y_record.vatable_sales,
      'vat_amount', v_y_record.vat_amount,
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
