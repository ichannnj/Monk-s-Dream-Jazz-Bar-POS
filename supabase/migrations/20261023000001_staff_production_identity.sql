-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Staff Production Identity & Audit Attribution
-- Migration: 20261023000001_staff_production_identity.sql
-- ==============================================================================

-- 1. ADD CONTACT AND AVATAR ATTRIBUTES TO USERS
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. UPDATE AUTHENTICATE_STAFF_CREDENTIALS RPC TO INCLUDE IDENTITY ATTRIBUTES
CREATE OR REPLACE FUNCTION public.authenticate_staff_credentials(
  p_username TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_clean_username TEXT;
  v_clean_pin TEXT;
BEGIN
  v_clean_username := lower(trim(COALESCE(p_username, '')));
  v_clean_pin := trim(COALESCE(p_pin, ''));

  IF v_clean_username = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Staff ID / Username is required. Access denied.'
    );
  END IF;

  IF v_clean_pin = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PIN is required. Access denied.'
    );
  END IF;

  SELECT id, username, display_name, role, is_active, is_workflow_staff, email, phone, avatar_url, base_daily_rate
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND pin = v_clean_pin
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Staff ID or PIN. Access denied.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'displayName', v_user.display_name,
      'role', v_user.role,
      'isWorkflowStaff', v_user.is_workflow_staff,
      'email', v_user.email,
      'phone', v_user.phone,
      'avatarUrl', v_user.avatar_url,
      'baseDailyRate', v_user.base_daily_rate
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_staff_credentials(TEXT, TEXT) TO anon, authenticated, service_role;

-- 3. UPDATE DISPATCH_ORDER_WITH_DEPLETION TO ATTRIBUTE SERVER ON RUNNER CHITS
CREATE OR REPLACE FUNCTION public.dispatch_order_with_depletion(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_tab RECORD;
  v_table RECORD;
  v_item RECORD;
  v_ing RECORD;
  v_current_stock NUMERIC;
  v_balance_before NUMERIC;
  v_depleted_count INTEGER := 0;
  v_items_json JSONB := '[]'::jsonb;
  v_chit_data JSONB;
  v_staff_name TEXT := 'Staff';
BEGIN
  -- 1. Lock Order and retrieve associated Tab info
  SELECT o.id, o.tab_id, o.order_number, o.order_type, o.round_number
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT t.id, t.table_id, t.customer_name, t.opened_by_id
  INTO v_tab
  FROM public.tabs t
  WHERE t.id = v_order.tab_id;

  IF v_tab.table_id IS NOT NULL THEN
    SELECT table_number INTO v_table FROM public.tables WHERE id = v_tab.table_id;
  END IF;

  IF v_tab.opened_by_id IS NOT NULL THEN
    SELECT display_name INTO v_staff_name FROM public.users WHERE id = v_tab.opened_by_id;
  END IF;

  -- 2. Ensure order remains OPEN while dispatched to stations
  UPDATE public.orders
  SET status = 'OPEN', updated_at = now()
  WHERE id = p_order_id;

  -- 3. Iterate each item in order to deplete ingredients without altering PENDING status
  FOR v_item IN 
    SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, oi.station_target, oi.notes, p.name AS product_name
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id AND oi.is_depleted = false
  LOOP
    UPDATE public.order_items
    SET is_depleted = true, updated_at = now()
    WHERE id = v_item.order_item_id;

    v_items_json := v_items_json || jsonb_build_object(
      'productName', v_item.product_name,
      'quantity', v_item.quantity,
      'stationTarget', v_item.station_target,
      'notes', COALESCE(v_item.notes, '')
    );

    FOR v_ing IN
      SELECT pi.inventory_item_id, pi.amount, pi.conversion_factor
      FROM public.product_ingredients pi
      WHERE pi.product_id = v_item.product_id
    LOOP
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_ing.inventory_item_id
      FOR UPDATE;

      v_current_stock := v_balance_before - (v_ing.amount * v_item.quantity * v_ing.conversion_factor);

      UPDATE public.inventory_items
      SET current_stock = v_current_stock, updated_at = now()
      WHERE id = v_ing.inventory_item_id;

      INSERT INTO public.stock_movements (
        inventory_item_id,
        movement_type,
        change_amount,
        balance_before,
        balance_after,
        reference_id
      ) VALUES (
        v_ing.inventory_item_id,
        'SALE_DEPLETION',
        -(v_ing.amount * v_item.quantity * v_ing.conversion_factor),
        v_balance_before,
        v_current_stock,
        p_order_id::text
      );

      IF v_current_stock <= 0 THEN
        UPDATE public.products
        SET auto_86 = true,
            out_of_stock_reason = 'Recipe Ingredient Depleted',
            updated_at = now()
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;

    v_depleted_count := v_depleted_count + 1;
  END LOOP;

  -- 4. Atomically enqueue Runner Chit print job for the thermal terminal
  IF jsonb_array_length(v_items_json) > 0 THEN
    v_chit_data := jsonb_build_object(
      'orderId', p_order_id,
      'orderNumber', v_order.order_number,
      'roundNumber', COALESCE(v_order.round_number, 1),
      'tableNumber', CASE WHEN v_table.table_number IS NOT NULL THEN (regexp_replace(v_table.table_number, '[^0-9]', '', 'g'))::integer ELSE NULL END,
      'tabName', v_tab.customer_name,
      'waiterName', COALESCE(v_staff_name, 'Staff'),
      'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI'),
      'items', v_items_json
    );

    INSERT INTO public.print_jobs (
      job_type,
      receipt_data,
      status
    ) VALUES (
      'RUNNER_CHIT',
      v_chit_data,
      'PENDING'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'orderId', p_order_id,
    'depletedItems', v_depleted_count,
    'status', 'OPEN',
    'printJobQueued', (jsonb_array_length(v_items_json) > 0)
  );
END;
$$;

-- 4. UPDATE SETTLE_TAB_AND_RECORD_PAYMENT TO ATTRIBUTE CASHIER/SERVER ON RECEIPTS
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
