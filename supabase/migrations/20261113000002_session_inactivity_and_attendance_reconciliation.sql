-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Session Inactivity Watchdog & Attendance Reconciliation
-- Migration: 20261113000001_session_inactivity_and_attendance_reconciliation.sql
-- ==============================================================================

-- 1. Add last_activity_at to public.users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_users_last_activity
ON public.users(id, last_activity_at);

-- 2. Touch User Activity RPC (Lightweight keep-alive called periodically by active workstations)
CREATE OR REPLACE FUNCTION public.touch_user_activity(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.users
  SET last_activity_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', p_user_id,
    'touchedAt', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_user_activity(UUID) TO anon, authenticated, service_role;

-- 3. Auto Clock Out Inactive User RPC
-- Closes an active attendance record for an inactive workstation session.
-- Crucial invariant: sets clock_out_at to p_last_activity_at (or users.last_activity_at)
-- to avoid overpaying ghost hours, while tagging with [AUTO-OUT: Inactive since <time>].
CREATE OR REPLACE FUNCTION public.auto_clock_out_inactive_user(
  p_user_id UUID,
  p_last_activity_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_rec RECORD;
  v_effective_clock_out TIMESTAMPTZ;
  v_clock_in TIMESTAMPTZ;
  v_hours NUMERIC(6, 2) := 0.00;
  v_total_hours NUMERIC(6, 2) := 0.00;
  v_business_date DATE;
  v_note_text TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Manila 6:00 AM business day alignment
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  SELECT id, username, display_name, role, last_activity_at, last_login_at
  INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found.'
    );
  END IF;

  -- Find open CLOCKED_IN record for current or previous business date
  SELECT * INTO v_rec
  FROM public.attendance_records
  WHERE user_id = p_user_id
    AND shift_status = 'CLOCKED_IN'
  ORDER BY clock_in_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    -- No open attendance shift, just record session end
    UPDATE public.users
    SET last_activity_at = COALESCE(p_last_activity_at, v_now)
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'attendanceClosed', false,
      'message', 'No active attendance shift to close.'
    );
  END IF;

  -- Compute authoritative clock_out timestamp based on last activity
  v_effective_clock_out := COALESCE(p_last_activity_at, v_user.last_activity_at, v_now);
  v_clock_in := COALESCE(v_rec.clock_in_at, v_now);

  -- Ensure clock_out is not prior to clock_in
  IF v_effective_clock_out < v_clock_in THEN
    v_effective_clock_out := v_clock_in;
  END IF;

  v_hours := ROUND((GREATEST(0.00, EXTRACT(EPOCH FROM (v_effective_clock_out - v_clock_in)) / 3600.0))::NUMERIC, 2);
  v_total_hours := ROUND((COALESCE(v_rec.hours_worked, 0.00) + v_hours)::NUMERIC, 2);

  v_note_text := COALESCE(v_rec.notes || ' | ', '') ||
    '[AUTO-OUT: Inactive since ' ||
    to_char(v_effective_clock_out AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH12:MI AM') || ' PHT]';

  UPDATE public.attendance_records
  SET
    shift_status = 'COMPLETED',
    clock_out_at = v_effective_clock_out,
    hours_worked = v_total_hours,
    notes = v_note_text,
    updated_at = v_now
  WHERE id = v_rec.id;

  -- Update user last activity
  UPDATE public.users
  SET last_activity_at = v_effective_clock_out
  WHERE id = p_user_id;

  -- Broadcast real-time sync event so attendance views refresh across devices
  PERFORM extensions.pg_notify(
    'pos_global_sync',
    json_build_object(
      'event', 'pos:sync_needed',
      'source', 'auto_clock_out_inactive_user',
      'userId', p_user_id,
      'attendanceRecordId', v_rec.id
    )::text
  );

  RETURN jsonb_build_object(
    'success', true,
    'attendanceClosed', true,
    'recordId', v_rec.id,
    'clockOutAt', v_effective_clock_out,
    'hoursWorked', v_total_hours,
    'notes', v_note_text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_clock_out_inactive_user(UUID, TIMESTAMPTZ) TO anon, authenticated, service_role;

-- 4. Server-Side Attendance Reconciliation Sweep RPC
-- Identifies and auto-closes abandoned CLOCKED_IN records if inactive:
-- >= 3 hours during late-night window (12:00 AM - 6:00 AM Manila time)
-- >= 6 hours during daytime window (6:00 AM - 11:59 PM Manila time)
CREATE OR REPLACE FUNCTION public.reconcile_inactive_attendance_shifts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_manila_now TIMESTAMP;
  v_manila_hour INT;
  v_threshold_hours INT;
  v_rec RECORD;
  v_closed_count INT := 0;
  v_effective_clock_out TIMESTAMPTZ;
  v_hours NUMERIC(6, 2);
  v_total_hours NUMERIC(6, 2);
  v_note_text TEXT;
BEGIN
  -- Manila local time and hour
  v_manila_now := timezone('Asia/Manila', v_now);
  v_manila_hour := EXTRACT(HOUR FROM v_manila_now);

  -- Dynamic threshold: 3 hours between 12:00 AM (00:00) and 05:59; 6 hours otherwise
  IF v_manila_hour >= 0 AND v_manila_hour < 6 THEN
    v_threshold_hours := 3;
  ELSE
    v_threshold_hours := 6;
  END IF;

  FOR v_rec IN
    SELECT ar.id, ar.user_id, ar.clock_in_at, ar.hours_worked, ar.notes,
           COALESCE(u.last_activity_at, u.last_login_at, ar.clock_in_at, ar.created_at) AS last_active
    FROM public.attendance_records ar
    JOIN public.users u ON u.id = ar.user_id
    WHERE ar.shift_status = 'CLOCKED_IN'
  LOOP
    -- Check if inactive duration exceeds threshold
    IF (v_now - v_rec.last_active) >= (v_threshold_hours || ' hours')::INTERVAL THEN
      v_effective_clock_out := v_rec.last_active;
      IF v_effective_clock_out < COALESCE(v_rec.clock_in_at, v_now) THEN
        v_effective_clock_out := COALESCE(v_rec.clock_in_at, v_now);
      END IF;

      v_hours := ROUND((GREATEST(0.00, EXTRACT(EPOCH FROM (v_effective_clock_out - v_rec.clock_in_at)) / 3600.0))::NUMERIC, 2);
      v_total_hours := ROUND((COALESCE(v_rec.hours_worked, 0.00) + v_hours)::NUMERIC, 2);

      v_note_text := COALESCE(v_rec.notes || ' | ', '') ||
        '[AUTO-OUT: Inactive since ' ||
        to_char(v_effective_clock_out AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD HH12:MI AM') || ' PHT]';

      UPDATE public.attendance_records
      SET
        shift_status = 'COMPLETED',
        clock_out_at = v_effective_clock_out,
        hours_worked = v_total_hours,
        notes = v_note_text,
        updated_at = v_now
      WHERE id = v_rec.id;

      v_closed_count := v_closed_count + 1;
    END IF;
  END LOOP;

  IF v_closed_count > 0 THEN
    PERFORM extensions.pg_notify(
      'pos_global_sync',
      json_build_object(
        'event', 'pos:sync_needed',
        'source', 'reconcile_inactive_attendance_shifts',
        'closedCount', v_closed_count
      )::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'closedCount', v_closed_count,
    'thresholdHours', v_threshold_hours,
    'evaluatedAt', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_inactive_attendance_shifts() TO anon, authenticated, service_role;

-- 5. Integrate into 6:00 AM Daily Operating Mode Reconciler
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

  -- Automatically reconcile abandoned shifts from prior service
  PERFORM public.reconcile_inactive_attendance_shifts();

  SELECT *
  INTO v_settings
  FROM public.venue_settings
  LIMIT 1;

  RETURN to_jsonb(v_settings);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_operating_mode_6am() TO anon, authenticated, service_role;
