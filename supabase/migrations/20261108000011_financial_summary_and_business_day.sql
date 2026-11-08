-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Financial Summary & Business-Day Reconciliation
-- Migration: 20261108000011_financial_summary_and_business_day.sql
-- Description:
--   1. Adds the missing `vat_exempt_sales` column to `public.pos_y_readings`
--      so Senior/PWD VAT-exempt sales survive shift handovers.
--   2. Replaces `close_shift_and_generate_y_reading` to persist VAT-exempt
--      sales and to read the correct `cafe_net_sales` / `event_net_sales`
--      keys returned by `get_current_x_reading` (previously read `cafe_sales`
--      which always resolved to NULL).
--   3. Adds `get_financial_summary(p_start, p_end, p_station, p_mode)`, a
--      single reconciliation RPC that mirrors the exact expressions used by
--      `get_current_x_reading` so Admin dashboard, reports, Excel exports and
--      fiscal readings agree to the centavo.
--   4. Adds `get_actual_cogs(p_start, p_end, p_station)` which computes real
--      Cost of Goods Sold from the recipe BOM and inventory MAC unit cost,
--      mirroring the variant-aware depletion trigger.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Y-Reading: persist VAT-exempt (Senior/PWD) sales
-- ------------------------------------------------------------------------------
ALTER TABLE public.pos_y_readings
  ADD COLUMN IF NOT EXISTS vat_exempt_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- ------------------------------------------------------------------------------
-- 2. Y-Reading closer: include VAT-exempt sales + fix cafe/event key lookup
-- ------------------------------------------------------------------------------
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
    (v_x_data->>'gross_sales')::NUMERIC,
    (v_x_data->>'net_sales')::NUMERIC,
    COALESCE((v_x_data->>'cafe_net_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'event_net_sales')::NUMERIC, 0.00),
    COALESCE((v_x_data->>'cafe_tx_count')::INT, 0),
    COALESCE((v_x_data->>'event_tx_count')::INT, 0),
    (v_x_data->>'discount_total')::NUMERIC,
    (v_x_data->>'vatable_sales')::NUMERIC,
    (v_x_data->>'vat_amount')::NUMERIC,
    COALESCE((v_x_data->>'vat_exempt_sales')::NUMERIC, 0.00),
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

-- ------------------------------------------------------------------------------
-- 3. Consolidated financial summary (single source of truth for Admin)
--    Mirrors get_current_x_reading expressions exactly:
--      gross_sales   = SUM(amount + discount_amount)
--      net_sales     = SUM(amount)
--      discount_total= SUM(discount_amount)
--    Order counts use COUNT(DISTINCT tab_id) so a split-tender tab counts once.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_station TEXT DEFAULT 'ALL',
  p_mode TEXT DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station TEXT := COALESCE(NULLIF(upper(trim(p_station)), ''), 'ALL');
  v_mode TEXT := COALESCE(NULLIF(upper(trim(p_mode)), ''), 'ALL');
  v_result JSONB;
BEGIN
  WITH filtered AS (
    SELECT
      p.amount,
      p.discount_amount,
      p.service_charge,
      p.vatable_sales,
      p.vat_amount,
      p.vat_exempt_sales,
      p.payment_method,
      p.tab_id,
      COALESCE(p.operating_mode, t.operating_mode, 'CAFE') AS operating_mode
    FROM public.payments p
    LEFT JOIN public.tabs t ON t.id = p.tab_id
    WHERE (p_start IS NULL OR p.created_at >= p_start)
      AND (p_end IS NULL OR p.created_at < p_end)
      AND (
        v_station = 'ALL'
        OR (v_station = 'CAFE_AREA' AND t.order_channel = 'CAFE_AREA')
        OR (v_station = 'BAR_AREA' AND t.order_channel = 'BAR_AREA')
        OR (v_station = 'TAKEOUT_COUNTER' AND t.order_channel = 'TAKEOUT_COUNTER')
        OR (
          v_station = 'GRAB_FOOD'
          AND t.order_channel IN ('GRAB_FOOD', 'FOODPANDA', 'OTHER_ONLINE')
        )
        OR (v_station = 'FOODPANDA' AND t.order_channel = 'FOODPANDA')
      )
      AND (
        v_mode = 'ALL'
        OR (v_mode = 'EVENT' AND operating_mode = 'EVENT')
        OR (v_mode = 'CAFE' AND operating_mode <> 'EVENT')
      )
  )
  SELECT jsonb_build_object(
    'gross_sales', COALESCE(SUM(amount + discount_amount), 0.00),
    'discount_total', COALESCE(SUM(discount_amount), 0.00),
    'net_sales', COALESCE(SUM(amount), 0.00),
    'vatable_sales', COALESCE(SUM(vatable_sales), 0.00),
    'vat_amount', COALESCE(SUM(vat_amount), 0.00),
    'vat_exempt_sales', COALESCE(SUM(vat_exempt_sales), 0.00),
    'service_charge', COALESCE(SUM(service_charge), 0.00),
    'tender_cash', COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0.00),
    'tender_card', COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN amount ELSE 0 END), 0.00),
    'tender_digital', COALESCE(SUM(CASE WHEN payment_method = 'DIGITAL_WALLET' THEN amount ELSE 0 END), 0.00),
    'tender_delivery', COALESCE(SUM(CASE WHEN payment_method IN ('GRAB_PAY_IN_APP', 'FOODPANDA_IN_APP') THEN amount ELSE 0 END), 0.00),
    'tender_comp', COALESCE(SUM(CASE WHEN payment_method = 'COMP' THEN amount ELSE 0 END), 0.00),
    'total_tender', COALESCE(SUM(amount), 0.00),
    'transaction_count', COUNT(*),
    'order_count', COUNT(DISTINCT tab_id),
    'cafe_net_sales', COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN 0 ELSE amount END), 0.00),
    'event_net_sales', COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN amount ELSE 0 END), 0.00),
    'cafe_order_count', COUNT(DISTINCT tab_id) FILTER (WHERE operating_mode <> 'EVENT'),
    'event_order_count', COUNT(DISTINCT tab_id) FILTER (WHERE operating_mode = 'EVENT')
  )
  INTO v_result
  FROM filtered;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Actual COGS from recipe BOM × inventory MAC unit cost
