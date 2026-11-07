-- ==============================================================================
-- Monk's Dream Jazz Bar and Cafe: Philippine VAT, Service Charge & Discounts
-- Migration: 20261108000001_vat_service_charge_and_senior_pwd_discounts.sql
--
-- 1. Adds mode-aware service charge configuration columns to public.venue_settings.
-- 2. Adds tax, service charge, and statutory discount audit columns to public.payments.
-- 3. Creates public.transfer_order_items_to_tab RPC to split/move items between tabs.
-- 4. Overhauls public.settle_tab_and_record_payment with full statutory precision.
-- 5. Upgrades get_current_x_reading, close_shift_and_generate_y_reading, and
--    close_shift_and_generate_z_reading to aggregate actual payment tax & SC data.
-- ==============================================================================

-- 1. ADD COLUMNS TO VENUE_SETTINGS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'venue_settings' AND column_name = 'cafe_food_service_charge_rate'
  ) THEN
    ALTER TABLE public.venue_settings 
      ADD COLUMN cafe_food_service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'venue_settings' AND column_name = 'event_service_charge_rate'
  ) THEN
    ALTER TABLE public.venue_settings 
      ADD COLUMN event_service_charge_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00;
  END IF;
END $$;

-- 2. ADD COLUMNS TO PAYMENTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'service_charge'
  ) THEN
    ALTER TABLE public.payments 
      ADD COLUMN service_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'vatable_sales'
  ) THEN
    ALTER TABLE public.payments 
      ADD COLUMN vatable_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'vat_amount'
  ) THEN
    ALTER TABLE public.payments 
      ADD COLUMN vat_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'vat_exempt_sales'
  ) THEN
    ALTER TABLE public.payments 
      ADD COLUMN vat_exempt_sales NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'discount_type'
  ) THEN
    ALTER TABLE public.payments 
      ADD COLUMN discount_type TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'senior_pwd_id'
  ) THEN
    ALTER TABLE public.payments 
      ADD COLUMN senior_pwd_id TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'senior_pwd_name'
  ) THEN
    ALTER TABLE public.payments 
      ADD COLUMN senior_pwd_name TEXT DEFAULT NULL;
  END IF;
END $$;

-- 3. NEW RPC: TRANSFER / SPLIT ORDER ITEMS BETWEEN TABS
CREATE OR REPLACE FUNCTION public.transfer_order_items_to_tab(
  p_source_tab_id UUID,
  p_target_tab_id UUID DEFAULT NULL,
  p_table_id UUID DEFAULT NULL,
  p_new_tab_name TEXT DEFAULT NULL,
  p_item_transfers JSONB DEFAULT '[]'::jsonb,
  p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_tab RECORD;
  v_target_tab_id UUID := p_target_tab_id;
  v_target_order_id UUID := NULL;
  v_transfer RECORD;
  v_item RECORD;
  v_item_id UUID;
  v_qty_to_move INT;
  v_source_order RECORD;
  v_new_order_number TEXT;
  v_effective_table_id UUID := p_table_id;
BEGIN
  -- 1. Lock and verify source tab
  SELECT id, table_id, customer_name, order_type, order_channel, operating_mode, status
  INTO v_source_tab
  FROM public.tabs
  WHERE id = p_source_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source tab not found: %', p_source_tab_id;
  END IF;

  IF v_effective_table_id IS NULL THEN
    v_effective_table_id := v_source_tab.table_id;
  END IF;

  -- 2. If target tab is not provided, create a new sub-tab on the table
  IF v_target_tab_id IS NULL THEN
    INSERT INTO public.tabs (
      table_id,
      customer_name,
      order_type,
      order_channel,
      opened_by_id,
      operating_mode,
      status
    ) VALUES (
      v_effective_table_id,
      COALESCE(NULLIF(trim(p_new_tab_name), ''), 'Senior Citizen / Split Tab'),
      v_source_tab.order_type,
      v_source_tab.order_channel,
      p_staff_id,
      COALESCE(v_source_tab.operating_mode, 'CAFE'),
      'OPEN'
    ) RETURNING id INTO v_target_tab_id;
  ELSE
    -- Lock target tab
    PERFORM 1 FROM public.tabs WHERE id = v_target_tab_id FOR UPDATE;
  END IF;

  -- 3. Find or create an open order for the target tab
  SELECT id INTO v_target_order_id
  FROM public.orders
  WHERE tab_id = v_target_tab_id AND status = 'OPEN'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_target_order_id IS NULL THEN
    v_new_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));
    INSERT INTO public.orders (
      tab_id,
      order_number,
      order_type,
      order_channel,
      status
    ) VALUES (
      v_target_tab_id,
      v_new_order_number,
      v_source_tab.order_type,
      v_source_tab.order_channel,
      'OPEN'
    ) RETURNING id INTO v_target_order_id;
  END IF;

  -- 4. Process each item transfer
  FOR v_transfer IN SELECT * FROM jsonb_to_recordset(p_item_transfers) AS x(order_item_id UUID, quantity INT)
  LOOP
    v_item_id := v_transfer.order_item_id;
    v_qty_to_move := COALESCE(v_transfer.quantity, 1);

    SELECT * INTO v_item
    FROM public.order_items
    WHERE id = v_item_id
    FOR UPDATE;

    IF FOUND AND v_item.status != 'CANCELLED' THEN
      IF v_qty_to_move >= v_item.quantity THEN
        -- Transfer entire line item
        UPDATE public.order_items
        SET order_id = v_target_order_id,
            updated_at = now()
        WHERE id = v_item_id;
      ELSE
        -- Split line item: decrement source quantity and insert new item on target order
        UPDATE public.order_items
        SET quantity = v_item.quantity - v_qty_to_move,
            updated_at = now()
        WHERE id = v_item_id;

        INSERT INTO public.order_items (
          order_id,
          product_id,
          quantity,
          unit_price,
          modifiers,
          notes,
          status,
          station_target,
          is_depleted,
          variant_id
        ) VALUES (
          v_target_order_id,
          v_item.product_id,
          v_qty_to_move,
          v_item.unit_price,
          v_item.modifiers,
          v_item.notes,
          v_item.status,
          v_item.station_target,
          v_item.is_depleted,
          v_item.variant_id
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'source_tab_id', p_source_tab_id,
    'target_tab_id', v_target_tab_id,
    'target_order_id', v_target_order_id
  );
