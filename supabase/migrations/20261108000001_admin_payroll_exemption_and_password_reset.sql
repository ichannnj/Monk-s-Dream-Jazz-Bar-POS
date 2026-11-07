-- ==============================================================================
-- Monk's Dream Jazz Bar POS — Admin Payroll Exemption & Password Reset RPC
-- Migration: 20261108000001_admin_payroll_exemption_and_password_reset.sql
-- ==============================================================================

-- 1. Update create_staff_account_with_secrets to enforce base_daily_rate = 0.00 for admin accounts
CREATE OR REPLACE FUNCTION public.create_staff_account_with_secrets(
  p_display_name TEXT,
  p_username TEXT,
  p_pin TEXT,
  p_role TEXT,
  p_job_title TEXT DEFAULT NULL,
  p_base_daily_rate NUMERIC DEFAULT 645.00,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_clean_name TEXT;
  v_clean_user TEXT;
  v_clean_pin TEXT;
  v_clean_role TEXT;
  v_base_rate NUMERIC;
  v_new_id UUID;
  v_pin_hash TEXT := NULL;
  v_pass_hash TEXT := NULL;
BEGIN
  v_clean_name := trim(COALESCE(p_display_name, ''));
  -- Strip any leading '@' and spaces from username
  v_clean_user := lower(trim(regexp_replace(COALESCE(p_username, ''), '^@+', '')));
  v_clean_user := regexp_replace(v_clean_user, '\s+', '_', 'g');
  v_clean_pin := trim(COALESCE(p_pin, ''));
  v_clean_role := lower(trim(COALESCE(p_role, 'waiter')));

  IF v_clean_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Display name is required.');
  END IF;
  IF v_clean_user = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username is required.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(username) = v_clean_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username @' || v_clean_user || ' is already taken.');
  END IF;

  IF v_clean_pin <> '' THEN
    IF v_clean_pin !~ '^[0-9]{4}$' THEN
      RETURN jsonb_build_object('success', false, 'error', 'PIN must be exactly 4 numeric digits.');
    END IF;
    v_pin_hash := extensions.crypt(v_clean_pin, extensions.gen_salt('bf', 10));
  END IF;

  IF v_clean_role = 'admin' THEN
    IF p_password IS NULL OR length(p_password) < 8 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Admin accounts require a password of at least 8 characters.');
    END IF;
    v_pass_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
    -- Invariant: Admin accounts are salary/management roles and do NOT receive daily shift pay
    v_base_rate := 0.00;
  ELSE
    v_base_rate := COALESCE(p_base_daily_rate, 645.00);
  END IF;

  INSERT INTO public.users (
    display_name,
    username,
    pin,
    pin_hash,
    password_hash,
    password_updated_at,
    pin_updated_at,
    role,
    job_title,
    base_daily_rate,
    phone,
    email,
    is_active,
    is_workflow_staff
  ) VALUES (
    v_clean_name,
    v_clean_user,
    '****',
    v_pin_hash,
    v_pass_hash,
    CASE WHEN v_pass_hash IS NOT NULL THEN now() ELSE NULL END,
    CASE WHEN v_pin_hash IS NOT NULL THEN now() ELSE NULL END,
    v_clean_role::public.role,
    NULLIF(trim(COALESCE(p_job_title, '')), ''),
    v_base_rate,
    NULLIF(trim(COALESCE(p_phone, '')), ''),
    NULLIF(trim(COALESCE(p_email, '')), ''),
    true,
    true
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'userId', v_new_id,
    'username', v_clean_user
  );
END;
$$;

-- 2. Update update_admin_profile with robust username sanitization & admin base_daily_rate lock
CREATE OR REPLACE FUNCTION public.update_admin_profile(
  p_user_id UUID,
  p_display_name TEXT,
  p_username TEXT,
  p_job_title TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_clean_username TEXT;
  v_clean_name TEXT;
  v_existing_id UUID;
  v_updated RECORD;
BEGIN
  -- Strip any leading '@' and spaces from username
  v_clean_username := lower(trim(regexp_replace(COALESCE(p_username, ''), '^@+', '')));
  v_clean_username := regexp_replace(v_clean_username, '\s+', '_', 'g');
  v_clean_name := trim(COALESCE(p_display_name, ''));

  IF v_clean_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Display name cannot be empty.');
  END IF;

  IF v_clean_username = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username cannot be empty.');
  END IF;

  -- Check username collision
  SELECT id INTO v_existing_id
  FROM public.users
  WHERE lower(username) = v_clean_username AND id <> p_user_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Username @' || v_clean_username || ' is already taken.');
  END IF;

  UPDATE public.users
  SET display_name = v_clean_name,
      username = v_clean_username,
      job_title = trim(COALESCE(p_job_title, '')),
      email = NULLIF(trim(COALESCE(p_email, '')), ''),
      phone = NULLIF(trim(COALESCE(p_phone, '')), ''),
      base_daily_rate = 0.00,
      updated_at = now()
  WHERE id = p_user_id AND role = 'admin'
  RETURNING id, username, display_name, role, job_title, is_workflow_staff,
            email, phone, avatar_url, base_daily_rate, last_login_at,
            password_updated_at, pin_updated_at
  INTO v_updated;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin user not found or unauthorized.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_updated.id,
      'username', v_updated.username,
      'displayName', v_updated.display_name,
      'role', v_updated.role,
      'jobTitle', v_updated.job_title,
      'isWorkflowStaff', v_updated.is_workflow_staff,
      'email', v_updated.email,
      'phone', v_updated.phone,
      'avatarUrl', v_updated.avatar_url,
      'baseDailyRate', v_updated.base_daily_rate,
      'lastLoginAt', v_updated.last_login_at,
      'passwordUpdatedAt', v_updated.password_updated_at,
      'pinUpdatedAt', v_updated.pin_updated_at
    )
  );
END;
$$;

-- 3. Dedicated Admin-Level Password Reset RPC (for managing other admins from Staff Roster)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_target_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_target_role public.role;
BEGIN
  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters long.');
  END IF;

  SELECT role INTO v_target_role
  FROM public.users
  WHERE id = p_target_user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user account not found or inactive.');
  END IF;

  IF v_target_role <> 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target user is not an Administrator.');
  END IF;

  UPDATE public.users
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf', 10)),
      password_updated_at = now(),
      updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'passwordUpdatedAt', now()
  );
END;
$$;

-- Grant Execution permissions
GRANT EXECUTE ON FUNCTION public.create_staff_account_with_secrets(TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_admin_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO anon, authenticated, service_role;

-- 4. Backfill existing admin accounts: set base_daily_rate to 0.00
UPDATE public.users
SET base_daily_rate = 0.00
WHERE role = 'admin';

-- 5. Backfill past attendance records for Admin roles: set pay to 0.00 (Exempt)
UPDATE public.attendance_records
SET base_daily_pay = 0.00,
    addon_pay = 0.00,
    total_day_pay = 0.00
WHERE user_id IN (SELECT id FROM public.users WHERE role = 'admin');

