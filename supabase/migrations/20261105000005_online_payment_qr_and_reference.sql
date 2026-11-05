-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Online Payment QR Channels & 4-Digit Reference Tracking
-- Migration: 20261105000005_online_payment_qr_and_reference.sql
-- ==============================================================================

-- 1. Create Venue QR Payment Channels Table
CREATE TABLE IF NOT EXISTS public.venue_qr_payment_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                         -- e.g. 'GCash', 'Maya', 'BPI QRPH'
  channel_code TEXT NOT NULL,                 -- e.g. 'gcash', 'maya', 'bank_transfer', 'qrph'
  account_name TEXT NOT NULL,                 -- e.g. "Monk's Dream Jazz Bar Corp"
  account_number TEXT NOT NULL,               -- e.g. "0917-555-1234"
  qr_image_url TEXT NOT NULL,                 -- Public URL or data URI
  qr_storage_path TEXT,                       -- Storage object path for deletion/cleanup
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venue_qr_payment_channels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'venue_qr_payment_channels' AND policyname = 'Public Read Qr Payment Channels'
  ) THEN
    CREATE POLICY "Public Read Qr Payment Channels"
      ON public.venue_qr_payment_channels FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'venue_qr_payment_channels' AND policyname = 'Allow Manage Qr Payment Channels'
  ) THEN
    CREATE POLICY "Allow Manage Qr Payment Channels"
      ON public.venue_qr_payment_channels FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime Sync
ALTER TABLE public.venue_qr_payment_channels REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'venue_qr_payment_channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_qr_payment_channels;
  END IF;
END $$;

-- 2. Configure Supabase Storage Bucket for Payment QR Codes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-qr-codes',
  'payment-qr-codes',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage object policies for payment-qr-codes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access for Payment QR Codes'
  ) THEN
    CREATE POLICY "Public Access for Payment QR Codes"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'payment-qr-codes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff Manage Payment QR Codes'
  ) THEN
    CREATE POLICY "Staff Manage Payment QR Codes"
      ON storage.objects FOR ALL
      USING (bucket_id = 'payment-qr-codes')
      WITH CHECK (bucket_id = 'payment-qr-codes');
  END IF;
END $$;

-- 3. Add payment_channel and reference_number to public.payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_channel TEXT,
  ADD COLUMN IF NOT EXISTS reference_number VARCHAR(32);

-- 4. Update settle_tab_and_record_payment RPC to accept payment_channel & reference_number
DROP FUNCTION IF EXISTS public.settle_tab_and_record_payment(
  UUID,
  UUID,
  public.payment_method,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  TEXT,
  BOOLEAN
);

DROP FUNCTION IF EXISTS public.settle_tab_and_record_payment(
  UUID,
  UUID,
  public.payment_method,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  NUMERIC,
  TEXT,
  BOOLEAN,
  TEXT,
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
      'is_prepaid', true,
      'payment_channel', p_payment_channel,
      'reference_number', p_reference_number
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
    -- Insert Payment Record with operating_mode inherited from Tab, plus payment_channel and reference_number
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
      'payment_channel', p_payment_channel,
      'reference_number', p_reference_number,
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
    'is_prepaid', true,
    'payment_channel', p_payment_channel,
    'reference_number', p_reference_number
  );
END;
$$;

-- 5. Seed Initial Sample QR Payment Channels
INSERT INTO public.venue_qr_payment_channels (
  id,
  name,
  channel_code,
  account_name,
  account_number,
  qr_image_url,
  sort_order,
  is_active
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    'GCash',
    'gcash',
    'Monk''s Dream Jazz Bar Corp',
    '0917-888-JAZZ (5299)',
    'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=GCASH-MONKSDREAM-09178885299',
    1,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Maya',
    'maya',
    'Monk''s Dream Jazz Bar Corp',
    '0918-999-MOOD (6663)',
    'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=MAYA-MONKSDREAM-09189996663',
    2,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'QRPH / Bank Transfer',
    'qrph',
    'Monk''s Dream Jazz Bar Corp (BPI)',
    '0042-8881-22',
    'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=QRPH-BPI-MONKSDREAM-0042888122',
    3,
    true
  )
ON CONFLICT (id) DO NOTHING;

