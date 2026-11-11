-- Migration: Optimize telemetry queries and indexes for financial summary and COGS
-- Addresses statement timeouts on get_financial_summary and get_actual_cogs under strict anon/authenticated timeouts

-- 1. Index payments by tab_id, created_at, operating_mode
CREATE INDEX IF NOT EXISTS idx_payments_tab_id_created ON public.payments (tab_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments (created_at);

-- 2. Index orders by created_at, tab_id, status
CREATE INDEX IF NOT EXISTS idx_orders_created_at_tab_id ON public.orders (created_at, tab_id);
CREATE INDEX IF NOT EXISTS idx_orders_tab_id ON public.orders (tab_id);

-- 3. Index order_items by order_id, status, product_id, variant_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_status ON public.order_items (order_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- 4. Index tabs by order_channel and operating_mode
CREATE INDEX IF NOT EXISTS idx_tabs_order_channel ON public.tabs (order_channel);
CREATE INDEX IF NOT EXISTS idx_tabs_operating_mode ON public.tabs (operating_mode);

-- 5. Index product_ingredients by product_id
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product_id ON public.product_ingredients (product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_inventory_item ON public.product_ingredients (inventory_item_id);

-- 6. Clean up any ambiguous cancel_order_item_with_restoral signatures in public schema
DO $$
DECLARE
  v_fn RECORD;
BEGIN
  FOR v_fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'cancel_order_item_with_restoral'
      AND proargnames::text[] <> ARRAY['p_order_item_id', 'p_reason', 'p_staff_id']
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s;', v_fn.signature);
  END LOOP;
END;
$$;
