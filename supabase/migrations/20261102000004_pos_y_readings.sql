-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Y-Reading (Shift Handover / Cashier Closeout)
-- Migration: 20261102000004_pos_y_readings.sql
-- ==============================================================================

-- 1. Table for Shift Handover Y-Readings
CREATE TABLE IF NOT EXISTS public.pos_y_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  y_number BIGINT GENERATED ALWAYS AS IDENTITY,
  drawer_target TEXT NOT NULL DEFAULT 'main', -- 'main', 'bar', 'consolidated'
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  outgoing_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  outgoing_staff_name TEXT NOT NULL,
  incoming_staff_name TEXT NOT NULL DEFAULT 'Incoming Staff',
  
  -- Shift Financials
  gross_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  net_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  vatable_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  vat_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Tender Breakdown
  tender_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tender_card NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tender_digital NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tender_delivery NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_tender NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Drawer Reconciliation
  opening_float NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cash_in NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cash_out NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  safe_drops NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  counted_cash NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  variance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Operational Counters & Audit Trail
  transaction_count INT NOT NULL DEFAULT 0,
  first_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  last_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  first_receipt_no TEXT,
  last_receipt_no TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Security & RLS
ALTER TABLE public.pos_y_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow POS operations for pos_y_readings" ON public.pos_y_readings;
CREATE POLICY "Allow POS operations for pos_y_readings" 
ON public.pos_y_readings 
FOR ALL TO anon, authenticated 
USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_y_readings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 3. Stored Procedure: Atomic Shift Handover Y-Reading Closer
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
  -- Obtain active X reading calculations
  v_x_data := public.get_current_x_reading(p_drawer);
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
    COALESCE(p_incoming_staff_name, 'Incoming Staff'),
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

  -- Record cash drawer transaction for closing discrepancy / handover
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
      format('Y-Handover #%s Variance (%s)', v_y_record.y_number, CASE WHEN v_variance > 0 THEN 'Surplus' ELSE 'Shortage' END),
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
      'y_number', v_y_record.y_number,
      'drawer_target', v_y_record.drawer_target,
      'opened_at', v_y_record.opened_at,
      'closed_at', v_y_record.closed_at,
      'outgoing_staff_name', v_y_record.outgoing_staff_name,
      'incoming_staff_name', v_y_record.incoming_staff_name,
      'gross_sales', v_y_record.gross_sales,
      'net_sales', v_y_record.net_sales,
      'tender_cash', v_y_record.tender_cash,
      'tender_card', v_y_record.tender_card,
      'tender_digital', v_y_record.tender_digital,
      'expected_cash', v_y_record.expected_cash,
      'counted_cash', v_y_record.counted_cash,
      'variance', v_y_record.variance,
      'transaction_count', v_y_record.transaction_count,
      'notes', v_y_record.notes
    ),
    'PENDING'
  );

  RETURN to_jsonb(v_y_record);
END;
$$;
