-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Production Attendance, Timeclock & Overtime Engine
-- Migration: 20261125000001_production_attendance_and_overtime.sql
-- ==============================================================================

-- 1. Venue Settings: Configurable Overtime Policy
ALTER TABLE public.venue_settings
  ADD COLUMN IF NOT EXISTS standard_shift_hours NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS overtime_grace_minutes INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS overtime_rate_mode TEXT NOT NULL DEFAULT 'MULTIPLIER',
  ADD COLUMN IF NOT EXISTS overtime_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.25,
  ADD COLUMN IF NOT EXISTS overtime_flat_hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 100.00;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_venue_overtime_rate_mode'
  ) THEN
    ALTER TABLE public.venue_settings
      ADD CONSTRAINT chk_venue_overtime_rate_mode
      CHECK (overtime_rate_mode IN ('MULTIPLIER', 'FLAT_HOURLY'));
  END IF;
END $$;

-- 2. Users: Optional Per-Staff Overtime Hourly Rate Override
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate_override NUMERIC(10, 2) NULL;

-- 3. Attendance Records: First Clock-In, OT Breakdown, Review Flags & Audit Trail
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS first_clock_in_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS regular_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS overtime_rate_applied NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS overtime_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS edited_by_user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS edit_reason TEXT NULL;

UPDATE public.attendance_records
SET first_clock_in_at = COALESCE(first_clock_in_at, clock_in_at)
WHERE first_clock_in_at IS NULL AND clock_in_at IS NOT NULL;

