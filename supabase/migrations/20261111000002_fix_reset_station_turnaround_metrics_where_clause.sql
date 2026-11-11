-- Migration: 20261111000002_fix_reset_station_turnaround_metrics_where_clause.sql
-- Description: Add WHERE clause to UPDATE public.venue_settings in reset_station_turnaround_metrics
--              and clear_station_turnaround_reset to comply with strict update guards (UPDATE requires a WHERE clause).

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
  v_settings_id UUID;
BEGIN
  -- Verify Manager Override PIN (PIN 9999 or crypt hash)
  v_verify := public.verify_manager_override_pin(p_manager_pin);
  IF NOT (v_verify->>'success')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_verify->>'error', 'Invalid Manager PIN. Authorization denied.')
    );
  END IF;

  -- Get single venue_settings ID
  SELECT id INTO v_settings_id FROM public.venue_settings LIMIT 1;

  IF v_settings_id IS NOT NULL THEN
    UPDATE public.venue_settings
    SET station_metrics_reset_at = v_now,
        updated_at = v_now
    WHERE id = v_settings_id;
  ELSE
    UPDATE public.venue_settings
    SET station_metrics_reset_at = v_now,
        updated_at = v_now
    WHERE id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reset_at', v_now,
    'manager_name', v_verify->>'managerName'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_station_turnaround_reset()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  SELECT id INTO v_settings_id FROM public.venue_settings LIMIT 1;

  IF v_settings_id IS NOT NULL THEN
    UPDATE public.venue_settings
    SET station_metrics_reset_at = NULL,
        updated_at = now()
    WHERE id = v_settings_id;
  ELSE
    UPDATE public.venue_settings
    SET station_metrics_reset_at = NULL,
        updated_at = now()
    WHERE id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_station_turnaround_metrics(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_station_turnaround_reset() TO anon, authenticated, service_role;
