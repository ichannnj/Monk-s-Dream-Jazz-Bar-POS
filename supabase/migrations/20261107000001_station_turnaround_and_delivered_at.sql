-- ============================================================================
-- Monk's Dream Jazz Bar POS — Real Station Turnaround & Table Turnover
-- Migration: 20261107000001_station_turnaround_and_delivered_at.sql
-- Description:
--   1. Adds delivered_at TIMESTAMPTZ to public.order_items to freeze turnaround
--      timing upon handoff (runner "Deliver to Table" / waiter served / settlement).
--   2. Creates trigger trg_set_order_item_delivered_at to automatically stamp
--      delivered_at = COALESCE(delivered_at, now()) when status becomes 'SERVED'.
--   3. Adds station_metrics_reset_at TIMESTAMPTZ to public.venue_settings to
--      support shift/service baseline resets without deleting historical data.
--   4. Creates RPCs reset_station_turnaround_metrics and clear_station_turnaround_reset
--      guarded by 4-digit Manager PIN verification.
-- ============================================================================

-- 1. Add delivered_at column to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.order_items ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
END $$;

-- 1b. Backfill delivered_at for existing SERVED items using updated_at or created_at
UPDATE public.order_items
SET delivered_at = COALESCE(updated_at, created_at, now())
WHERE status = 'SERVED' AND delivered_at IS NULL;

-- 2. Trigger function to stamp delivered_at on order_items
CREATE OR REPLACE FUNCTION public.fn_set_order_item_delivered_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'SERVED' THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, OLD.delivered_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_item_delivered_at ON public.order_items;
CREATE TRIGGER trg_set_order_item_delivered_at
BEFORE INSERT OR UPDATE OF status, delivered_at ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_order_item_delivered_at();

-- 3. Add station_metrics_reset_at to venue_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'venue_settings'
      AND column_name = 'station_metrics_reset_at'
  ) THEN
    ALTER TABLE public.venue_settings ADD COLUMN station_metrics_reset_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. RPC: Reset Station Turnaround Metrics Baseline
CREATE OR REPLACE FUNCTION public.reset_station_turnaround_metrics(
  p_manager_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_verify JSONB;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Verify Manager Override PIN (PIN 9999 or crypt hash)
  v_verify := public.verify_manager_override_pin(p_manager_pin);
  IF NOT (v_verify->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_verify->>'error', 'Invalid Manager PIN. Authorization denied.')
    );
  END IF;

  UPDATE public.venue_settings
  SET station_metrics_reset_at = v_now,
      updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'reset_at', v_now,
    'manager_name', v_verify->>'managerName'
  );
END;
$$;

-- 5. RPC: Clear Station Turnaround Metrics Baseline (Show Full Day)
CREATE OR REPLACE FUNCTION public.clear_station_turnaround_reset()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.venue_settings
  SET station_metrics_reset_at = NULL,
      updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_station_turnaround_metrics(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_station_turnaround_reset() TO anon, authenticated, service_role;
