-- Migration: Fix operating_mode column reference ambiguity in get_financial_summary
-- Disambiguates CTE WHERE clause by computing computed_operating_mode inside the subquery

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL,
  p_station TEXT DEFAULT 'ALL',
  p_mode TEXT DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
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
      COALESCE(p.operating_mode, t.operating_mode, 'CAFE') AS computed_operating_mode
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
        OR (v_mode = 'EVENT' AND COALESCE(p.operating_mode, t.operating_mode, 'CAFE') = 'EVENT')
        OR (v_mode = 'CAFE' AND COALESCE(p.operating_mode, t.operating_mode, 'CAFE') <> 'EVENT')
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
    'cafe_net_sales', COALESCE(SUM(CASE WHEN computed_operating_mode = 'EVENT' THEN 0 ELSE amount END), 0.00),
    'event_net_sales', COALESCE(SUM(CASE WHEN computed_operating_mode = 'EVENT' THEN amount ELSE 0 END), 0.00),
    'cafe_order_count', COUNT(DISTINCT tab_id) FILTER (WHERE computed_operating_mode <> 'EVENT'),
    'event_order_count', COUNT(DISTINCT tab_id) FILTER (WHERE computed_operating_mode = 'EVENT')
  )
  INTO v_result
  FROM filtered;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_financial_summary(TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated, anon;

