-- ==============================================================================
-- Monk's Dream Jazz Bar POS — X-Reading & Z-Reading System
-- Migration: 20261102000003_pos_x_z_readings.sql
-- ==============================================================================

-- 1. Till Scope tagging for cash drawer transactions and payments
ALTER TABLE public.cash_drawer_transactions 
ADD COLUMN IF NOT EXISTS drawer_target TEXT NOT NULL DEFAULT 'main';

ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS drawer_target TEXT NOT NULL DEFAULT 'main';

-- 2. Official Z-Readings History Table
CREATE TABLE IF NOT EXISTS public.pos_z_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  z_number BIGINT GENERATED ALWAYS AS IDENTITY,
  drawer_target TEXT NOT NULL DEFAULT 'consolidated', -- 'consolidated', 'main', 'bar'
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  performed_by_name TEXT NOT NULL DEFAULT 'Manager',
  
  -- Fiscal Breakdown
  gross_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  net_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  vatable_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  vat_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  vat_exempt_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Tender Breakdown
  tender_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tender_card NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tender_digital NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tender_delivery NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_tender NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Cash Drawer Audit
  opening_float NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cash_in NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cash_out NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  safe_drops NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  counted_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  variance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Operational Counters & Audit Trail
  transaction_count INT NOT NULL DEFAULT 0,
  guest_count INT NOT NULL DEFAULT 0,
  first_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  last_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  first_receipt_no TEXT,
  last_receipt_no TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS and Realtime
ALTER TABLE public.pos_z_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow POS operations for pos_z_readings" ON public.pos_z_readings;
CREATE POLICY "Allow POS operations for pos_z_readings" 
ON public.pos_z_readings 
FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_z_readings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 4. Stored Procedure: Atomic X-Reading Generator
CREATE OR REPLACE FUNCTION public.get_current_x_reading(
  p_drawer TEXT DEFAULT 'consolidated'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_z_time TIMESTAMPTZ;
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
  -- Determine baseline shift start time (since last Z-reading or start of today)
  SELECT MAX(closed_at)
  INTO v_last_z_time
  FROM public.pos_z_readings
  WHERE (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  IF v_last_z_time IS NULL THEN
    v_opened_at := date_trunc('day', now());
  ELSE
    v_opened_at := v_last_z_time;
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

-- 5. Stored Procedure: Atomic Z-Reading Closer
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
  v_user_name TEXT := 'Manager';
  v_variance NUMERIC(10, 2);
  v_expected_cash NUMERIC(10, 2);
  v_z_record RECORD;
  v_opened_at TIMESTAMPTZ;
BEGIN
  -- Obtain active X reading calculations
  v_x_data := public.get_current_x_reading(p_drawer);
  v_expected_cash := (v_x_data->>'expected_cash')::NUMERIC;
  v_variance := p_counted_cash - v_expected_cash;
  v_opened_at := (v_x_data->>'opened_at')::TIMESTAMPTZ;

  -- Resolve staff name
  IF p_performed_by IS NOT NULL THEN
    SELECT COALESCE(display_name, full_name, role::text)
    INTO v_user_name
    FROM public.users
    WHERE id = p_performed_by;
  END IF;

  -- Insert permanent Z-reading record
  INSERT INTO public.pos_z_readings (
    drawer_target,
    opened_at,
    closed_at,
    performed_by,
    performed_by_name,
    gross_sales,
    net_sales,
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

  -- Record cash drawer transaction for closing discrepancy / deposit
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

  -- Enqueue thermal print job into print_jobs queue
  INSERT INTO public.print_jobs (
    job_type,
    receipt_data,
    status
  ) VALUES (
    'Z_READING',
    jsonb_build_object(
      'z_number', v_z_record.z_number,
      'drawer_target', v_z_record.drawer_target,
      'opened_at', v_z_record.opened_at,
      'closed_at', v_z_record.closed_at,
      'performed_by_name', v_z_record.performed_by_name,
      'gross_sales', v_z_record.gross_sales,
      'net_sales', v_z_record.net_sales,
      'discount_total', v_z_record.discount_total,
      'vatable_sales', v_z_record.vatable_sales,
      'vat_amount', v_z_record.vat_amount,
      'service_charge', v_z_record.service_charge,
      'tender_cash', v_z_record.tender_cash,
      'tender_card', v_z_record.tender_card,
      'tender_digital', v_z_record.tender_digital,
      'expected_cash', v_z_record.expected_cash,
      'counted_cash', v_z_record.counted_cash,
      'variance', v_z_record.variance,
      'transaction_count', v_z_record.transaction_count,
      'notes', v_z_record.notes
    ),
    'PENDING'
  );

  RETURN to_jsonb(v_z_record);
END;
$$;
