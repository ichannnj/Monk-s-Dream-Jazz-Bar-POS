-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Fix Off-Premise Tab Completion, Open Tabs Safety
-- Guard, X-Reading Overload & Business Day Boundary
-- Migration: 20261121000005_fix_off_premise_unsettled_tabs_and_x_reading.sql
--
-- Fixes discovered during full-system live PostgREST & PostgreSQL audit:
--   1. public.complete_off_premise_tab:
--      Cast v_tab.order_channel::text before ILIKE comparisons (avoids
--      "operator does not exist: order_channel ~~* unknown").
--   2. public.check_unsettled_tabs:
--      Replace non-existent t.tab_name / t.opened_at columns with actual
--      public.tabs columns (t.customer_name / t.created_at) and join
--      public.tables for table_number; scope counts accurately by p_drawer.
--   3. public.get_current_x_reading:
--      Drop stale 1-arg overload public.get_current_x_reading(TEXT) that caused
--      PostgREST PGRST203 overload ambiguity, and align fallback v_opened_at
--      with the 6:00 AM Asia/Manila venue business day cutoff instead of UTC midnight.
-- ==============================================================================

-- 1. Fix complete_off_premise_tab enum ILIKE cast
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
      delivered_at = COALESCE(delivered_at, now()),
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

GRANT EXECUTE ON FUNCTION public.complete_off_premise_tab(UUID, UUID) TO anon, authenticated, service_role;


-- 2. Fix check_unsettled_tabs column references (customer_name, created_at) and drawer scoping
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
  v_drawer TEXT := COALESCE(NULLIF(lower(trim(p_drawer)), ''), 'consolidated');
BEGIN
  SELECT
    COUNT(*),
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'tab_name', t.customer_name,
          'customer_name', t.customer_name,
          'table_id', t.table_id,
          'table_number', tbl.table_number,
          'order_channel', t.order_channel,
          'opened_at', t.created_at,
          'status', t.status
        )
        ORDER BY t.created_at ASC
      ),
      '[]'::jsonb
    )
  INTO v_open_tab_count, v_open_tabs
  FROM public.tabs t
  LEFT JOIN public.tables tbl ON tbl.id = t.table_id
  WHERE t.status = 'OPEN'
    AND (
      v_drawer = 'consolidated'
      OR (v_drawer = 'bar' AND t.order_channel = 'BAR_AREA')
      OR (v_drawer = 'main' AND t.order_channel != 'BAR_AREA')
    );

  RETURN jsonb_build_object(
    'open_tab_count', v_open_tab_count,
    'open_tabs', v_open_tabs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_unsettled_tabs(TEXT) TO anon, authenticated, service_role;


-- 3. Drop stale 1-arg get_current_x_reading overload and align 2-arg RPC to 6:00 AM Manila cutoff
DROP FUNCTION IF EXISTS public.get_current_x_reading(TEXT);

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
  -- 6:00 AM Asia/Manila venue business day cutoff
  v_business_day_start :=
    (date_trunc('day', (now() AT TIME ZONE 'Asia/Manila') - interval '6 hours') + interval '6 hours')
    AT TIME ZONE 'Asia/Manila';

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
    v_opened_at := v_business_day_start;
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
    v_first_rno := 'MD-' || to_char(v_opened_at AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(v_first_pid::text from 1 for 4));
    v_last_rno := 'MD-' || to_char(now() AT TIME ZONE 'Asia/Manila', 'YYYYMMDD') || '-' || upper(substring(v_last_pid::text from 1 for 4));
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

GRANT EXECUTE ON FUNCTION public.get_current_x_reading(TEXT, TEXT) TO anon, authenticated, service_role;