-- 4. Append-Only Attendance Punches Audit Table
CREATE TABLE IF NOT EXISTS public.attendance_punches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_record_id UUID NOT NULL REFERENCES public.attendance_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  punch_type TEXT NOT NULL CHECK (punch_type IN ('CLOCK_IN', 'CLOCK_OUT', 'ADMIN_EDIT')),
  punched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'TIMECLOCK_KIOSK' CHECK (source IN ('TIMECLOCK_KIOSK', 'ADMIN_OVERRIDE')),
  actor_user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_punches_record_time
  ON public.attendance_punches(attendance_record_id, punched_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_punches_user_date
  ON public.attendance_punches(user_id, business_date DESC);

-- 5. Deterministic Overtime Calculator Helper
CREATE OR REPLACE FUNCTION public.compute_shift_overtime(
  p_hours_worked NUMERIC,
  p_base_daily_pay NUMERIC,
  p_is_admin BOOLEAN,
  p_user_ot_override NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  regular_hours NUMERIC(6, 2),
  overtime_hours NUMERIC(6, 2),
  overtime_rate_applied NUMERIC(10, 2),
  overtime_pay NUMERIC(10, 2)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_std_hours NUMERIC(4, 2) := 8.00;
  v_grace_mins INT := 15;
  v_mode TEXT := 'MULTIPLIER';
  v_mult NUMERIC(4, 2) := 1.25;
  v_flat NUMERIC(10, 2) := 100.00;
  v_total_hrs NUMERIC(6, 2);
  v_excess_mins NUMERIC;
  v_ot_hrs NUMERIC(6, 2) := 0.00;
  v_reg_hrs NUMERIC(6, 2) := 0.00;
  v_rate NUMERIC(10, 2) := 0.00;
  v_ot_pay NUMERIC(10, 2) := 0.00;
BEGIN
  v_total_hrs := GREATEST(0.00, ROUND(COALESCE(p_hours_worked, 0.00)::NUMERIC, 2));

  IF p_is_admin THEN
    RETURN QUERY SELECT v_total_hrs, 0.00::NUMERIC(6,2), 0.00::NUMERIC(10,2), 0.00::NUMERIC(10,2);
    RETURN;
  END IF;

  SELECT
    COALESCE(standard_shift_hours, 8.00),
    COALESCE(overtime_grace_minutes, 15),
    COALESCE(overtime_rate_mode, 'MULTIPLIER'),
    COALESCE(overtime_multiplier, 1.25),
    COALESCE(overtime_flat_hourly_rate, 100.00)
  INTO v_std_hours, v_grace_mins, v_mode, v_mult, v_flat
  FROM public.venue_settings
  LIMIT 1;

  IF p_user_ot_override IS NOT NULL AND p_user_ot_override >= 0 THEN
    v_rate := ROUND(p_user_ot_override::NUMERIC, 2);
  ELSIF v_mode = 'FLAT_HOURLY' THEN
    v_rate := ROUND(v_flat::NUMERIC, 2);
  ELSE
    v_rate := ROUND(((COALESCE(p_base_daily_pay, 645.00) / GREATEST(v_std_hours, 1.00)) * v_mult)::NUMERIC, 2);
  END IF;

  v_excess_mins := (v_total_hrs - v_std_hours) * 60.0;
  IF v_excess_mins > v_grace_mins THEN
    v_ot_hrs := ROUND((v_total_hrs - v_std_hours)::NUMERIC, 2);
    v_reg_hrs := v_std_hours;
    v_ot_pay := ROUND((v_ot_hrs * v_rate)::NUMERIC, 2);
  ELSE
    v_ot_hrs := 0.00;
    v_reg_hrs := v_total_hrs;
    v_ot_pay := 0.00;
  END IF;

  RETURN QUERY SELECT v_reg_hrs, v_ot_hrs, v_rate, v_ot_pay;
END;
$$;

-- 6. Read-only Timeclock Verification RPC (2-Step Kiosk Flow)
CREATE OR REPLACE FUNCTION public.verify_timeclock_staff_status(
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
  v_business_date DATE;
  v_rec RECORD;
  v_unclosed_rec RECORD;
  v_live_hours NUMERIC(6, 2) := 0.00;
  v_recommended TEXT := 'CLOCK_IN';
BEGIN
  v_clean_username := lower(trim(COALESCE(p_username, '')));
  v_clean_pin := trim(COALESCE(p_pin, ''));

  IF v_clean_username = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff ID / Username is required.');
  END IF;
  IF v_clean_pin = '' OR length(v_clean_pin) <> 4 THEN
    RETURN jsonb_build_object('success', false, 'error', '4-digit PIN is required.');
  END IF;

  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff,
         base_daily_rate, overtime_hourly_rate_override, pin_hash
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid Staff ID or inactive account.');
  END IF;

  IF v_user.pin_hash IS NOT NULL AND v_user.pin_hash <> '' THEN
    v_valid_pin := (v_user.pin_hash = extensions.crypt(v_clean_pin, v_user.pin_hash));
  END IF;

  IF NOT v_valid_pin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid 4-digit PIN.');
  END IF;

  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  SELECT * INTO v_rec
  FROM public.attendance_records
  WHERE user_id = v_user.id AND date = v_business_date;

  SELECT id, date, clock_in_at INTO v_unclosed_rec
  FROM public.attendance_records
  WHERE user_id = v_user.id
    AND date < v_business_date
    AND shift_status = 'CLOCKED_IN'
  ORDER BY date DESC
  LIMIT 1;

  IF FOUND AND v_rec.id IS NOT NULL THEN
    -- Ignore
  END IF;

  IF v_rec.id IS NOT NULL AND v_rec.shift_status = 'CLOCKED_IN' THEN
    v_recommended := 'CLOCK_OUT';
    v_live_hours := ROUND((
      COALESCE(v_rec.hours_worked, 0.00) +
      GREATEST(0.00, EXTRACT(EPOCH FROM (v_now - COALESCE(v_rec.clock_in_at, v_now))) / 3600.0)
    )::NUMERIC, 2);
  ELSIF v_rec.id IS NOT NULL THEN
    v_recommended := 'CLOCK_IN';
    v_live_hours := COALESCE(v_rec.hours_worked, 0.00);
  ELSE
    v_recommended := 'CLOCK_IN';
    v_live_hours := 0.00;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'businessDate', v_business_date::TEXT,
    'recommendedAction', v_recommended,
    'user', jsonb_build_object(
      'id', v_user.id,
      'username', v_user.username,
      'displayName', v_user.display_name,
      'role', v_user.role,
      'jobTitle', v_user.job_title,
      'isWorkflowStaff', v_user.is_workflow_staff
    ),
    'currentShift', CASE WHEN v_rec.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_rec.id,
      'shiftStatus', v_rec.shift_status,
      'firstClockInAt', COALESCE(v_rec.first_clock_in_at, v_rec.clock_in_at),
      'clockInAt', v_rec.clock_in_at,
      'clockOutAt', v_rec.clock_out_at,
      'hoursWorked', v_live_hours
    ) END,
    'unclosedPriorShift', CASE WHEN v_unclosed_rec.id IS NULL THEN NULL ELSE jsonb_build_object(
      'date', v_unclosed_rec.date::TEXT,
      'clockInAt', v_unclosed_rec.clock_in_at
    ) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_timeclock_staff_status(TEXT, TEXT) TO anon, authenticated, service_role;

-- 7. Hardened Universal Timeclock Punch RPC
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
  v_rec_id UUID;
  v_now TIMESTAMPTZ := now();
  v_action_taken TEXT;
  v_first_clock_in TIMESTAMPTZ;
  v_clock_in TIMESTAMPTZ;
  v_clock_out TIMESTAMPTZ;
  v_session_hours NUMERIC(6, 2) := 0.00;
  v_total_hours NUMERIC(6, 2) := 0.00;
  v_base_pay NUMERIC(10, 2);
  v_addon_pay NUMERIC(10, 2) := 0.00;
  v_reg_hours NUMERIC(6, 2) := 0.00;
  v_ot_hours NUMERIC(6, 2) := 0.00;
  v_ot_rate NUMERIC(10, 2) := 0.00;
  v_ot_pay NUMERIC(10, 2) := 0.00;
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

  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff,
         base_daily_rate, overtime_hourly_rate_override, pin_hash
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid Staff ID or inactive account.');
  END IF;

  IF v_user.pin_hash IS NOT NULL AND v_user.pin_hash <> '' THEN
    v_valid_pin := (v_user.pin_hash = extensions.crypt(v_clean_pin, v_user.pin_hash));
  END IF;

  IF NOT v_valid_pin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid 4-digit PIN.');
  END IF;

  v_is_admin := (v_user.role = 'admin');
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  IF v_is_admin THEN
    v_base_pay := 0.00;
    v_addon_pay := 0.00;
    v_total_pay := 0.00;
  ELSE
    v_base_pay := COALESCE(v_user.base_daily_rate, 645.00);
  END IF;

  SELECT * INTO v_existing_rec
  FROM public.attendance_records
  WHERE user_id = v_user.id AND date = v_business_date;

  IF NOT FOUND THEN
    IF p_action = 'CLOCK_OUT' THEN
      RETURN jsonb_build_object('success', false, 'error', 'You are not clocked in yet for today.');
    END IF;

    v_action_taken := 'CLOCKED_IN';
    v_first_clock_in := v_now;
    v_clock_in := v_now;
    v_clock_out := NULL;
    v_total_hours := 0.00;
    v_total_pay := CASE WHEN v_is_admin THEN 0.00 ELSE v_base_pay END;

    INSERT INTO public.attendance_records (
      user_id, date, is_present, first_clock_in_at, clock_in_at, clock_out_at,
      hours_worked, regular_hours, overtime_hours, overtime_rate_applied, overtime_pay,
      shift_status, base_daily_pay, addon_pay, total_day_pay, created_at, updated_at
    ) VALUES (
      v_user.id, v_business_date, true, v_first_clock_in, v_clock_in, v_clock_out,
      0.00, 0.00, 0.00, 0.00, 0.00,
      'CLOCKED_IN', v_base_pay, 0.00, v_total_pay, v_now, v_now
    ) RETURNING id INTO v_rec_id;

    INSERT INTO public.attendance_punches (
      attendance_record_id, user_id, business_date, punch_type, punched_at, source, actor_user_id
    ) VALUES (
      v_rec_id, v_user.id, v_business_date, 'CLOCK_IN', v_now, 'TIMECLOCK_KIOSK', v_user.id
    );
  ELSE
    v_rec_id := v_existing_rec.id;

    IF p_action = 'CLOCK_IN' AND v_existing_rec.shift_status = 'CLOCKED_IN' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Already clocked in for this shift.');
    END IF;

    IF p_action = 'CLOCK_OUT' AND v_existing_rec.shift_status <> 'CLOCKED_IN' THEN
      RETURN jsonb_build_object('success', false, 'error', 'No active clocked-in session to clock out.');
    END IF;

    IF p_action = 'CLOCK_IN'
       OR (p_action = 'AUTO' AND v_existing_rec.shift_status IN ('ABSENT', 'COMPLETED', 'PAUSED')) THEN
      -- Clock In / Resume Split Shift (preserve first_clock_in_at)
      v_action_taken := 'CLOCKED_IN';
      v_first_clock_in := COALESCE(v_existing_rec.first_clock_in_at, v_existing_rec.clock_in_at, v_now);
      v_clock_in := v_now;
      v_clock_out := NULL;
      v_total_hours := COALESCE(v_existing_rec.hours_worked, 0.00);
      v_ot_hours := COALESCE(v_existing_rec.overtime_hours, 0.00);
      v_ot_pay := COALESCE(v_existing_rec.overtime_pay, 0.00);
      v_ot_rate := COALESCE(v_existing_rec.overtime_rate_applied, 0.00);

      IF NOT v_is_admin THEN
        v_base_pay := COALESCE(v_existing_rec.base_daily_pay, v_base_pay);
        v_addon_pay := COALESCE(v_existing_rec.addon_pay, 0.00);
        v_total_pay := v_base_pay + v_ot_pay + v_addon_pay;
      END IF;

      UPDATE public.attendance_records
      SET is_present = true,
          shift_status = 'CLOCKED_IN',
          first_clock_in_at = v_first_clock_in,
          clock_in_at = v_clock_in,
          clock_out_at = NULL,
          needs_review = false,
          review_reason = NULL,
          base_daily_pay = v_base_pay,
          addon_pay = v_addon_pay,
          total_day_pay = v_total_pay,
          updated_at = v_now
      WHERE id = v_rec_id;

      INSERT INTO public.attendance_punches (
        attendance_record_id, user_id, business_date, punch_type, punched_at, source, actor_user_id
      ) VALUES (
        v_rec_id, v_user.id, v_business_date, 'CLOCK_IN', v_now, 'TIMECLOCK_KIOSK', v_user.id
      );
    ELSE
      -- Clock Out
      v_action_taken := 'CLOCKED_OUT';
      v_first_clock_in := COALESCE(v_existing_rec.first_clock_in_at, v_existing_rec.clock_in_at, v_now);
      v_clock_in := COALESCE(v_existing_rec.clock_in_at, v_now);
      v_clock_out := v_now;
      v_session_hours := ROUND(GREATEST(0.00, (EXTRACT(EPOCH FROM (v_clock_out - v_clock_in)) / 3600.0))::NUMERIC, 2);
      v_total_hours := ROUND((COALESCE(v_existing_rec.hours_worked, 0.00) + v_session_hours)::NUMERIC, 2);

      IF NOT v_is_admin THEN
        v_base_pay := COALESCE(v_existing_rec.base_daily_pay, v_base_pay);
        v_addon_pay := COALESCE(v_existing_rec.addon_pay, 0.00);
      END IF;

      SELECT ot.regular_hours, ot.overtime_hours, ot.overtime_rate_applied, ot.overtime_pay
      INTO v_reg_hours, v_ot_hours, v_ot_rate, v_ot_pay
      FROM public.compute_shift_overtime(
        v_total_hours, v_base_pay, v_is_admin, v_user.overtime_hourly_rate_override
      ) ot;

      IF v_existing_rec.overtime_override THEN
        v_ot_pay := COALESCE(v_existing_rec.overtime_pay, v_ot_pay);
      END IF;

      v_total_pay := CASE WHEN v_is_admin THEN 0.00 ELSE (v_base_pay + v_ot_pay + v_addon_pay) END;

      UPDATE public.attendance_records
      SET is_present = true,
          shift_status = 'COMPLETED',
          first_clock_in_at = v_first_clock_in,
          clock_in_at = v_clock_in,
          clock_out_at = v_clock_out,
          hours_worked = v_total_hours,
          regular_hours = v_reg_hours,
          overtime_hours = v_ot_hours,
          overtime_rate_applied = v_ot_rate,
          overtime_pay = v_ot_pay,
          needs_review = false,
          review_reason = NULL,
          base_daily_pay = v_base_pay,
          addon_pay = v_addon_pay,
          total_day_pay = v_total_pay,
          updated_at = v_now
      WHERE id = v_rec_id;

      INSERT INTO public.attendance_punches (
        attendance_record_id, user_id, business_date, punch_type, punched_at, source, actor_user_id
      ) VALUES (
        v_rec_id, v_user.id, v_business_date, 'CLOCK_OUT', v_now, 'TIMECLOCK_KIOSK', v_user.id
      );
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
    'firstClockInAt', v_first_clock_in,
    'clockInAt', v_clock_in,
    'clockOutAt', v_clock_out,
    'hoursWorked', v_total_hours,
    'regularHours', v_reg_hours,
    'overtimeHours', v_ot_hours,
    'overtimeRateApplied', v_ot_rate,
    'overtimePay', v_ot_pay,
    'baseDailyPay', v_base_pay,
    'addonPay', v_addon_pay,
    'totalDayPay', v_total_pay,
    'isAdmin', v_is_admin
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.punch_staff_timeclock(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 8. Flag Unclosed Shifts Past 6:00 AM Manila Cutoff (No 0.00h Auto-Close Bug)
CREATE OR REPLACE FUNCTION public.reconcile_inactive_attendance_shifts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_business_date DATE;
  v_flagged_count INT := 0;
BEGIN
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  UPDATE public.attendance_records
  SET
    needs_review = true,
    review_reason = COALESCE(review_reason, 'MISSED_CLOCK_OUT'),
    updated_at = v_now
  WHERE shift_status = 'CLOCKED_IN'
    AND date < v_business_date
    AND needs_review = false;

  GET DIAGNOSTICS v_flagged_count = ROW_COUNT;

  IF v_flagged_count > 0 THEN
    PERFORM pg_catalog.pg_notify(
      'pos_global_sync'::text,
      json_build_object(
        'event', 'pos:sync_needed',
        'source', 'reconcile_inactive_attendance_shifts',
        'flaggedCount', v_flagged_count
      )::text
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'flaggedCount', v_flagged_count,
    'evaluatedAt', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_inactive_attendance_shifts() TO anon, authenticated, service_role;

-- 9. Admin Upsert Attendance Record (Full Clock-In/Out Edit, OT Recalc & Audit)
CREATE OR REPLACE FUNCTION public.admin_upsert_attendance_record(
  p_user_id UUID,
  p_date DATE,
  p_is_present BOOLEAN,
  p_shift_status TEXT,
  p_base_daily_pay NUMERIC(10, 2),
  p_addon_pay NUMERIC(10, 2),
  p_notes TEXT DEFAULT NULL,
  p_clock_in_at TIMESTAMPTZ DEFAULT NULL,
  p_clock_out_at TIMESTAMPTZ DEFAULT NULL,
  p_hours_worked NUMERIC(6, 2) DEFAULT NULL,
  p_overtime_pay NUMERIC(10, 2) DEFAULT NULL,
  p_overtime_override BOOLEAN DEFAULT false,
  p_clear_review BOOLEAN DEFAULT true,
  p_edited_by UUID DEFAULT NULL,
  p_edit_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user RECORD;
  v_is_admin BOOLEAN := false;
  v_now TIMESTAMPTZ := now();
  v_existing RECORD;
  v_rec RECORD;
  v_eff_clock_in TIMESTAMPTZ;
  v_eff_clock_out TIMESTAMPTZ;
  v_eff_hours NUMERIC(6, 2) := 0.00;
  v_reg_hours NUMERIC(6, 2) := 0.00;
  v_ot_hours NUMERIC(6, 2) := 0.00;
  v_ot_rate NUMERIC(10, 2) := 0.00;
  v_ot_pay NUMERIC(10, 2) := 0.00;
  v_eff_base NUMERIC(10, 2) := 0.00;
  v_eff_addon NUMERIC(10, 2) := 0.00;
  v_total NUMERIC(10, 2) := 0.00;
BEGIN
  SELECT id, role, overtime_hourly_rate_override
  INTO v_user
  FROM public.users
  WHERE id = p_user_id;

  v_is_admin := (v_user.role = 'admin');

  IF p_clock_in_at IS NOT NULL AND p_clock_out_at IS NOT NULL AND p_clock_out_at < p_clock_in_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Clock-out time cannot be earlier than clock-in time.');
  END IF;

  SELECT * INTO v_existing
  FROM public.attendance_records
  WHERE user_id = p_user_id AND date = p_date;

  IF NOT p_is_present THEN
    v_eff_clock_in := NULL;
    v_eff_clock_out := NULL;
    v_eff_hours := 0.00;
    v_reg_hours := 0.00;
    v_ot_hours := 0.00;
    v_ot_rate := 0.00;
    v_ot_pay := 0.00;
    v_eff_base := 0.00;
    v_eff_addon := 0.00;
    v_total := 0.00;
  ELSE
    v_eff_clock_in := COALESCE(p_clock_in_at, v_existing.clock_in_at, v_now);
    IF p_shift_status = 'COMPLETED' THEN
      v_eff_clock_out := COALESCE(p_clock_out_at, v_existing.clock_out_at, v_now);
      IF v_eff_clock_out < v_eff_clock_in THEN
        v_eff_clock_out := v_eff_clock_in;
      END IF;
    ELSE
      v_eff_clock_out := NULL;
    END IF;

    IF p_hours_worked IS NOT NULL THEN
      v_eff_hours := GREATEST(0.00, ROUND(p_hours_worked::NUMERIC, 2));
    ELSIF p_shift_status = 'COMPLETED' AND v_eff_clock_in IS NOT NULL AND v_eff_clock_out IS NOT NULL THEN
      v_eff_hours := ROUND(GREATEST(0.00, EXTRACT(EPOCH FROM (v_eff_clock_out - v_eff_clock_in)) / 3600.0)::NUMERIC, 2);
    ELSE
      v_eff_hours := COALESCE(v_existing.hours_worked, 0.00);
    END IF;

    v_eff_base := CASE WHEN v_is_admin THEN 0.00 ELSE COALESCE(p_base_daily_pay, 645.00) END;
    v_eff_addon := CASE WHEN v_is_admin THEN 0.00 ELSE COALESCE(p_addon_pay, 0.00) END;

    SELECT ot.regular_hours, ot.overtime_hours, ot.overtime_rate_applied, ot.overtime_pay
    INTO v_reg_hours, v_ot_hours, v_ot_rate, v_ot_pay
    FROM public.compute_shift_overtime(
      v_eff_hours, v_eff_base, v_is_admin, v_user.overtime_hourly_rate_override
    ) ot;

    IF p_overtime_override AND NOT v_is_admin THEN
      v_ot_pay := COALESCE(p_overtime_pay, 0.00);
    END IF;

    v_total := CASE WHEN v_is_admin THEN 0.00 ELSE (v_eff_base + v_ot_pay + v_eff_addon) END;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.attendance_records (
      user_id, date, is_present, shift_status,
      first_clock_in_at, clock_in_at, clock_out_at,
      hours_worked, regular_hours, overtime_hours, overtime_rate_applied, overtime_pay, overtime_override,
      base_daily_pay, addon_pay, total_day_pay,
      notes, needs_review, review_reason, edited_by_user_id, edited_at, edit_reason,
      created_at, updated_at
    ) VALUES (
      p_user_id, p_date, p_is_present, p_shift_status,
      v_eff_clock_in, v_eff_clock_in, v_eff_clock_out,
      v_eff_hours, v_reg_hours, v_ot_hours, v_ot_rate, v_ot_pay, p_overtime_override,
      v_eff_base, v_eff_addon, v_total,
      p_notes, false, NULL, p_edited_by, v_now, p_edit_reason,
      v_now, v_now
    ) RETURNING * INTO v_rec;
  ELSE
    UPDATE public.attendance_records
    SET
      is_present = p_is_present,
      shift_status = p_shift_status,
      first_clock_in_at = CASE WHEN NOT p_is_present THEN NULL ELSE COALESCE(attendance_records.first_clock_in_at, v_eff_clock_in) END,
      clock_in_at = v_eff_clock_in,
      clock_out_at = v_eff_clock_out,
      hours_worked = v_eff_hours,
      regular_hours = v_reg_hours,
      overtime_hours = v_ot_hours,
      overtime_rate_applied = v_ot_rate,
      overtime_pay = v_ot_pay,
      overtime_override = p_overtime_override,
      base_daily_pay = v_eff_base,
      addon_pay = v_eff_addon,
      total_day_pay = v_total,
      notes = COALESCE(p_notes, attendance_records.notes),
      needs_review = CASE WHEN p_clear_review THEN false ELSE attendance_records.needs_review END,
      review_reason = CASE WHEN p_clear_review THEN NULL ELSE attendance_records.review_reason END,
      edited_by_user_id = COALESCE(p_edited_by, attendance_records.edited_by_user_id),
      edited_at = v_now,
      edit_reason = COALESCE(p_edit_reason, attendance_records.edit_reason),
      updated_at = v_now
    WHERE id = v_existing.id
    RETURNING * INTO v_rec;
  END IF;

  INSERT INTO public.attendance_punches (
    attendance_record_id, user_id, business_date, punch_type, punched_at, source, actor_user_id, notes
  ) VALUES (
    v_rec.id, p_user_id, p_date, 'ADMIN_EDIT', v_now, 'ADMIN_OVERRIDE', p_edited_by,
    COALESCE(p_edit_reason, p_notes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'record', jsonb_build_object(
      'id', v_rec.id,
      'userId', v_rec.user_id,
      'date', v_rec.date::TEXT,
      'isPresent', v_rec.is_present,
      'shiftStatus', v_rec.shift_status,
      'firstClockInAt', v_rec.first_clock_in_at,
      'clockInAt', v_rec.clock_in_at,
      'clockOutAt', v_rec.clock_out_at,
      'hoursWorked', v_rec.hours_worked,
      'regularHours', v_rec.regular_hours,
      'overtimeHours', v_rec.overtime_hours,
      'overtimePay', v_rec.overtime_pay,
      'baseDailyPay', v_rec.base_daily_pay,
      'addonPay', v_rec.addon_pay,
      'totalDayPay', v_rec.total_day_pay,
      'needsReview', v_rec.needs_review
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_attendance_record(
  UUID, DATE, BOOLEAN, TEXT, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, NUMERIC, NUMERIC, BOOLEAN, BOOLEAN, UUID, TEXT
) TO anon, authenticated, service_role;

-- 10. Lightweight POS Terminal Clock-In Status Check
CREATE OR REPLACE FUNCTION public.get_staff_today_clock_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_business_date DATE := (now() AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;
  v_rec RECORD;
BEGIN
  SELECT id, is_present, shift_status, clock_in_at
  INTO v_rec
  FROM public.attendance_records
  WHERE user_id = p_user_id AND date = v_business_date;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'isPresentToday', false,
      'isClockedInToday', false,
      'shiftStatus', NULL,
      'clockInAt', NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'isPresentToday', v_rec.is_present,
    'isClockedInToday', (v_rec.shift_status = 'CLOCKED_IN'),
    'shiftStatus', v_rec.shift_status,
    'clockInAt', v_rec.clock_in_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_today_clock_status(UUID) TO anon, authenticated, service_role;
