-- ============================================================================
-- Monk's Dream Jazz Bar POS — Settle Tab Order Cascade & Cleanup
-- Migration: 20261102000001_settle_tab_order_cascade.sql
-- Description:
--   1. Updates settle_tab_and_record_payment to atomically cascade settlement
--      to all orders (COMPLETED) and un-served order items (SERVED) for the tab.
--   2. Performs a one-time retroactive cleanup of orphaned historical orders
--      whose parent tab was already billed.
-- ============================================================================

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

  IF p_staff_id IS NOT NULL THEN
    SELECT display_name INTO v_staff_name FROM public.users WHERE id = p_staff_id;
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
    'waiterName', COALESCE(v_staff_name, 'Cashier'),
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

-- ----------------------------------------------------------------------------
-- Retroactive Cleanup: Mark historical orphaned orders whose tab was settled
-- as COMPLETED and their non-cancelled items as SERVED.
-- ----------------------------------------------------------------------------
UPDATE public.orders
SET status = 'COMPLETED', updated_at = now()
WHERE status = 'OPEN' 
  AND tab_id IN (SELECT id FROM public.tabs WHERE status IN ('BILLED', 'CLOSED'));

UPDATE public.order_items
SET status = 'SERVED', updated_at = now()
WHERE status NOT IN ('SERVED', 'CANCELLED')
  AND order_id IN (SELECT id FROM public.orders WHERE status = 'COMPLETED');
