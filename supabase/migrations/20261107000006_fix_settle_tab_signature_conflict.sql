-- ==============================================================================
-- Monk's Dream Jazz Bar and Cafe: Fix settle_tab_and_record_payment Function Signature Ambiguity
-- Migration: 20261107000006_fix_settle_tab_signature_conflict.sql
--
-- Drops the overloaded TEXT variant and consolidates onto single canonical
-- public.payment_method enum signature so Postgres does not raise:
-- "Could not choose the best candidate function between..."
-- ==============================================================================

-- 1. Drop both overloaded candidates to clear the signature catalog
DROP FUNCTION IF EXISTS public.settle_tab_and_record_payment(
  UUID, UUID, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, BOOLEAN, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.settle_tab_and_record_payment(
  UUID, UUID, public.payment_method, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, BOOLEAN, TEXT, TEXT
);

-- 2. Create the single canonical version with public.payment_method enum
CREATE OR REPLACE FUNCTION public.settle_tab_and_record_payment(
  p_tab_id UUID,
  p_staff_id UUID,
  p_payment_method public.payment_method,
  p_amount NUMERIC,
  p_corkage_amount NUMERIC DEFAULT 0.00,
  p_discount_amount NUMERIC DEFAULT 0.00,
  p_tip_amount NUMERIC DEFAULT 0.00,
  p_notes TEXT DEFAULT NULL,
  p_keep_open_for_prep BOOLEAN DEFAULT false,
  p_payment_channel TEXT DEFAULT NULL,
  p_reference_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tab RECORD;
  v_payment_id UUID;
  v_staff_name TEXT := 'Staff';
  v_table_number TEXT := NULL;
  v_receipt_data JSONB;
  v_final_status public.tab_status;
  v_items_json JSONB := '[]'::jsonb;
  v_item RECORD;
  v_item_display_name TEXT;
  v_items_subtotal NUMERIC(10, 2) := 0.00;
  v_vatable_sales NUMERIC(10, 2) := 0.00;
  v_vat_amount NUMERIC(10, 2) := 0.00;
  v_vat_exempt_sales NUMERIC(10, 2) := 0.00;
  v_gross_sales NUMERIC(10, 2) := 0.00;
BEGIN
  -- 1. Lock and retrieve Tab
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
      'is_prepaid', true,
      'payment_channel', p_payment_channel,
      'reference_number', p_reference_number
    );
  END IF;

  IF p_staff_id IS NOT NULL THEN
    SELECT display_name INTO v_staff_name FROM public.users WHERE id = p_staff_id;
  END IF;

  IF v_tab.table_id IS NOT NULL THEN
    SELECT table_number INTO v_table_number FROM public.tables WHERE id = v_tab.table_id;
  END IF;

  -- 2. Check if payment record already exists for this tab
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
      operating_mode,
      payment_channel,
      reference_number
    ) VALUES (
      p_tab_id,
      p_staff_id,
      p_payment_method,
      p_amount,
      p_corkage_amount,
      p_discount_amount,
      p_tip_amount,
      p_notes,
      COALESCE(v_tab.operating_mode, 'CAFE'),
      p_payment_channel,
      p_reference_number
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

    -- 4. Aggregate all non-cancelled order items for customer receipt printing
    FOR v_item IN 
      SELECT 
        oi.id AS order_item_id, 
        oi.product_id, 
        oi.quantity, 
        oi.unit_price, 
        oi.modifiers, 
        oi.notes, 
        p.name AS product_name,
        pv.temperature,
        pv.size_label
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.product_variants pv ON pv.id = oi.variant_id
      WHERE o.tab_id = p_tab_id AND oi.status != 'CANCELLED'
      ORDER BY oi.created_at ASC
    LOOP
      v_item_display_name := v_item.product_name;
      IF v_item.temperature IS NOT NULL AND v_item.temperature NOT IN ('NONE', 'ROOM') THEN
        v_item_display_name := v_item_display_name || ' (' || 
          CASE WHEN v_item.temperature = 'HOT' THEN 'Hot' ELSE 'Iced' END;
        IF v_item.size_label IS NOT NULL AND v_item.size_label != 'Standard' THEN
          v_item_display_name := v_item_display_name || ' · ' || v_item.size_label;
        END IF;
        v_item_display_name := v_item_display_name || ')';
      ELSIF v_item.size_label IS NOT NULL AND v_item.size_label != 'Standard' THEN
        v_item_display_name := v_item_display_name || ' (' || v_item.size_label || ')';
      END IF;

      v_items_subtotal := v_items_subtotal + (v_item.unit_price * v_item.quantity);

      v_items_json := v_items_json || jsonb_build_object(
        'name', v_item_display_name,
        'productName', v_item.product_name,
        'temperature', v_item.temperature,
        'size', v_item.size_label,
        'quantity', v_item.quantity,
        'price', v_item.unit_price,
        'unit_price', v_item.unit_price,
        'total', (v_item.unit_price * v_item.quantity),
        'modifiers', COALESCE(v_item.modifiers, '[]'::jsonb),
        'notes', COALESCE(v_item.notes, ''),
        'isCorkage', (COALESCE(v_item.notes, '') ILIKE '%corkage%')
      );
    END LOOP;

    -- Compute gross sales & Philippine VAT breakdown (12%)
    v_gross_sales := v_items_subtotal + COALESCE(p_corkage_amount, 0);

    IF p_discount_amount > 0 THEN
      -- SC / PWD statutory or promo discount: compute VAT-exempt base
      v_vat_exempt_sales := ROUND((v_gross_sales / 1.12), 2);
      v_vatable_sales := 0.00;
      v_vat_amount := 0.00;
    ELSE
      -- Standard VAT-inclusive sales
      v_vatable_sales := ROUND((p_amount / 1.12), 2);
      v_vat_amount := p_amount - v_vatable_sales;
      v_vat_exempt_sales := 0.00;
    END IF;

    -- Build rich Receipt payload
    v_receipt_data := jsonb_build_object(
      'receiptNumber', 'MD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(v_payment_id::text from 1 for 4)),
      'payment_id', v_payment_id,
      'paymentId', v_payment_id,
      'tab_id', v_tab.id,
      'tabId', v_tab.id,
      'table_id', v_tab.table_id,
      'tableId', v_tab.table_id,
      'tableNumber', CASE WHEN v_table_number IS NOT NULL THEN (regexp_replace(v_table_number, '[^0-9]', '', 'g'))::integer ELSE NULL END,
      'tableLabel', v_table_number,
      'ticket_number', v_tab.ticket_number,
      'ticketNumber', v_tab.ticket_number,
      'customer_name', v_tab.customer_name,
      'customerName', v_tab.customer_name,
      'tabName', v_tab.customer_name,
      'order_type', v_tab.order_type,
      'orderType', v_tab.order_type,
      'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
      'operatingMode', COALESCE(v_tab.operating_mode, 'CAFE'),
      'payment_method', p_payment_method::text,
      'paymentMethod', p_payment_method::text,
      'payment_channel', p_payment_channel,
      'paymentChannel', p_payment_channel,
      'reference_number', p_reference_number,
      'referenceNumber', p_reference_number,
      'items', v_items_json,
      'subtotal', v_items_subtotal,
      'corkage_amount', p_corkage_amount,
      'corkageAmount', p_corkage_amount,
      'corkageFee', p_corkage_amount,
      'discount_amount', p_discount_amount,
      'discountAmount', p_discount_amount,
      'discount', p_discount_amount,
      'tip_amount', p_tip_amount,
      'tipAmount', p_tip_amount,
      'amount', p_amount,
      'total', p_amount,
      'vatableSales', v_vatable_sales,
      'vatAmount', v_vat_amount,
      'vatExemptSales', v_vat_exempt_sales,
      'staff_name', v_staff_name,
      'staffName', v_staff_name,
      'waiterName', v_staff_name,
      'cashierName', v_staff_name,
      'settled_at', now(),
      'settledAt', now(),
      'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI')
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
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'tab_id', v_tab.id,
    'operating_mode', COALESCE(v_tab.operating_mode, 'CAFE'),
    'status', v_final_status,
    'is_prepaid', true,
    'payment_channel', p_payment_channel,
    'reference_number', p_reference_number
  );
END;
$$;