END;
$$;

-- 4. DROP PREVIOUS settle_tab_and_record_payment SIGNATURES
DROP FUNCTION IF EXISTS public.settle_tab_and_record_payment(
  UUID, UUID, public.payment_method, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, BOOLEAN, TEXT, TEXT
);

DROP FUNCTION IF EXISTS public.settle_tab_and_record_payment(
  UUID, UUID, public.payment_method, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, BOOLEAN, TEXT, TEXT,
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT, TEXT
);

-- 5. OVERHAUL settle_tab_and_record_payment
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
  p_reference_number TEXT DEFAULT NULL,
  p_service_charge NUMERIC DEFAULT 0.00,
  p_vatable_sales NUMERIC DEFAULT NULL,
  p_vat_amount NUMERIC DEFAULT NULL,
  p_vat_exempt_sales NUMERIC DEFAULT NULL,
  p_discount_type TEXT DEFAULT NULL,
  p_senior_pwd_id TEXT DEFAULT NULL,
  p_senior_pwd_name TEXT DEFAULT NULL
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
  v_vatable_sales NUMERIC(10, 2);
  v_vat_amount NUMERIC(10, 2);
  v_vat_exempt_sales NUMERIC(10, 2);
  v_gross_sales NUMERIC(10, 2) := 0.00;
  v_service_charge NUMERIC(10, 2) := COALESCE(p_service_charge, 0.00);
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

  -- 2. Aggregate all non-cancelled order items for subtotal and receipt itemization
  FOR v_item IN 
    SELECT 
      oi.id AS order_item_id, 
      oi.product_id, 
      oi.quantity, 
      oi.unit_price, 
      oi.modifiers, 
      oi.notes, 
      oi.station_target,
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
      'stationTarget', v_item.station_target,
      'total', (v_item.unit_price * v_item.quantity),
      'modifiers', COALESCE(v_item.modifiers, '[]'::jsonb),
      'notes', COALESCE(v_item.notes, ''),
      'isCorkage', (COALESCE(v_item.notes, '') ILIKE '%corkage%')
    );
  END LOOP;

  v_gross_sales := v_items_subtotal + COALESCE(p_corkage_amount, 0);

  -- 3. Calculate or fallback VAT metrics
  IF p_vatable_sales IS NOT NULL AND p_vat_amount IS NOT NULL THEN
    v_vatable_sales := p_vatable_sales;
    v_vat_amount := p_vat_amount;
    v_vat_exempt_sales := COALESCE(p_vat_exempt_sales, 0.00);
  ELSIF p_discount_amount > 0 AND (p_discount_type IN ('SENIOR_CITIZEN', 'PWD') OR p_discount_type IS NULL) THEN
    -- Senior/PWD VAT-exempt calculation fallback
    v_vat_exempt_sales := ROUND((v_gross_sales / 1.12), 2);
    v_vatable_sales := 0.00;
    v_vat_amount := 0.00;
  ELSE
    -- Standard VAT-inclusive sales fallback
    v_vatable_sales := ROUND(((p_amount - v_service_charge) / 1.12), 2);
    v_vat_amount := (p_amount - v_service_charge) - v_vatable_sales;
    v_vat_exempt_sales := 0.00;
  END IF;

  -- 4. Check if payment record already exists for this tab
  SELECT id INTO v_payment_id
  FROM public.payments
  WHERE tab_id = p_tab_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_payment_id IS NULL THEN
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
      reference_number,
      service_charge,
      vatable_sales,
      vat_amount,
      vat_exempt_sales,
      discount_type,
      senior_pwd_id,
      senior_pwd_name
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
      p_reference_number,
      v_service_charge,
      v_vatable_sales,
      v_vat_amount,
      v_vat_exempt_sales,
      p_discount_type,
      p_senior_pwd_id,
      p_senior_pwd_name
    ) RETURNING id INTO v_payment_id;

    -- Cash Drawer Transaction for CASH settlement
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

    -- 5. Build Rich Customer Receipt Payload for ESC/POS Thermal Printing
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
      'grossSales', v_gross_sales,
      'corkage_amount', p_corkage_amount,
      'corkageAmount', p_corkage_amount,
      'corkageFee', p_corkage_amount,
      'discount_amount', p_discount_amount,
      'discountAmount', p_discount_amount,
      'discount', p_discount_amount,
      'discountType', p_discount_type,
      'service_charge', v_service_charge,
      'serviceCharge', v_service_charge,
      'tip_amount', p_tip_amount,
      'tipAmount', p_tip_amount,
      'amount', p_amount,
      'total', p_amount,
      'vatableSales', v_vatable_sales,
      'vatAmount', v_vat_amount,
      'vatExemptSales', v_vat_exempt_sales,
      'senior_pwd_id', p_senior_pwd_id,
      'seniorPwdId', p_senior_pwd_id,
      'senior_pwd_name', p_senior_pwd_name,
      'seniorPwdName', p_senior_pwd_name,
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

  -- 6. Update Tab status & order cascade
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

