-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Decouple POS Login/Logout from Staff Attendance
-- Migration: 20261108000005_decouple_pos_login_from_attendance.sql
-- ==============================================================================

-- 1. Update authenticate_staff_credentials:
-- Strictly authenticates credentials and updates users.last_login_at.
-- COMPLETELY REMOVES auto-clock-in side effects on public.attendance_records.
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
  v_now TIMESTAMPTZ := now();
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

  -- Update last login audit timestamp only (NO attendance insertion/updating)
  UPDATE public.users SET last_login_at = v_now WHERE id = v_user.id;

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

-- 2. record_pos_staff_logout_punch:
-- Safe no-op for backward compatibility so older clients or callers never fail.
CREATE OR REPLACE FUNCTION public.record_pos_staff_logout_punch(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'exempt', true,
    'message', 'POS logout decoupled from attendance.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_pos_staff_logout_punch(UUID) TO anon, authenticated, service_role;

-- 3. Universal Timeclock Punch RPC:
-- Powers TimeclockKioskScreen (?mode=timeclock).
-- Supports smart toggle, resume / split-shifts, admin payroll exemption, and Manila 6:00 AM business day.
CREATE OR REPLACE FUNCTION public.punch_staff_timeclock(
  p_username TEXT,
  p_pin TEXT,
  p_action TEXT DEFAULT 'AUTO'
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
  v_existing_rec RECORD;
  v_now TIMESTAMPTZ := now();
  v_action_taken TEXT;
  v_clock_in TIMESTAMPTZ;
  v_clock_out TIMESTAMPTZ;
  v_session_hours NUMERIC(6, 2) := 0.00;
  v_total_hours NUMERIC(6, 2) := 0.00;
  v_base_pay NUMERIC(10, 2);
  v_addon_pay NUMERIC(10, 2) := 0.00;
  v_total_pay NUMERIC(10, 2);
  v_is_admin BOOLEAN := false;
BEGIN
  v_clean_username := lower(trim(COALESCE(p_username, '')));
  v_clean_pin := trim(COALESCE(p_pin, ''));

  IF v_clean_username = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff ID / Username is required.');
  END IF;

  IF v_clean_pin = '' THEN
    RETURN jsonb_build_object('success', false, 'error', '4-digit PIN is required.');
  END IF;

  -- Verify Staff Record (all active staff)
  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff,
         base_daily_rate, pin_hash
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid Staff ID or inactive account. Access denied.');
  END IF;

  IF v_user.pin_hash IS NOT NULL AND v_user.pin_hash <> '' THEN
    v_valid_pin := (v_user.pin_hash = extensions.crypt(v_clean_pin, v_user.pin_hash));
  END IF;

  IF NOT v_valid_pin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid 4-digit PIN. Access denied.');
  END IF;

  v_is_admin := (v_user.role = 'admin');

  -- Manila Business Date (6:00 AM cutoff)
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  IF v_is_admin THEN
    v_base_pay := 0.00;
    v_addon_pay := 0.00;
    v_total_pay := 0.00;
  ELSE
    v_base_pay := COALESCE(v_user.base_daily_rate, 645.00);
  END IF;

  SELECT *
  INTO v_existing_rec
  FROM public.attendance_records
  WHERE user_id = v_user.id
    AND date = v_business_date;

  IF NOT FOUND THEN
    -- First punch of the day: Clock In
    v_action_taken := 'CLOCKED_IN';
    v_clock_in := v_now;
    v_clock_out := NULL;
    v_total_hours := 0.00;
    IF NOT v_is_admin THEN
      v_addon_pay := 0.00;
      v_total_pay := v_base_pay;
    END IF;

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
      v_clock_in,
      v_clock_out,
      v_total_hours,
      'CLOCKED_IN',
      v_base_pay,
      v_addon_pay,
      v_total_pay,
      v_now,
      v_now
    );
  ELSE
    -- Record already exists today: determine Clock In vs Clock Out vs Resume
    IF p_action = 'CLOCK_IN' 
       OR (p_action = 'AUTO' AND v_existing_rec.shift_status IN ('ABSENT', 'COMPLETED', 'PAUSED')) THEN
      -- Clock In / Resume Shift
      v_action_taken := 'CLOCKED_IN';
      v_clock_in := v_now;
      v_clock_out := NULL;
      v_total_hours := COALESCE(v_existing_rec.hours_worked, 0.00);
      IF NOT v_is_admin THEN
        v_base_pay := COALESCE(v_existing_rec.base_daily_pay, v_base_pay);
        v_addon_pay := COALESCE(v_existing_rec.addon_pay, 0.00);
        v_total_pay := v_base_pay + v_addon_pay;
      END IF;

      UPDATE public.attendance_records
      SET is_present = true,
          shift_status = 'CLOCKED_IN',
          clock_in_at = v_clock_in,
          clock_out_at = NULL,
          base_daily_pay = v_base_pay,
          addon_pay = v_addon_pay,
          total_day_pay = v_total_pay,
          updated_at = v_now
      WHERE id = v_existing_rec.id;

    ELSE
      -- Clock Out (Ending active session)
      v_action_taken := 'CLOCKED_OUT';
      v_clock_in := COALESCE(v_existing_rec.clock_in_at, v_now);
      v_clock_out := v_now;
      v_session_hours := ROUND(GREATEST(0.00, (EXTRACT(EPOCH FROM (v_clock_out - v_clock_in)) / 3600.0))::NUMERIC, 2);
      v_total_hours := ROUND((COALESCE(v_existing_rec.hours_worked, 0.00) + v_session_hours)::NUMERIC, 2);

      IF NOT v_is_admin THEN
        v_base_pay := COALESCE(v_existing_rec.base_daily_pay, v_base_pay);
        v_addon_pay := COALESCE(v_existing_rec.addon_pay, 0.00);
        v_total_pay := v_base_pay + v_addon_pay;
      END IF;

      UPDATE public.attendance_records
      SET is_present = true,
          shift_status = 'COMPLETED',
          clock_in_at = v_clock_in,
          clock_out_at = v_clock_out,
          hours_worked = v_total_hours,
          base_daily_pay = v_base_pay,
          addon_pay = v_addon_pay,
          total_day_pay = v_total_pay,
          updated_at = v_now
      WHERE id = v_existing_rec.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'actionTaken', v_action_taken,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'displayName', v_user.display_name,
      'role', v_user.role,
      'jobTitle', v_user.job_title,
      'isWorkflowStaff', v_user.is_workflow_staff
    ),
    'date', v_business_date::TEXT,
    'clockInAt', v_clock_in,
    'clockOutAt', v_clock_out,
    'hoursWorked', v_total_hours,
    'baseDailyPay', v_base_pay,
    'addonPay', v_addon_pay,
    'totalDayPay', v_total_pay,
    'isAdmin', v_is_admin
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.punch_staff_timeclock(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 4. Admin Upsert Attendance Record:
-- Fix state transitions, pay handling, hours calculation, and admin exemptions
CREATE OR REPLACE FUNCTION public.admin_upsert_attendance_record(
  p_user_id UUID,
  p_date DATE,
  p_is_present BOOLEAN,
  p_shift_status TEXT,
  p_base_daily_pay NUMERIC(10, 2),
  p_addon_pay NUMERIC(10, 2),
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_role public.role;
  v_is_admin BOOLEAN := false;
  v_total NUMERIC(10, 2);
  v_now TIMESTAMPTZ := now();
  v_rec RECORD;
  v_existing RECORD;
BEGIN
  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = p_user_id;

  v_is_admin := (v_user_role = 'admin');

  IF v_is_admin THEN
    v_total := 0.00;
  ELSIF p_is_present THEN
    v_total := COALESCE(p_base_daily_pay, 645.00) + COALESCE(p_addon_pay, 0.00);
  ELSE
    v_total := 0.00;
  END IF;

  SELECT * INTO v_existing
  FROM public.attendance_records
  WHERE user_id = p_user_id AND date = p_date;

  IF NOT FOUND THEN
    INSERT INTO public.attendance_records (
      user_id,
      date,
      is_present,
      shift_status,
      base_daily_pay,
      addon_pay,
      total_day_pay,
      notes,
      clock_in_at,
      clock_out_at,
      hours_worked,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      p_date,
      p_is_present,
      p_shift_status,
      CASE WHEN v_is_admin THEN 0.00 WHEN p_is_present THEN COALESCE(p_base_daily_pay, 645.00) ELSE 0.00 END,
      CASE WHEN v_is_admin THEN 0.00 WHEN p_is_present THEN COALESCE(p_addon_pay, 0.00) ELSE 0.00 END,
      v_total,
      p_notes,
      CASE WHEN p_is_present THEN v_now ELSE NULL END,
      CASE WHEN p_shift_status = 'COMPLETED' THEN v_now ELSE NULL END,
      CASE WHEN p_shift_status = 'COMPLETED' THEN 8.00 ELSE 0.00 END,
      v_now,
      v_now
    )
    RETURNING * INTO v_rec;
  ELSE
    UPDATE public.attendance_records
    SET
      is_present = p_is_present,
      shift_status = p_shift_status,
      base_daily_pay = CASE WHEN v_is_admin THEN 0.00 WHEN p_is_present THEN COALESCE(p_base_daily_pay, 645.00) ELSE 0.00 END,
      addon_pay = CASE WHEN v_is_admin THEN 0.00 WHEN p_is_present THEN COALESCE(p_addon_pay, 0.00) ELSE 0.00 END,
      total_day_pay = v_total,
      notes = COALESCE(p_notes, attendance_records.notes),
      clock_in_at = CASE
        WHEN NOT p_is_present THEN NULL
        WHEN p_shift_status = 'CLOCKED_IN' AND attendance_records.shift_status = 'COMPLETED' THEN v_now
        WHEN attendance_records.clock_in_at IS NULL THEN v_now
        ELSE attendance_records.clock_in_at
      END,
      clock_out_at = CASE
        WHEN NOT p_is_present THEN NULL
        WHEN p_shift_status = 'CLOCKED_IN' THEN NULL
        WHEN p_shift_status = 'COMPLETED' AND attendance_records.clock_out_at IS NULL THEN v_now
        ELSE attendance_records.clock_out_at
      END,
      hours_worked = CASE
        WHEN NOT p_is_present THEN 0.00
        WHEN p_shift_status = 'COMPLETED' AND attendance_records.clock_in_at IS NOT NULL AND attendance_records.shift_status = 'CLOCKED_IN' THEN
          ROUND((COALESCE(attendance_records.hours_worked, 0.00) + GREATEST(0.00, (EXTRACT(EPOCH FROM (v_now - attendance_records.clock_in_at)) / 3600.0)))::NUMERIC, 2)
        WHEN p_shift_status = 'COMPLETED' AND attendance_records.hours_worked = 0.00 THEN 8.00
        ELSE attendance_records.hours_worked
      END,
      updated_at = v_now
    WHERE id = v_existing.id
    RETURNING * INTO v_rec;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'record', jsonb_build_object(
      'id', v_rec.id,
      'userId', v_rec.user_id,
      'date', v_rec.date::TEXT,
      'isPresent', v_rec.is_present,
      'shiftStatus', v_rec.shift_status,
      'baseDailyPay', v_rec.base_daily_pay,
      'addonPay', v_rec.addon_pay,
      'totalDayPay', v_rec.total_day_pay,
      'notes', v_rec.notes,
      'clockInAt', v_rec.clock_in_at,
      'clockOutAt', v_rec.clock_out_at,
      'hoursWorked', v_rec.hours_worked
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_attendance_record(UUID, DATE, BOOLEAN, TEXT, NUMERIC, NUMERIC, TEXT) TO anon, authenticated, service_role;

-- 5. Data Normalization: normalize any historical PAUSED shifts
UPDATE public.attendance_records
SET shift_status = 'COMPLETED'
WHERE shift_status = 'PAUSED';

