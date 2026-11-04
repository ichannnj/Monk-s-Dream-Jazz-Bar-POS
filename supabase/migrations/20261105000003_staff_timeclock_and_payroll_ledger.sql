-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Staff Timeclock & Attendance Payroll Ledger
-- Migration: 20261105000003_staff_timeclock_and_payroll_ledger.sql
-- ==============================================================================

-- 1. Extend public.attendance_records with clock-in/out timestamps, hours worked, status, and notes
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS clock_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clock_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hours_worked NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS shift_status TEXT NOT NULL DEFAULT 'CLOCKED_IN',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enforce check constraint on shift_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_attendance_shift_status'
  ) THEN
    ALTER TABLE public.attendance_records
      ADD CONSTRAINT chk_attendance_shift_status
      CHECK (shift_status IN ('CLOCKED_IN', 'COMPLETED', 'ABSENT'));
  END IF;
END $$;

-- 2. Backfill existing attendance records with sensible timestamps and shift statuses
UPDATE public.attendance_records
SET
  clock_in_at = COALESCE(clock_in_at, created_at),
  shift_status = CASE
    WHEN is_present AND clock_out_at IS NOT NULL THEN 'COMPLETED'
    WHEN is_present THEN 'CLOCKED_IN'
    ELSE 'ABSENT'
  END,
  hours_worked = CASE
    WHEN is_present AND clock_in_at IS NOT NULL AND clock_out_at IS NOT NULL THEN
      ROUND((EXTRACT(EPOCH FROM (clock_out_at - clock_in_at)) / 3600.0)::NUMERIC, 2)
    WHEN is_present THEN 8.00
    ELSE 0.00
  END;

-- 3. Assign and backfill default 4-digit PINs for Non-POS staff so they can punch at the Timeclock Kiosk
-- 'rosa_dish' -> '7777', 'marcus_sound' -> '8888', any fallback non-workflow staff -> '0000'
UPDATE public.users
SET pin_hash = extensions.crypt('7777', extensions.gen_salt('bf', 10)),
    pin = '****',
    pin_updated_at = now()
WHERE username = 'rosa_dish' AND (pin_hash IS NULL OR pin_hash = '');

UPDATE public.users
SET pin_hash = extensions.crypt('8888', extensions.gen_salt('bf', 10)),
    pin = '****',
    pin_updated_at = now()
WHERE username = 'marcus_sound' AND (pin_hash IS NULL OR pin_hash = '');

UPDATE public.users
SET pin_hash = extensions.crypt('0000', extensions.gen_salt('bf', 10)),
    pin = '****',
    pin_updated_at = now()
WHERE is_active = true AND (pin_hash IS NULL OR pin_hash = '');

-- 4. Universal Timeclock Punch RPC for ALL active staff (POS + Non-POS support personnel)
-- Allows any active staff member to Clock In and Clock Out with their Staff ID and 4-digit PIN.
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
  v_hours NUMERIC(6, 2) := 0.00;
  v_base_pay NUMERIC(10, 2);
  v_addon_pay NUMERIC(10, 2) := 0.00;
  v_total_pay NUMERIC(10, 2);