-- 6. UPGRADE get_current_x_reading TO SUM STORED SERVICE CHARGE AND TAX
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
    v_opened_at := date_trunc('day', now());
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
    COUNT(id),
    MIN(id),
    MAX(id),
    COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN 0 ELSE amount END), 0.00),
    COALESCE(SUM(CASE WHEN operating_mode = 'EVENT' THEN amount ELSE 0 END), 0.00),
    COUNT(CASE WHEN operating_mode = 'EVENT' THEN NULL ELSE 1 END),
    COUNT(CASE WHEN operating_mode = 'EVENT' THEN 1 ELSE NULL END)
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
    v_cafe_sales,
    v_event_sales,
    v_cafe_tx_count,
    v_event_tx_count
  FROM public.payments
  WHERE created_at >= v_opened_at
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  v_total_tender := v_tender_cash + v_tender_card + v_tender_digital + v_tender_delivery;

  -- Fallback for legacy rows if vatable_sales was not recorded
  IF v_vatable_sales = 0.00 AND v_vat_exempt_sales = 0.00 AND v_net_sales > 0 THEN
    IF v_service_charge = 0.00 THEN
      v_service_charge := ROUND((v_net_sales * 0.10) / 1.10, 2);
    END IF;
    v_vatable_sales := ROUND((v_net_sales - v_service_charge) / 1.12, 2);
    v_vat_amount := (v_net_sales - v_service_charge) - v_vatable_sales;
  END IF;

  -- Drawer actions aggregation
  SELECT
    COALESCE(SUM(CASE WHEN action_type = 'FLOAT' THEN amount ELSE 0 END), v_default_float),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_IN' THEN amount ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'CASH_OUT' THEN ABS(amount) ELSE 0 END), 0.00),
    COALESCE(SUM(CASE WHEN action_type = 'DROP' THEN ABS(amount) ELSE 0 END), 0.00)
  INTO
    v_opening_float,
    v_cash_in,
    v_cash_out,
    v_safe_drops
  FROM public.cash_drawer_transactions
  WHERE created_at >= v_opened_at
    AND (p_drawer = 'consolidated' OR drawer_target = p_drawer);

  v_expected_cash := (v_opening_float + v_cash_in + v_tender_cash) - (v_cash_out + v_safe_drops);

  RETURN jsonb_build_object(
    'gross_sales', v_gross_sales,
    'discounts', v_discounts,
    'net_sales', v_net_sales,
    'vatable_sales', v_vatable_sales,
    'vat_amount', v_vat_amount,
    'vat_exempt_sales', v_vat_exempt_sales,
    'zero_rated_sales', 0.00,
    'service_charge', v_service_charge,
    'tender_cash', v_tender_cash,
    'tender_card', v_tender_card,
    'tender_digital', v_tender_digital,
    'tender_delivery', v_tender_delivery,
    'total_tender', v_total_tender,
    'transaction_count', v_tx_count,
    'first_receipt_number', CASE WHEN v_first_pid IS NOT NULL THEN 'REC-' || substring(v_first_pid::text from 1 for 8) ELSE 'NONE' END,
    'last_receipt_number', CASE WHEN v_last_pid IS NOT NULL THEN 'REC-' || substring(v_last_pid::text from 1 for 8) ELSE 'NONE' END,
    'opening_float', v_opening_float,
    'cash_in', v_cash_in,
    'cash_out', v_cash_out,
    'safe_drops', v_safe_drops,
    'expected_cash', v_expected_cash,
    'drawer_target', p_drawer,
    'scope', p_scope,
    'opened_at', v_opened_at,
    'generated_at', now(),
    'cafe_sales', v_cafe_sales,
    'event_sales', v_event_sales,
    'cafe_tx_count', v_cafe_tx_count,
    'event_tx_count', v_event_tx_count
  );
END;
$$;
