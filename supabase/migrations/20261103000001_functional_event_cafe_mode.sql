-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Functional Cafe Mode & Event Mode Sales Separation
-- Migration: 20261103000001_functional_event_cafe_mode.sql
-- ==============================================================================

-- 1. Add operating_mode column to public.payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS operating_mode public.operating_mode NOT NULL DEFAULT 'CAFE';

-- Backfill existing payments from parent tabs
UPDATE public.payments p
SET operating_mode = COALESCE(t.operating_mode, 'CAFE')
FROM public.tabs t
WHERE p.tab_id = t.id AND t.operating_mode IS NOT NULL;

-- Index payments by operating_mode and created_at for fast telemetry queries
CREATE INDEX IF NOT EXISTS idx_payments_operating_mode_created 
ON public.payments (operating_mode, created_at);

-- 2. Add mode breakdown columns to pos_y_readings and pos_z_readings
ALTER TABLE public.pos_y_readings
ADD COLUMN IF NOT EXISTS cafe_net_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS event_net_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cafe_tx_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS event_tx_count INT NOT NULL DEFAULT 0;

ALTER TABLE public.pos_z_readings
ADD COLUMN IF NOT EXISTS cafe_net_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS event_net_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cafe_tx_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS event_tx_count INT NOT NULL DEFAULT 0;

-- 3. Update settle_tab_and_record_payment to stamp tab's operating_mode onto payment
CREATE OR REPLACE FUNCTION public.settle_tab_and_record_payment(
  p_tab_id UUID,
  p_staff_id UUID,
  p_payment_method public.payment_method,
  p_amount NUMERIC,
  p_corkage_amount NUMERIC DEFAULT 0.00,
  p_discount_amount NUMERIC DEFAULT 0.00,
  p_tip_amount NUMERIC DEFAULT 0.00,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab RECORD;
  v_payment_id UUID;
  v_remaining_tabs INTEGER;
  v_receipt_data JSONB;
  v_staff_name TEXT := 'Staff';
BEGIN
  -- 1. Lock and retrieve Tab (including operating_mode)
  SELECT id, table_id, customer_name, order_type, external_order_ref, status, operating_mode
  INTO v_tab
  FROM public.tabs
  WHERE id = p_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tab not found: %', p_tab_id;
  END IF;

  IF v_tab.status = 'BILLED' OR v_tab.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Tab is already billed or closed: %', p_tab_id;
  END IF;

  IF p_staff_id IS NOT NULL THEN
    SELECT display_name INTO v_staff_name FROM public.users WHERE id = p_staff_id;
  END IF;

  -- 2. Insert Payment Record with operating_mode inherited from Tab
  INSERT INTO public.payments (
    tab_id,
    staff_id,
    payment_method,
    amount,
    corkage_amount,
    discount_amount,
    tip_amount,
    notes,
    operating_mode
  ) VALUES (
    p_tab_id,
    p_staff_id,
    p_payment_method,
    p_amount,
    p_corkage_amount,
    p_discount_amount,
    p_tip_amount,
    p_notes,
    COALESCE(v_tab.operating_mode, 'CAFE')
  ) RETURNING id INTO v_payment_id;

  -- 3. If Cash payment, record in cash drawer transactions
  IF p_payment_method = 'CASH' THEN
    INSERT INTO public.cash_drawer_transactions (
      action_type,
      amount,
      reason,
      performed_by_id,
      payment_id
    ) VALUES (
      'SALE',
      p_amount,
      'Tab Settlement (' || v_tab.customer_name || ')',
      p_staff_id,
      v_payment_id
    );
  END IF;

  -- 4. Mark Tab as BILLED and set updated_at
  UPDATE public.tabs
  SET status = 'BILLED',
      corkage_amount = p_corkage_amount,
      has_corkage_fee = (p_corkage_amount > 0),
      updated_at = now()
  WHERE id = p_tab_id;

  -- 4b. Atomically complete all active orders and mark pending items as served for this tab
  UPDATE public.orders
  SET status = 'COMPLETED',
      updated_at = now()
  WHERE tab_id = p_tab_id AND status = 'OPEN';

  UPDATE public.order_items
  SET status = 'SERVED',
      updated_at = now()
  WHERE order_id IN (SELECT id FROM public.orders WHERE tab_id = p_tab_id)
    AND status NOT IN ('SERVED', 'CANCELLED');

  -- 5. Check if Table has any remaining OPEN tabs
  IF v_tab.table_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_remaining_tabs
    FROM public.tabs
    WHERE table_id = v_tab.table_id AND status = 'OPEN';

    IF v_remaining_tabs = 0 THEN
      UPDATE public.tables
      SET is_occupied = false,
          updated_at = now()
      WHERE id = v_tab.table_id;
    END IF;
  END IF;

  -- 6. Enqueue Receipt Print Job in print_jobs
  v_receipt_data := jsonb_build_object(
    'payment_id', v_payment_id,
    'tab_id', v_tab.id,
    'table_id', v_tab.table_id,
    'customer_name', v_tab.customer_name,
    'order_type', v_tab.order_type,
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'payment_method', p_payment_method,
    'amount', p_amount,
    'corkage_amount', p_corkage_amount,
    'discount_amount', p_discount_amount,
    'tip_amount', p_tip_amount,
    'staff_name', v_staff_name,
    'settled_at', now()
  );

  INSERT INTO public.print_jobs (job_type, receipt_data, status)
  VALUES ('RECEIPT', v_receipt_data, 'PENDING');

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'tab_id', v_tab.id,
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'status', 'BILLED',
    'table_cleared', (v_remaining_tabs = 0)
  );
