-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Automatic Clock-In / Clock-Out on Login / Logout
-- Migration: 20261106000001_auto_timeclock_on_login_logout.sql
-- ==============================================================================

-- 1. Extend chk_attendance_shift_status to support PAUSED shift status for user logout / breaks
DO $$
BEGIN
  -- Drop old constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_attendance_shift_status'
  ) THEN
    ALTER TABLE public.attendance_records DROP CONSTRAINT chk_attendance_shift_status;
  END IF;

  -- Add updated constraint including 'PAUSED'
  ALTER TABLE public.attendance_records
    ADD CONSTRAINT chk_attendance_shift_status
    CHECK (shift_status IN ('CLOCKED_IN', 'PAUSED', 'COMPLETED', 'ABSENT'));
END $$;

-- 2. Create record_pos_staff_logout_punch RPC
-- Seamlessly called when POS staff log out.
-- Pauses their active shift, accumulates elapsed session hours into hours_worked,
-- updates clock_out_at = now(), and sets shift_status = 'PAUSED'.
CREATE OR REPLACE FUNCTION public.record_pos_staff_logout_punch(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_now TIMESTAMPTZ := now();
  v_business_date DATE;
  v_rec RECORD;
  v_session_hours NUMERIC(6, 2) := 0.00;
  v_new_total_hours NUMERIC(6, 2) := 0.00;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User ID is required.');
  END IF;

  SELECT id, username, display_name, role, is_active, is_workflow_staff
  INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  -- Admin accounts are exempt from auto-clock-out
  IF v_user.role = 'admin' THEN
    RETURN jsonb_build_object(
      'success', true,
      'exempt', true,
      'message', 'Admin user session ended without attendance clock punch.'
    );
  END IF;

  -- Manila business date (6:00 AM day boundary)
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  SELECT *
  INTO v_rec
  FROM public.attendance_records
  WHERE user_id = p_user_id
    AND date = v_business_date;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No active attendance record found for today.'
    );
  END IF;

  -- Only calculate additional session hours if currently in CLOCKED_IN state
  IF v_rec.shift_status = 'CLOCKED_IN' AND v_rec.clock_in_at IS NOT NULL THEN
    v_session_hours := ROUND(
      GREATEST(0.00, (EXTRACT(EPOCH FROM (v_now - v_rec.clock_in_at)) / 3600.0))::NUMERIC,
      2
    );
    v_new_total_hours := ROUND((COALESCE(v_rec.hours_worked, 0.00) + v_session_hours)::NUMERIC, 2);

    UPDATE public.attendance_records
    SET
      clock_out_at = v_now,
      hours_worked = v_new_total_hours,
      shift_status = 'PAUSED',
      updated_at = v_now
    WHERE id = v_rec.id;

    RETURN jsonb_build_object(
      'success', true,
      'actionTaken', 'PAUSED',
      'sessionHours', v_session_hours,
      'totalHours', v_new_total_hours,
      'displayName', v_user.display_name
    );
  ELSE
    -- Already paused or completed
    RETURN jsonb_build_object(
      'success', true,
      'actionTaken', v_rec.shift_status,
      'sessionHours', 0.00,
      'totalHours', COALESCE(v_rec.hours_worked, 0.00),
      'displayName', v_user.display_name
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_pos_staff_logout_punch(UUID) TO anon, authenticated, service_role;

-- 3. Update authenticate_staff_credentials to continue shift when re-logging in
-- If an attendance record for today exists:
-- - Sets shift_status = 'CLOCKED_IN'
-- - Sets clock_in_at = now() (starts a new session while retaining accumulated hours_worked)
-- - clock_out_at is cleared for active session
-- If no attendance record exists, creates first session with hours_worked = 0.00.
CREATE OR REPLACE FUNCTION public.authenticate_staff_credentials(
  p_username TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_clean_username TEXT;
  v_clean_pin TEXT;
  v_valid_pin BOOLEAN := false;
  v_business_date DATE;
  v_now TIMESTAMPTZ := now();
  v_existing_rec RECORD;
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

  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff,
         email, phone, avatar_url, base_daily_rate, pin_hash, last_login_at
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND is_active = true
    AND is_workflow_staff = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Staff ID or PIN. Access denied.'
    );
  END IF;

  -- Block Admin accounts from using Staff PIN clock-in
  IF v_user.role = 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Admin accounts must sign in with their password via the Admin Portal tab.',
      'isAdmin', true
    );
  END IF;

  -- Verify cryptographic bcrypt PIN hash
  IF v_user.pin_hash IS NOT NULL AND v_user.pin_hash <> '' THEN
    v_valid_pin := (v_user.pin_hash = extensions.crypt(v_clean_pin, v_user.pin_hash));
  END IF;

  IF NOT v_valid_pin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Staff ID or PIN. Access denied.'
    );
  END IF;

  -- Update last login audit timestamp
  UPDATE public.users SET last_login_at = v_now WHERE id = v_user.id;

  -- Business operating date (6:00 AM Manila Time)
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  SELECT *
  INTO v_existing_rec
  FROM public.attendance_records
  WHERE user_id = v_user.id
    AND date = v_business_date;

  IF NOT FOUND THEN
    -- First clock-in of the day
    INSERT INTO public.attendance_records (
      user_id,
      date,
      is_present,
      clock_in_at,
      clock_out_at,
      hours_worked,
      shift_status,
      base_daily_pay,
      addon_pay,
      total_day_pay,
      created_at,
      updated_at
    ) VALUES (
      v_user.id,
      v_business_date,
      true,
      v_now,
      NULL,
      0.00,
      'CLOCKED_IN',
      COALESCE(v_user.base_daily_rate, 645.00),
      0.00,
      COALESCE(v_user.base_daily_rate, 645.00),
      v_now,
      v_now
    );
  ELSE
    -- Continuation of work day: resume session, keep accumulated hours_worked
    UPDATE public.attendance_records
    SET
      is_present = true,
      clock_in_at = v_now,
      clock_out_at = NULL,
      shift_status = 'CLOCKED_IN',
      updated_at = v_now
    WHERE id = v_existing_rec.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'displayName', v_user.display_name,
      'role', v_user.role,
      'jobTitle', v_user.job_title,
      'isWorkflowStaff', v_user.is_workflow_staff,
      'email', v_user.email,
      'phone', v_user.phone,
      'avatarUrl', v_user.avatar_url,
      'baseDailyRate', v_user.base_daily_rate,
      'lastLoginAt', v_now
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_staff_credentials(TEXT, TEXT) TO anon, authenticated, service_role;