--    Mirrors trg_deplete_inventory_on_item_ready:
--      - variant-specific BOM when the order item has a variant BOM
--      - otherwise the base product BOM (variant_id IS NULL)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_actual_cogs(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_station TEXT DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_station TEXT := COALESCE(NULLIF(upper(trim(p_station)), ''), 'ALL');
  v_total NUMERIC(14, 2) := 0.00;
  v_costed_lines INT := 0;
  v_uncosted_lines INT := 0;
BEGIN
  WITH line_items AS (
    SELECT
      oi.id,
      oi.product_id,
      oi.variant_id,
      oi.quantity,
      EXISTS (
        SELECT 1
        FROM public.product_ingredients pi
        WHERE pi.variant_id = oi.variant_id
      ) AS has_variant_bom
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.tabs t ON t.id = o.tab_id
    WHERE oi.status <> 'CANCELLED'
      AND (p_start IS NULL OR o.created_at >= p_start)
      AND (p_end IS NULL OR o.created_at < p_end)
      AND (
        v_station = 'ALL'
        OR (v_station = 'CAFE_AREA' AND t.order_channel = 'CAFE_AREA')
        OR (v_station = 'BAR_AREA' AND t.order_channel = 'BAR_AREA')
        OR (v_station = 'TAKEOUT_COUNTER' AND t.order_channel = 'TAKEOUT_COUNTER')
        OR (
          v_station = 'GRAB_FOOD'
          AND t.order_channel IN ('GRAB_FOOD', 'FOODPANDA', 'OTHER_ONLINE')
        )
        OR (v_station = 'FOODPANDA' AND t.order_channel = 'FOODPANDA')
      )
  ),
  bom_costs AS (
    SELECT
      li.id AS order_item_id,
      SUM(
        li.quantity
        * pi.amount
        * pi.conversion_factor
        * ii.unit_cost
      ) AS line_cost
    FROM line_items li
    JOIN public.product_ingredients pi
      ON (
        (li.has_variant_bom AND pi.variant_id = li.variant_id)
        OR ((NOT li.has_variant_bom) AND pi.product_id = li.product_id AND pi.variant_id IS NULL)
      )
    JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
    GROUP BY li.id
  )
  SELECT
    COALESCE(SUM(line_cost), 0.00),
    COUNT(*)
  INTO v_total, v_costed_lines
  FROM bom_costs;

  SELECT COUNT(*)
  INTO v_uncosted_lines
  FROM (
    SELECT oi.id
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.tabs t ON t.id = o.tab_id
    WHERE oi.status <> 'CANCELLED'
      AND (p_start IS NULL OR o.created_at >= p_start)
      AND (p_end IS NULL OR o.created_at < p_end)
      AND (
        v_station = 'ALL'
        OR (v_station = 'CAFE_AREA' AND t.order_channel = 'CAFE_AREA')
        OR (v_station = 'BAR_AREA' AND t.order_channel = 'BAR_AREA')
        OR (v_station = 'TAKEOUT_COUNTER' AND t.order_channel = 'TAKEOUT_COUNTER')
        OR (
          v_station = 'GRAB_FOOD'
          AND t.order_channel IN ('GRAB_FOOD', 'FOODPANDA', 'OTHER_ONLINE')
        )
        OR (v_station = 'FOODPANDA' AND t.order_channel = 'FOODPANDA')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.product_ingredients pi
        WHERE (
          (oi.variant_id IS NOT NULL AND pi.variant_id = oi.variant_id)
          OR (pi.product_id = oi.product_id AND pi.variant_id IS NULL)
        )
      )
  ) missing;

  RETURN jsonb_build_object(
    'actual_cogs', ROUND(v_total, 2),
    'costed_line_count', v_costed_lines,
    'uncosted_line_count', v_uncosted_lines,
    'is_complete', v_uncosted_lines = 0
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Realtime fan-out for the new Y-Reading column (no-op if already present)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_y_readings;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