BEGIN
  v_clean_username := lower(trim(COALESCE(p_username, '')));
  v_clean_pin := trim(COALESCE(p_pin, ''));

  IF v_clean_username = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Staff ID / Username is required.');
  END IF;

  IF v_clean_pin = '' THEN
    RETURN jsonb_build_object('success', false, 'error', '4-digit PIN is required.');
  END IF;

  -- Verify Staff Record (Allows BOTH workflow and non-workflow staff)
  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff,
         base_daily_rate, pin_hash
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid Staff ID or inactive account. Access denied.');
  END IF;

  -- Block Admin / General Manager from operational punch if desired, or verify PIN
  IF v_user.pin_hash IS NOT NULL AND v_user.pin_hash <> '' THEN
    v_valid_pin := (v_user.pin_hash = extensions.crypt(v_clean_pin, v_user.pin_hash));
  END IF;

  IF NOT v_valid_pin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid 4-digit PIN. Access denied.');
  END IF;

  -- Compute current business operating date (reconciled at 6:00 AM Manila Time)
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;
  v_base_pay := COALESCE(v_user.base_daily_rate, 645.00);

  -- Fetch today's existing attendance record if any
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
    v_hours := 0.00;
    v_addon_pay := 0.00;
    v_total_pay := v_base_pay;

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
      v_hours,
      'CLOCKED_IN',
      v_base_pay,
      v_addon_pay,
      v_total_pay,
      v_now,
      v_now
    );
  ELSE
    -- Record exists for today. Determine Clock In vs Clock Out
    IF p_action = 'CLOCK_IN' OR (p_action = 'AUTO' AND v_existing_rec.shift_status = 'ABSENT') THEN
      v_action_taken := 'CLOCKED_IN';
      v_clock_in := v_now;
      v_clock_out := NULL;
      v_hours := 0.00;
      v_addon_pay := COALESCE(v_existing_rec.addon_pay, 0.00);
      v_total_pay := v_base_pay + v_addon_pay;

      UPDATE public.attendance_records
      SET is_present = true,
          shift_status = 'CLOCKED_IN',
          clock_in_at = v_clock_in,
          clock_out_at = NULL,
          base_daily_pay = v_base_pay,
          total_day_pay = v_total_pay,
          updated_at = v_now
      WHERE id = v_existing_rec.id;

    ELSIF p_action = 'CLOCK_OUT' OR (p_action = 'AUTO' AND v_existing_rec.shift_status = 'CLOCKED_IN') THEN
      v_action_taken := 'CLOCKED_OUT';
      v_clock_in := COALESCE(v_existing_rec.clock_in_at, v_existing_rec.created_at, v_now);
      v_clock_out := v_now;
      v_hours := ROUND((EXTRACT(EPOCH FROM (v_clock_out - v_clock_in)) / 3600.0)::NUMERIC, 2);
      v_addon_pay := COALESCE(v_existing_rec.addon_pay, 0.00);
      v_total_pay := v_base_pay + v_addon_pay;

      UPDATE public.attendance_records
      SET is_present = true,
          shift_status = 'COMPLETED',
          clock_in_at = v_clock_in,
          clock_out_at = v_clock_out,
          hours_worked = v_hours,
          total_day_pay = v_total_pay,
          updated_at = v_now
      WHERE id = v_existing_rec.id;

    ELSE
      -- Already completed or re-punching
      v_action_taken := 'CLOCKED_OUT';
      v_clock_in := v_existing_rec.clock_in_at;
      v_clock_out := v_existing_rec.clock_out_at;
      v_hours := v_existing_rec.hours_worked;
      v_total_pay := v_existing_rec.total_day_pay;
      v_addon_pay := v_existing_rec.addon_pay;
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
    'hoursWorked', v_hours,
    'baseDailyPay', v_base_pay,
    'addonPay', v_addon_pay,
    'totalDayPay', v_total_pay
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.punch_staff_timeclock(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- 5. Updated authenticate_staff_credentials RPC
-- Maintains POS role gating (is_workflow_staff = true) and AUTO-CLOCKS IN the user if not yet clocked in today
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

  -- Auto-Clock-In for POS user if no attendance record exists today
  v_business_date := (v_now AT TIME ZONE 'Asia/Manila' - INTERVAL '6 hours')::DATE;

  INSERT INTO public.attendance_records (
    user_id,
    date,
    is_present,
    clock_in_at,
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
    0.00,
    'CLOCKED_IN',
    COALESCE(v_user.base_daily_rate, 645.00),
    0.00,
    COALESCE(v_user.base_daily_rate, 645.00),
    v_now,
    v_now
  )
  ON CONFLICT (user_id, date) DO NOTHING;

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

-- 6. Admin Upsert / Override Attendance Record RPC
-- Enables manager to manually clock in, clock out, mark absent, adjust base rate, and add OT/bonuses with notes
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
SET search_path = public
AS $$
DECLARE
  v_total NUMERIC(10, 2);
  v_now TIMESTAMPTZ := now();
  v_rec RECORD;
BEGIN
  IF p_is_present THEN
    v_total := COALESCE(p_base_daily_pay, 645.00) + COALESCE(p_addon_pay, 0.00);
  ELSE
    v_total := 0.00;
  END IF;

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
    CASE WHEN p_is_present THEN COALESCE(p_base_daily_pay, 645.00) ELSE 0.00 END,
    CASE WHEN p_is_present THEN COALESCE(p_addon_pay, 0.00) ELSE 0.00 END,
    v_total,
    p_notes,
    CASE WHEN p_is_present THEN v_now ELSE NULL END,
    CASE WHEN p_shift_status = 'COMPLETED' THEN v_now ELSE NULL END,
    CASE WHEN p_shift_status = 'COMPLETED' THEN 8.00 ELSE 0.00 END,
    v_now,
    v_now
  )
  ON CONFLICT (user_id, date) DO UPDATE
  SET
    is_present = EXCLUDED.is_present,
    shift_status = EXCLUDED.shift_status,
    base_daily_pay = EXCLUDED.base_daily_pay,
    addon_pay = EXCLUDED.addon_pay,
    total_day_pay = EXCLUDED.total_day_pay,
    notes = COALESCE(EXCLUDED.notes, attendance_records.notes),
    clock_in_at = CASE
      WHEN EXCLUDED.is_present AND attendance_records.clock_in_at IS NULL THEN v_now
      ELSE attendance_records.clock_in_at
    END,
    clock_out_at = CASE
      WHEN EXCLUDED.shift_status = 'COMPLETED' AND attendance_records.clock_out_at IS NULL THEN v_now
      ELSE attendance_records.clock_out_at
    END,
    hours_worked = CASE
      WHEN EXCLUDED.shift_status = 'COMPLETED' AND attendance_records.clock_in_at IS NOT NULL THEN
        ROUND((EXTRACT(EPOCH FROM (COALESCE(attendance_records.clock_out_at, v_now) - attendance_records.clock_in_at)) / 3600.0)::NUMERIC, 2)
      WHEN EXCLUDED.shift_status = 'COMPLETED' THEN 8.00
      ELSE attendance_records.hours_worked
    END,
    updated_at = v_now
  RETURNING * INTO v_rec;

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