END;
$$;

-- 4. Update get_current_x_reading with Cafe vs Event sales breakdown
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
  -- Operating Mode Breakdown
  v_cafe_sales NUMERIC(10, 2) := 0.00;
  v_event_sales NUMERIC(10, 2) := 0.00;
  v_cafe_tx_count INT := 0;
  v_event_tx_count INT := 0;
BEGIN
  -- Determine baseline shift start time
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
    (ARRAY_AGG(id ORDER BY created_at DESC))[1],
    -- Cafe vs Event Breakdown
    COALESCE(SUM(CASE WHEN operating_mode = 'CAFE' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN amount ELSE 0 END), 0.00),
    COUNT(CASE WHEN operating_mode = 'CAFE' THEN 1 END),
    COUNT(CASE WHEN operating_mode = 'EVENT' THEN 1 END)
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
    v_last_pid,
    v_cafe_sales,
    v_event_sales,
    v_cafe_tx_count,
    v_event_tx_count
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
    'cafe_sales', v_cafe_sales,
    'event_sales', v_event_sales,
    'cafe_tx_count', v_cafe_tx_count,
    'event_tx_count', v_event_tx_count,
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

-- 5. Update close_shift_and_generate_y_reading to record Cafe vs Event sales
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
  -- Obtain shift-scoped calculation
  v_x_data := public.get_current_x_reading(p_drawer, 'shift');
  v_expected_cash := (v_x_data->>'expected_cash')::NUMERIC;
  v_variance := p_counted_cash - v_expected_cash;
  v_opened_at := (v_x_data->>'opened_at')::TIMESTAMPTZ;

  IF p_outgoing_staff_id IS NOT NULL THEN
    SELECT COALESCE(display_name, full_name, role::text)
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
    COALESCE((v_x_data->>'cafe_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'event_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cafe_tx_count')::INT, 0),
    COALESCE((v_x_data->>'event_tx_count')::INT, 0),
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

  -- Enqueue thermal print job
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

-- 6. Update close_shift_and_generate_z_reading to record Cafe vs Event sales
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
  -- Obtain day-scoped calculation (cumulative for full day)
  v_x_data := public.get_current_x_reading(p_drawer, 'day');
  v_expected_cash := (v_x_data->>'expected_cash')::NUMERIC;
  v_variance := p_counted_cash - v_expected_cash;
  v_opened_at := (v_x_data->>'opened_at')::TIMESTAMPTZ;

  IF p_performed_by IS NOT NULL THEN
    SELECT COALESCE(display_name, full_name, role::text)
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
    (v_x_data->>'gross_sales')::NUMERIC,
    (v_x_data->>'net_sales')::NUMERIC,
    COALESCE((v_x_data->>'cafe_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'event_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cafe_tx_count')::INT, 0),
    COALESCE((v_x_data->>'event_tx_count')::INT, 0),
    (v_x_data->>'discount_total')::NUMERIC,
    (v_x_data->>'vatable_sales')::NUMERIC,
    (v_x_data->>'vat_amount')::NUMERIC,
    (v_x_data->>'vat_exempt_sales')::NUMERIC,
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

  -- Enqueue thermal print job
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
