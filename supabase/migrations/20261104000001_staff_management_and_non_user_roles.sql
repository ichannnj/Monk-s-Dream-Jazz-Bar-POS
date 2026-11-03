-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Staff Account Creation & Non-User Venue Personnel
-- Migration: 20261104000001_staff_management_and_non_user_roles.sql
-- ==============================================================================

-- 1. Make PIN nullable so non-workflow venue staff do not require POS terminal PINs
ALTER TABLE public.users ALTER COLUMN pin DROP NOT NULL;

-- 2. Add job_title column for custom staff designations (e.g., Dishwasher, Security, Sound Tech)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;

-- 3. Set Philippine NCR Daily Minimum Wage (₱645.00) as uniform baseline default for all staff
ALTER TABLE public.users ALTER COLUMN base_daily_rate SET DEFAULT 645.00;
ALTER TABLE public.attendance_records ALTER COLUMN base_daily_pay SET DEFAULT 645.00;

-- 4. Backfill job_title and set uniform PH Minimum Wage baseline (₱645.00) across all staff
UPDATE public.users SET job_title = 'General Manager' WHERE username = 'miles_manager';
UPDATE public.users SET job_title = 'Lead Cashier' WHERE username = 'coltrane_cashier';
UPDATE public.users SET job_title = 'Floor Waiter' WHERE username = 'ella_waiter';
UPDATE public.users SET job_title = 'Head Bartender' WHERE username = 'monk_bar';
UPDATE public.users SET job_title = 'Senior Barista' WHERE username = 'bill_cafe';
UPDATE public.users SET job_title = 'Head Chef' WHERE username = 'chet_kitchen';
UPDATE public.users SET job_title = 'FOH Runner' WHERE username = 'max_runner';
UPDATE public.users SET job_title = 'Dishwasher', pin = NULL WHERE username = 'rosa_dish';
UPDATE public.users SET job_title = 'Sound Tech', pin = NULL WHERE username = 'marcus_sound';
UPDATE public.users SET base_daily_rate = 645.00;

-- Synchronize attendance_records to uniform ₱645.00 base_daily_pay
UPDATE public.attendance_records
SET base_daily_pay = 645.00,
    total_day_pay = 645.00 + COALESCE(addon_pay, 0);

-- 4. Update authenticate_staff_credentials RPC to strictly enforce is_workflow_staff = true
CREATE OR REPLACE FUNCTION public.authenticate_staff_credentials(
  p_username TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_clean_username TEXT;
  v_clean_pin TEXT;
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

  SELECT id, username, display_name, role, job_title, is_active, is_workflow_staff, email, phone, avatar_url, base_daily_rate
  INTO v_user
  FROM public.users
  WHERE lower(username) = v_clean_username
    AND pin = v_clean_pin
    AND is_active = true
    AND is_workflow_staff = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid Staff ID or PIN. Access denied.'
    );
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
      'baseDailyRate', v_user.base_daily_rate
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_staff_credentials(TEXT, TEXT) TO anon, authenticated, service_role;

