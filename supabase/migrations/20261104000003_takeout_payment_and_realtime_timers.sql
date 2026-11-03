-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Takeout Payment Lifecycle & Realtime Timers Sync
-- Migration: 20261104000003_takeout_payment_and_realtime_timers.sql
-- ==============================================================================

-- 1. Add Takeout & Off-Premise metadata columns to public.tabs
ALTER TABLE public.tabs
  ADD COLUMN IF NOT EXISTS is_prepaid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS ticket_number TEXT;

-- Backfill existing settled or online delivery tabs as prepaid
UPDATE public.tabs
SET is_prepaid = true
WHERE status IN ('BILLED', 'CLOSED')
   OR order_type = 'ONLINE_DELIVERY'
   OR EXISTS (SELECT 1 FROM public.payments p WHERE p.tab_id = public.tabs.id);

-- 2. Upgrade settle_tab_and_record_payment to support Prepaid Takeout (p_keep_open_for_prep)
--    without prematurely closing active KDS orders/items before kitchen/bar preparation completes.
DROP FUNCTION IF EXISTS public.settle_tab_and_record_payment(
  UUID,
  UUID,
  public.payment_method,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  TEXT
);

CREATE OR REPLACE FUNCTION public.settle_tab_and_record_payment(
  p_tab_id UUID,
  p_staff_id UUID,
  p_payment_method public.payment_method,
  p_amount NUMERIC,
  p_corkage_amount NUMERIC DEFAULT 0.00,
  p_discount_amount NUMERIC DEFAULT 0.00,
  p_tip_amount NUMERIC DEFAULT 0.00,
  p_notes TEXT DEFAULT NULL,
  p_keep_open_for_prep BOOLEAN DEFAULT false
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
  v_final_status public.tab_status;
BEGIN
  -- 1. Lock and retrieve Tab (including operating_mode & is_prepaid)
  SELECT id, table_id, customer_name, order_type, order_channel, external_order_ref, status, operating_mode, is_prepaid, ticket_number
  INTO v_tab
  FROM public.tabs
  WHERE id = p_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tab not found: %', p_tab_id;
  END IF;

  IF (v_tab.status = 'BILLED' OR v_tab.status = 'CLOSED') AND NOT p_keep_open_for_prep THEN
    -- Idempotent return if already settled
    SELECT id INTO v_payment_id FROM public.payments WHERE tab_id = p_tab_id ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'tab_id', v_tab.id,
      'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
      'status', v_tab.status,
      'is_prepaid', true
    );
  END IF;

  IF p_staff_id IS NOT NULL THEN
    SELECT display_name INTO v_staff_name FROM public.users WHERE id = p_staff_id;
  END IF;

  -- 2. Check if payment record already exists for this tab (e.g. prepaid earlier)
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE tab_id = p_tab_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
    -- Insert Payment Record with operating_mode inherited from Tab
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
        CASE
          WHEN v_tab.order_type = 'TAKEOUT' THEN 'Takeout Settlement (' || COALESCE(v_tab.ticket_number, 'To-Go') || ' • ' || v_tab.customer_name || ')'
          ELSE 'Tab Settlement (' || v_tab.customer_name || ')'
        END,
        p_staff_id,
        v_payment_id
      );
    END IF;

    -- 4. Enqueue Receipt Print Job in print_jobs
    v_receipt_data := jsonb_build_object(
      'payment_id', v_payment_id,
      'tab_id', v_tab.id,
      'table_id', v_tab.table_id,
      'ticket_number', v_tab.ticket_number,
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
  END IF;

  -- 5. Update Tab status & prepaid flag
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
        corkage_amount = p_corkage_amount,
        has_corkage_fee = (p_corkage_amount > 0),
        updated_at = now()
    WHERE id = p_tab_id;

    -- Atomically complete all active orders and mark pending items as served for this tab
    UPDATE public.orders
    SET status = 'COMPLETED',
        updated_at = now()
    WHERE tab_id = p_tab_id AND status IN ('OPEN', 'IN_PREPARATION', 'READY_TO_SERVE');

    UPDATE public.order_items
    SET status = 'SERVED',
        updated_at = now()
    WHERE order_id IN (SELECT id FROM public.orders WHERE tab_id = p_tab_id)
      AND status NOT IN ('SERVED', 'CANCELLED');

    -- Check if Table has any remaining OPEN tabs
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
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'tab_id', v_tab.id,
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'status', v_final_status,
    'is_prepaid', true
  );
END;
$$;

-- 3. Create complete_off_premise_tab for Takeout Collection & Online Delivery Courier Handoff
CREATE OR REPLACE FUNCTION public.complete_off_premise_tab(
  p_tab_id UUID,
  p_staff_id UUID DEFAULT NULL
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
  v_grand_total NUMERIC(10, 2) := 0.00;
  v_platform_method public.payment_method;
BEGIN
  SELECT id, customer_name, order_type, order_channel, external_order_ref, status, operating_mode, is_prepaid
  INTO v_tab
  FROM public.tabs
  WHERE id = p_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tab not found: %', p_tab_id;
  END IF;

  -- Check if payment already exists
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE tab_id = p_tab_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- For Online Delivery orders (GrabFood / Foodpanda) without a payment row yet, auto-record platform payment
  IF v_payment_id IS NULL AND v_tab.order_type = 'ONLINE_DELIVERY' THEN
    SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0.00)
    INTO v_items_subtotal
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.tab_id = p_tab_id AND oi.status <> 'CANCELLED';

    v_grand_total := ROUND(v_items_subtotal * 1.10, 2);
    v_platform_method := CASE
      WHEN v_tab.order_channel = 'FOODPANDA' THEN 'FOODPANDA_IN_APP'::public.payment_method
      ELSE 'GRAB_PAY_IN_APP'::public.payment_method
    END;

    INSERT INTO public.payments (
      tab_id,
      staff_id,
      payment_method,
      amount,
      operating_mode,
      notes
    ) VALUES (
      p_tab_id,
      p_staff_id,
      v_platform_method,
      v_grand_total,
      COALESCE(v_tab.operating_mode, 'CAFE'),
      'Online Delivery Handoff (' || COALESCE(v_tab.external_order_ref, v_tab.customer_name) || ')'
    ) RETURNING id INTO v_payment_id;
  END IF;

  -- Mark tab as BILLED and cascade completion to orders & order_items
  UPDATE public.tabs
  SET status = 'BILLED',
      is_prepaid = true,
      updated_at = now()
  WHERE id = p_tab_id;

  UPDATE public.orders
  SET status = 'COMPLETED',
      updated_at = now()
  WHERE tab_id = p_tab_id AND status <> 'CANCELLED';

  UPDATE public.order_items
  SET status = 'SERVED',
      updated_at = now()
  WHERE order_id IN (SELECT id FROM public.orders WHERE tab_id = p_tab_id)
    AND status NOT IN ('SERVED', 'CANCELLED');

  RETURN jsonb_build_object(
    'success', true,
    'tab_id', p_tab_id,
    'payment_id', v_payment_id,
    'status', 'BILLED'
  );
END;
$$;

-- 4. Ensure full replica identity and realtime publication coverage for all live telemetry tables
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.station_status REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.waste_logs REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'station_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.station_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'waste_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_logs;
  END IF;
END $$;

