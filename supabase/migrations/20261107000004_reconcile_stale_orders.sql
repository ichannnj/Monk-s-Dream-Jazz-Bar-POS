-- Migration: 20261107000004_reconcile_stale_orders.sql
-- Description: Automatically reconciles and cancels abandoned stale unbilled orders and tabs 
--              from prior operating days (before the 6:00 AM Asia/Manila business cutoff),
--              preventing previous-day tickets from polluting live station queues and metrics.

-- 1. Create Stale Orders Reconciler Function
CREATE OR REPLACE FUNCTION public.reconcile_stale_open_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_local TIMESTAMP;
  v_today_6am_local TIMESTAMP;
  v_cutoff_timestamptz TIMESTAMPTZ;
  v_cancelled_items_count INT := 0;
  v_cancelled_orders_count INT := 0;
  v_voided_tabs_count INT := 0;
BEGIN
  -- Compute most recent 6:00 AM cutoff in venue timezone (Asia/Manila, UTC+8)
  v_now_local := timezone('Asia/Manila', now());
  v_today_6am_local := date_trunc('day', v_now_local) + interval '6 hours';

  IF v_now_local >= v_today_6am_local THEN
    v_cutoff_timestamptz := v_today_6am_local AT TIME ZONE 'Asia/Manila';
  ELSE
    v_cutoff_timestamptz := (v_today_6am_local - interval '1 day') AT TIME ZONE 'Asia/Manila';
  END IF;

  -- 1a. Cancel stale active order items from orders created before the 6:00 AM cutoff
  WITH updated_items AS (
    UPDATE public.order_items oi
    SET status = 'CANCELLED',
        updated_at = now()
    FROM public.orders o
    WHERE oi.order_id = o.id
      AND oi.status IN ('PENDING', 'PREPARING', 'READY')
      AND o.created_at < v_cutoff_timestamptz
    RETURNING oi.id
  )
  SELECT count(*) INTO v_cancelled_items_count FROM updated_items;

  -- 1b. Cancel stale open orders created before the 6:00 AM cutoff
  WITH updated_orders AS (
    UPDATE public.orders
    SET status = 'CANCELLED',
        updated_at = now()
    WHERE status IN ('OPEN', 'IN_PREPARATION')
      AND created_at < v_cutoff_timestamptz
    RETURNING id
  )
  SELECT count(*) INTO v_cancelled_orders_count FROM updated_orders;

  -- 1c. Cancel abandoned tabs created before the 6:00 AM cutoff that were left OPEN
  WITH updated_tabs AS (
    UPDATE public.tabs
    SET status = 'CANCELLED',
        updated_at = now()
    WHERE status = 'OPEN'
      AND created_at < v_cutoff_timestamptz
    RETURNING id, table_id
  )
  SELECT count(*) INTO v_voided_tabs_count FROM updated_tabs;

  -- 1d. Auto-sync physical table occupancy for any tables whose tabs were voided
  UPDATE public.tables t
  SET is_occupied = false,
      updated_at = now()
  WHERE is_occupied = true
    AND NOT EXISTS (
      SELECT 1 FROM public.tabs tab
      WHERE tab.table_id = t.id
        AND tab.status = 'OPEN'
    );

  RETURN jsonb_build_object(
    'success', true,
    'cutoff', v_cutoff_timestamptz,
    'cancelled_items', v_cancelled_items_count,
    'cancelled_orders', v_cancelled_orders_count,
    'voided_tabs', v_voided_tabs_count
  );
END;
$$;

-- 2. Hook into 6:00 AM Daily Operating Mode Reconciler
CREATE OR REPLACE FUNCTION public.reconcile_operating_mode_6am()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_local TIMESTAMP;
  v_today_6am_local TIMESTAMP;
  v_cutoff_timestamptz TIMESTAMPTZ;
  v_settings public.venue_settings%ROWTYPE;
BEGIN
  -- Compute most recent 6:00 AM in venue timezone (Asia/Manila, UTC+8)
  v_now_local := timezone('Asia/Manila', now());
  v_today_6am_local := date_trunc('day', v_now_local) + interval '6 hours';

  IF v_now_local >= v_today_6am_local THEN
    v_cutoff_timestamptz := v_today_6am_local AT TIME ZONE 'Asia/Manila';
  ELSE
    v_cutoff_timestamptz := (v_today_6am_local - interval '1 day') AT TIME ZONE 'Asia/Manila';
  END IF;

  -- Revert venue_settings from EVENT mode to CAFE if before cutoff
  UPDATE public.venue_settings
  SET operating_mode = 'CAFE',
      mode_switched_at = now(),
      updated_at = now()
  WHERE operating_mode = 'EVENT'
    AND COALESCE(mode_switched_at, updated_at) < v_cutoff_timestamptz;

  -- Automatically clean up and cancel stale unbilled orders from prior days
  PERFORM public.reconcile_stale_open_orders();

  SELECT *
  INTO v_settings
  FROM public.venue_settings
  LIMIT 1;

  RETURN to_jsonb(v_settings);
END;
$$;

-- 3. Execute immediate cleanup of existing stale records from prior operating days
SELECT public.reconcile_stale_open_orders();
