-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Billing, Cancellation & Cash Drawer Migrations
-- Migration: 20261018000003_billing_cancellation_and_drawer.sql
-- ==============================================================================

-- 1. CASH DRAWER ACTION TYPE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cash_drawer_action_type') THEN
    CREATE TYPE public.cash_drawer_action_type AS ENUM ('FLOAT', 'CASH_IN', 'CASH_OUT', 'DROP', 'SALE');
  END IF;
END $$;

-- 2. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_method public.payment_method NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  corkage_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tip_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CASH DRAWER TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.cash_drawer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type public.cash_drawer_action_type NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  performed_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. REALTIME PUBLICATION FOR NEW TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_drawer_transactions;

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_drawer_transactions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY['payments', 'cash_drawer_transactions'];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow POS operations for %I" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow POS operations for %I" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- 6. STORED PROCEDURE: CANCEL ORDER ITEM WITH RESTORAL / WASTE
CREATE OR REPLACE FUNCTION public.cancel_order_item_with_restoral(
  p_order_item_id UUID,
  p_staff_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_ing RECORD;
  v_balance_before NUMERIC;
  v_current_stock NUMERIC;
  v_restored_stock BOOLEAN := false;
  v_waste_logged BOOLEAN := false;
  v_min_stock NUMERIC;
BEGIN
  -- Fetch order item details
  SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.status, oi.is_depleted, p.name AS product_name
  INTO v_item
  FROM public.order_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.id = p_order_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found: %', p_order_item_id;
  END IF;

  IF v_item.status = 'CANCELLED' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Order item already cancelled',
      'orderItemId', p_order_item_id
    );
  END IF;

  -- Scenario A: PENDING (not yet cooked/mixed) AND already marked depleted: Restore ingredients
  IF v_item.status = 'PENDING' THEN
    IF v_item.is_depleted THEN
      FOR v_ing IN
        SELECT pi.inventory_item_id, pi.amount, pi.conversion_factor, ii.unit_cost, ii.min_alert_level
        FROM public.product_ingredients pi
        JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
        WHERE pi.product_id = v_item.product_id
      LOOP
        SELECT current_stock INTO v_balance_before
        FROM public.inventory_items
        WHERE id = v_ing.inventory_item_id
        FOR UPDATE;

        UPDATE public.inventory_items
        SET current_stock = current_stock + (v_ing.amount * v_item.quantity * v_ing.conversion_factor),
            updated_at = now()
        WHERE id = v_ing.inventory_item_id
        RETURNING current_stock INTO v_current_stock;

        INSERT INTO public.stock_movements (
          inventory_item_id,
          movement_type,
          change_amount,
          balance_before,
          balance_after,
          reference_id
        ) VALUES (
          v_ing.inventory_item_id,
          'CANCEL_RESTORE',
          (v_ing.amount * v_item.quantity * v_ing.conversion_factor),
          v_balance_before,
          v_current_stock,
          v_item.order_id::text
        );

        -- If ingredient is back above 0, reset auto_86 on product
        IF v_current_stock > 0 THEN
          UPDATE public.products
          SET auto_86 = false,
              out_of_stock_reason = NULL,
              updated_at = now()
          WHERE id = v_item.product_id AND auto_86 = true;
        END IF;
      END LOOP;
      v_restored_stock := true;
    END IF;
  ELSE
    -- Scenario B: PREPARING, READY, or SERVED -> Ingredient is already ruined/used.
    -- Log loss to waste_logs.
    FOR v_ing IN
      SELECT pi.inventory_item_id, pi.amount, pi.conversion_factor, ii.unit_cost
      FROM public.product_ingredients pi
      JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
      WHERE pi.product_id = v_item.product_id
    LOOP
      INSERT INTO public.waste_logs (
        inventory_item_id,
        quantity,
        cost_lost,
        reason,
        reported_by_id
      ) VALUES (
        v_ing.inventory_item_id,
        (v_ing.amount * v_item.quantity * v_ing.conversion_factor),
        (v_ing.amount * v_item.quantity * v_ing.conversion_factor * v_ing.unit_cost),
        'CUSTOMER_RETURN',
        p_staff_id
      );
    END LOOP;
    v_waste_logged := true;
  END IF;

  -- Mark order item as CANCELLED
  UPDATE public.order_items
  SET status = 'CANCELLED',
      notes = COALESCE(notes || ' | ', '') || 'Voided: ' || p_reason,
      updated_at = now()
  WHERE id = p_order_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'orderItemId', p_order_item_id,
    'restoredStock', v_restored_stock,
    'wasteLogged', v_waste_logged
  );
END;
$$;

-- 7. STORED PROCEDURE: ATOMIC TAB SETTLEMENT & BILLING
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
BEGIN
  -- 1. Lock and retrieve Tab
  SELECT id, table_id, customer_name, order_type, external_order_ref, status
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

  -- 2. Insert Payment Record
  INSERT INTO public.payments (
    tab_id,
    staff_id,
    payment_method,
    amount,
    corkage_amount,
    discount_amount,
    tip_amount,
    notes
  ) VALUES (
    p_tab_id,
    p_staff_id,
    p_payment_method,
    p_amount,
    p_corkage_amount,
    p_discount_amount,
    p_tip_amount,
    p_notes
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

  -- 5. Check if Table has any remaining OPEN tabs
  IF v_tab.table_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_remaining_tabs
    FROM public.tabs
    WHERE table_id = v_tab.table_id AND status = 'OPEN';

    IF v_remaining_tabs = 0 THEN
      UPDATE public.tables
      SET is_occupied = false, updated_at = now()
      WHERE id = v_tab.table_id;
    END IF;
  END IF;

  -- 6. Enqueue Receipt into print_jobs queue for Thermal Printer
  v_receipt_data := jsonb_build_object(
    'tabId', p_tab_id,
    'paymentId', v_payment_id,
    'customerName', v_tab.customer_name,
    'orderType', v_tab.order_type,
    'paymentMethod', p_payment_method,
    'amount', p_amount,
    'corkageAmount', p_corkage_amount,
    'discountAmount', p_discount_amount,
    'tipAmount', p_tip_amount,
    'settledAt', now()
  );

  INSERT INTO public.print_jobs (
    job_type,
    receipt_data,
    status
  ) VALUES (
    'CUSTOMER_RECEIPT',
    v_receipt_data,
    'PENDING'
  );

  RETURN jsonb_build_object(
    'success', true,
    'tabId', p_tab_id,
    'paymentId', v_payment_id,
    'status', 'BILLED',
    'tableFreed', (v_tab.table_id IS NOT NULL AND v_remaining_tabs = 0)
  );
END;
$$;
