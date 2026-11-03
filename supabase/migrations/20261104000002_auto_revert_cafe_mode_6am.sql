-- ==============================================================================
-- Monk's Dream Jazz Bar POS — 6:00 AM Automatic Revert to Daytime Cafe Mode
-- Migration: 20261104000002_auto_revert_cafe_mode_6am.sql
-- ==============================================================================

-- 1. Track the exact timestamp when operating_mode was last switched
ALTER TABLE public.venue_settings
ADD COLUMN IF NOT EXISTS mode_switched_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill mode_switched_at with updated_at for existing row
UPDATE public.venue_settings
SET mode_switched_at = COALESCE(updated_at, now())
WHERE mode_switched_at IS NULL;

-- 2. Trigger to automatically stamp mode_switched_at whenever operating_mode changes
CREATE OR REPLACE FUNCTION public.fn_track_operating_mode_switch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.operating_mode IS DISTINCT FROM OLD.operating_mode THEN
    NEW.mode_switched_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_operating_mode_switch ON public.venue_settings;
CREATE TRIGGER trg_track_operating_mode_switch
BEFORE UPDATE ON public.venue_settings
FOR EACH ROW
EXECUTE FUNCTION public.fn_track_operating_mode_switch();

-- 3. Authoritative 6:00 AM Morning Cafe Mode Reconciler
-- Automatically reverts operating_mode from 'EVENT' to 'CAFE' once 6:00 AM (Asia/Manila)
-- has passed since Event Mode was activated.
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

  -- Check if venue_settings is currently in EVENT mode from before the latest 6:00 AM cutoff
  UPDATE public.venue_settings
  SET operating_mode = 'CAFE',
      mode_switched_at = now(),
      updated_at = now()
  WHERE operating_mode = 'EVENT'
    AND COALESCE(mode_switched_at, updated_at) < v_cutoff_timestamptz;

  SELECT *
  INTO v_settings
  FROM public.venue_settings
  LIMIT 1;

  RETURN to_jsonb(v_settings);
END;
$$;

-- 4. Ensure new customer tabs opened after 6:00 AM automatically reconcile and inherit CAFE mode
CREATE OR REPLACE FUNCTION public.fn_reconcile_tab_mode_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_local TIMESTAMP;
  v_today_6am_local TIMESTAMP;
  v_cutoff_timestamptz TIMESTAMPTZ;
  v_active_mode public.operating_mode;
BEGIN
  v_now_local := timezone('Asia/Manila', now());
  v_today_6am_local := date_trunc('day', v_now_local) + interval '6 hours';

  IF v_now_local >= v_today_6am_local THEN
    v_cutoff_timestamptz := v_today_6am_local AT TIME ZONE 'Asia/Manila';
  ELSE
    v_cutoff_timestamptz := (v_today_6am_local - interval '1 day') AT TIME ZONE 'Asia/Manila';
  END IF;

  UPDATE public.venue_settings
  SET operating_mode = 'CAFE',
      mode_switched_at = now(),
      updated_at = now()
  WHERE operating_mode = 'EVENT'
    AND COALESCE(mode_switched_at, updated_at) < v_cutoff_timestamptz;

  SELECT operating_mode
  INTO v_active_mode
  FROM public.venue_settings
  LIMIT 1;

  IF v_active_mode IS NOT NULL THEN
    NEW.operating_mode := v_active_mode;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reconcile_tab_mode_before_insert ON public.tabs;
CREATE TRIGGER trg_reconcile_tab_mode_before_insert
BEFORE INSERT ON public.tabs
FOR EACH ROW
EXECUTE FUNCTION public.fn_reconcile_tab_mode_before_insert();

-- 5. Optional pg_cron schedule (runs daily at 6:00 AM Asia/Manila = 22:00 UTC when pg_cron is enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'monks-dream-auto-cafe-mode-6am',
      '0 22 * * *',
      'SELECT public.reconcile_operating_mode_6am();'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if pg_cron is not installed in local dev environment
    NULL;
END $$;
